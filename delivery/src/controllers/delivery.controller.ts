// Delivery management routes

import { FastifyReply, FastifyRequest } from "fastify";
import { get_user_id, get_user_role } from "../utils/authorization";
import { fetch_order, update_order_status, UpstreamError } from "../utils/orders";

type DeliveryStatus = "PENDING" | "ASSIGNED" | "PICKED_UP" | "DELIVERED" | "CANCELLED";

interface PaginationQuery {
    page? : string;
    limit? : string;
}

/** Allowed transitions handled by the /status endpoint (ASSIGNED is set via /assign). */
const VALID_TRANSITIONS : Record<DeliveryStatus, DeliveryStatus[]> = {
    PENDING : ["CANCELLED"],
    ASSIGNED : ["PICKED_UP", "CANCELLED"],
    PICKED_UP : ["DELIVERED", "CANCELLED"],
    DELIVERED : [],
    CANCELLED : []
};

/** Delivery status -> the order status it should drive in the orders service. */
const ORDER_SYNC : Partial<Record<DeliveryStatus, string>> = {
    PICKED_UP : "OUT_FOR_DELIVERY",
    DELIVERED : "DELIVERED"
};

function paginate(query : PaginationQuery){
    const page = parseInt(query.page ?? "", 10) || 1;
    const limit = parseInt(query.limit ?? "", 10) || 10;
    return { skip : (page - 1) * limit, take : limit };
}

/**
 * Create a delivery for an order (restaurant OWNER or ADMIN).
 *
 * The order is fetched from the orders service forwarding the caller's identity,
 * which both supplies the delivery details and verifies the caller may act on it.
 */
export async function create_delivery(request : FastifyRequest<{Body : {order_id : string}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);
    if(role !== "OWNER" && role !== "ADMIN"){
        return reply.forbidden("Only a restaurant owner or admin can create a delivery");
    }

    let order;
    try {
        order = await fetch_order(request.body.order_id, user_id, role);
    } catch (err) {
        if(err instanceof UpstreamError){
            return reply.code(err.statusCode).send({ message : err.message });
        }
        throw err;
    }

    if(order.status !== "ACCEPTED" && order.status !== "PREPARING"){
        return reply.badRequest(`Order must be ACCEPTED or PREPARING to arrange delivery (is ${order.status})`);
    }

    const existing = await request.server.prisma.delivery.findUnique({ where : { order_id : order.id } });
    if(existing !== null){
        return reply.conflict("A delivery already exists for this order");
    }

    const delivery = await request.server.prisma.delivery.create({
        data : {
            order_id : order.id,
            restaurant_id : order.restaurant_id,
            customer_id : order.customer_id,
            delivery_address : order.delivery_address
        }
    });
    return reply.code(201).send({ data : delivery });
}

/**
 * List unassigned deliveries available to pick up (DELIVERY agent or ADMIN).
 */
export async function get_available_deliveries(request : FastifyRequest<{Querystring : PaginationQuery}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);
    if(role !== "DELIVERY" && role !== "ADMIN"){
        return reply.forbidden("Only delivery agents can view available deliveries");
    }

    const deliveries = await request.server.prisma.delivery.findMany({
        where : { status : "PENDING" },
        orderBy : { created_at : "asc" },
        ...paginate(request.query)
    });
    return { data : deliveries };
}

/**
 * Assign a delivery. A DELIVERY agent self-claims a PENDING delivery; an ADMIN
 * may assign it to a specific driver via `driver_id`.
 */
export async function assign_delivery(request : FastifyRequest<{Params : {id : string}, Body : {driver_id? : string}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);

    let driver_id : string;
    if(role === "ADMIN" && request.body.driver_id){
        driver_id = request.body.driver_id;
    } else if(role === "DELIVERY"){
        driver_id = user_id;
    } else {
        return reply.forbidden("Only a delivery agent (or an admin assigning one) can take a delivery");
    }

    const delivery = await request.server.prisma.delivery.findUnique({ where : { id : request.params.id } });
    if(delivery === null){
        return reply.notFound("Delivery not found");
    }
    if(delivery.status !== "PENDING"){
        return reply.conflict(`Delivery is already ${delivery.status}`);
    }

    const updated = await request.server.prisma.delivery.update({
        where : { id : delivery.id },
        data : { driver_id, status : "ASSIGNED", assigned_at : new Date() }
    });
    return { data : updated };
}

/**
 * Update a delivery's status (the assigned driver or an ADMIN). PICKED_UP and
 * DELIVERED are synced to the order in the orders service first; if that fails
 * the delivery is left unchanged so the two stay consistent.
 */
export async function update_delivery_status(request : FastifyRequest<{Params : {id : string}, Body : {status : DeliveryStatus}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);
    const target = request.body.status;

    const delivery = await request.server.prisma.delivery.findUnique({ where : { id : request.params.id } });
    if(delivery === null){
        return reply.notFound("Delivery not found");
    }
    if(role !== "ADMIN" && delivery.driver_id !== user_id){
        return reply.forbidden("Only the assigned driver can update this delivery");
    }

    const current = delivery.status as DeliveryStatus;
    if(!VALID_TRANSITIONS[current].includes(target)){
        return reply.badRequest(`Cannot change delivery status from ${current} to ${target}`);
    }

    // Sync the order status first; abort on failure to keep the two in step.
    const order_status = ORDER_SYNC[target];
    if(order_status){
        try {
            await update_order_status(delivery.order_id, order_status, user_id, role);
        } catch (err) {
            if(err instanceof UpstreamError){
                return reply.code(err.statusCode).send({ message : err.message });
            }
            throw err;
        }
    }

    const timestamps : Record<string, Date> = {};
    if(target === "PICKED_UP"){
        timestamps.picked_up_at = new Date();
    }
    if(target === "DELIVERED"){
        timestamps.delivered_at = new Date();
    }

    const updated = await request.server.prisma.delivery.update({
        where : { id : delivery.id },
        data : { status : target, ...timestamps }
    });
    return { data : updated };
}

/**
 * Update the driver's current location (the assigned driver or an ADMIN).
 */
export async function update_delivery_location(request : FastifyRequest<{Params : {id : string}, Body : {lat : number, lng : number}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);

    const delivery = await request.server.prisma.delivery.findUnique({ where : { id : request.params.id } });
    if(delivery === null){
        return reply.notFound("Delivery not found");
    }
    if(role !== "ADMIN" && delivery.driver_id !== user_id){
        return reply.forbidden("Only the assigned driver can update the location");
    }

    const updated = await request.server.prisma.delivery.update({
        where : { id : delivery.id },
        data : { current_lat : request.body.lat, current_lng : request.body.lng }
    });
    return { data : updated };
}

/**
 * True when the caller may view the given delivery: the customer, the assigned
 * driver, or an ADMIN.
 */
function can_view(delivery : {customer_id : string, driver_id : string | null}, user_id : string, role : string | undefined){
    return role === "ADMIN" || delivery.customer_id === user_id || delivery.driver_id === user_id;
}

/**
 * Get a single delivery (customer, assigned driver, or ADMIN).
 */
export async function get_delivery_by_id(request : FastifyRequest<{Params : {id : string}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);

    const delivery = await request.server.prisma.delivery.findUnique({ where : { id : request.params.id } });
    if(delivery === null){
        return reply.notFound("Delivery not found");
    }
    if(!can_view(delivery, user_id, role)){
        return reply.forbidden("You are not allowed to view this delivery");
    }
    return { data : delivery };
}

/**
 * Get the delivery for a given order (customer, assigned driver, or ADMIN).
 */
export async function get_delivery_for_order(request : FastifyRequest<{Params : {orderId : string}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);

    const delivery = await request.server.prisma.delivery.findUnique({ where : { order_id : request.params.orderId } });
    if(delivery === null){
        return reply.notFound("Delivery not found");
    }
    if(!can_view(delivery, user_id, role)){
        return reply.forbidden("You are not allowed to view this delivery");
    }
    return { data : delivery };
}

/**
 * List the caller's deliveries: assigned ones for a DELIVERY agent, otherwise
 * the deliveries for orders the caller placed.
 */
export async function get_my_deliveries(request : FastifyRequest<{Querystring : PaginationQuery}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);
    const where = role === "DELIVERY" ? { driver_id : user_id } : { customer_id : user_id };

    const deliveries = await request.server.prisma.delivery.findMany({
        where,
        orderBy : { created_at : "desc" },
        ...paginate(request.query)
    });
    return { data : deliveries };
}
