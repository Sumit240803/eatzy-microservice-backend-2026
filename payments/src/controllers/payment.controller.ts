// Payment routes (Stripe)

import { FastifyReply, FastifyRequest } from "fastify";
import { get_user_id, get_user_role } from "../utils/authorization";
import { fetch_order, UpstreamError } from "../utils/orders";
import {
    create_payment_intent,
    create_refund,
    construct_webhook_event,
    provider_mode
} from "../utils/payment-provider";
import config from "../config/env";

interface CreatePaymentBody {
    order_id : string;
    currency? : string;
}

interface PaginationQuery {
    page? : string;
    limit? : string;
}

function paginate(query : PaginationQuery){
    const page = parseInt(query.page ?? "", 10) || 1;
    const limit = parseInt(query.limit ?? "", 10) || 10;
    return { skip : (page - 1) * limit, take : limit };
}

/**
 * Create a payment for an order (Customer).
 *
 * The amount is taken from the authoritative order in the orders service, never
 * from the client. Returns the client_secret the frontend uses to confirm.
 */
export async function create_payment(request : FastifyRequest<{Body : CreatePaymentBody}>, reply : FastifyReply){
    const customer_id = get_user_id(request);
    if(!customer_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);
    const { order_id } = request.body;
    const currency = request.body.currency ?? config.default_currency;

    let order;
    try {
        order = await fetch_order(order_id, customer_id, role);
    } catch (err) {
        if(err instanceof UpstreamError){
            return reply.code(err.statusCode).send({ message : err.message });
        }
        throw err;
    }

    if(order.status === "CANCELLED"){
        return reply.badRequest("Cannot pay for a cancelled order");
    }

    const already_paid = await request.server.prisma.payment.findFirst({
        where : { order_id, status : "SUCCEEDED" }
    });
    if(already_paid !== null){
        return reply.conflict("This order has already been paid");
    }

    // Record the payment first so its id can be attached to the intent metadata.
    let payment = await request.server.prisma.payment.create({
        data : {
            order_id,
            customer_id,
            amount : order.total_amount,
            currency,
            status : "PENDING",
            provider : provider_mode
        }
    });

    let intent;
    try {
        intent = await create_payment_intent({
            amount : order.total_amount,
            currency,
            metadata : { payment_id : payment.id, order_id }
        });
    } catch (err) {
        await request.server.prisma.payment.update({
            where : { id : payment.id },
            data : { status : "FAILED" }
        });
        request.log.error(err);
        return reply.code(502).send({ message : "Failed to initialize payment with provider" });
    }

    payment = await request.server.prisma.payment.update({
        where : { id : payment.id },
        data : { provider_payment_id : intent.id }
    });

    return reply.code(201).send({
        data : { payment, client_secret : intent.client_secret, provider : provider_mode }
    });
}

/**
 * List the authenticated customer's payments.
 */
export async function get_my_payments(request : FastifyRequest<{Querystring : PaginationQuery}>, reply : FastifyReply){
    const customer_id = get_user_id(request);
    if(!customer_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const payments = await request.server.prisma.payment.findMany({
        where : { customer_id },
        orderBy : { created_at : "desc" },
        ...paginate(request.query)
    });
    return { data : payments };
}

/**
 * Get a single payment (the customer who made it, or an ADMIN).
 */
export async function get_payment_by_id(request : FastifyRequest<{Params : {id : string}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);

    const payment = await request.server.prisma.payment.findUnique({ where : { id : request.params.id } });
    if(payment === null){
        return reply.notFound("Payment not found");
    }
    if(payment.customer_id !== user_id && role !== "ADMIN"){
        return reply.forbidden("You are not allowed to view this payment");
    }
    return { data : payment };
}

/**
 * Get the payments for a given order (the customer who placed it, or an ADMIN).
 */
export async function get_payments_for_order(request : FastifyRequest<{Params : {orderId : string}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);

    const payments = await request.server.prisma.payment.findMany({
        where : { order_id : request.params.orderId },
        orderBy : { created_at : "desc" }
    });
    const visible = role === "ADMIN" ? payments : payments.filter((p) => p.customer_id === user_id);
    return { data : visible };
}

/**
 * Refund a succeeded payment (the customer who paid, or an ADMIN). Supports a
 * partial refund via an optional `amount`.
 */
export async function refund_payment(request : FastifyRequest<{Params : {id : string}, Body : {amount? : number}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);

    const payment = await request.server.prisma.payment.findUnique({ where : { id : request.params.id } });
    if(payment === null){
        return reply.notFound("Payment not found");
    }
    if(payment.customer_id !== user_id && role !== "ADMIN"){
        return reply.forbidden("You are not allowed to refund this payment");
    }
    if(payment.status !== "SUCCEEDED"){
        return reply.badRequest("Only succeeded payments can be refunded");
    }

    const remaining = payment.amount - payment.refunded_amount;
    const amount = request.body.amount ?? remaining;
    if(amount <= 0 || amount > remaining){
        return reply.badRequest(`Refund amount must be between 1 and ${remaining}`);
    }
    if(payment.provider_payment_id === null){
        return reply.badRequest("Payment has no provider reference to refund");
    }

    try {
        await create_refund(payment.provider_payment_id, amount);
    } catch (err) {
        request.log.error(err);
        return reply.code(502).send({ message : "Failed to process refund with provider" });
    }

    const refunded_total = payment.refunded_amount + amount;
    const updated = await request.server.prisma.payment.update({
        where : { id : payment.id },
        data : {
            refunded_amount : refunded_total,
            status : refunded_total >= payment.amount ? "REFUNDED" : "SUCCEEDED"
        }
    });
    return { data : updated };
}

/**
 * Stripe webhook receiver (Public, signature-verified).
 *
 * `request.body` is the raw Buffer (see routes/webhook.ts) required for
 * signature verification.
 */
export async function handle_webhook(request : FastifyRequest, reply : FastifyReply){
    const signature = request.headers["stripe-signature"];
    const sig = Array.isArray(signature) ? signature[0] : signature;

    let event;
    try {
        event = construct_webhook_event(request.body as Buffer, sig);
    } catch (err) {
        request.log.error(err);
        return reply.code(400).send({ message : "Webhook signature verification failed" });
    }

    const object = event.object;
    const payment_id : string | undefined = object?.metadata?.payment_id;
    const intent_id : string | undefined = object?.id ?? object?.payment_intent;

    const payment = payment_id
        ? await request.server.prisma.payment.findUnique({ where : { id : payment_id } })
        : intent_id
            ? await request.server.prisma.payment.findFirst({ where : { provider_payment_id : intent_id } })
            : null;

    if(payment === null){
        // Unknown / unrelated event - acknowledge so Stripe stops retrying.
        return { received : true };
    }

    switch(event.type){
        case "payment_intent.succeeded":
            await request.server.prisma.payment.update({ where : { id : payment.id }, data : { status : "SUCCEEDED" } });
            break;
        case "payment_intent.payment_failed":
            await request.server.prisma.payment.update({ where : { id : payment.id }, data : { status : "FAILED" } });
            break;
        case "payment_intent.canceled":
            await request.server.prisma.payment.update({ where : { id : payment.id }, data : { status : "CANCELLED" } });
            break;
        case "charge.refunded":
            await request.server.prisma.payment.update({
                where : { id : payment.id },
                data : { status : "REFUNDED", refunded_amount : payment.amount }
            });
            break;
        default:
            break;
    }

    return { received : true };
}
