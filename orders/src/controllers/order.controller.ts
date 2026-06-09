// Order management routes

import { FastifyReply, FastifyRequest } from "fastify";
import { get_user_id, get_user_role } from "../utils/authorization";
import { fetch_menu, verify_restaurant_owner, UpstreamError } from "../utils/restaurants";

type OrderStatus = "PLACED" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
type PlateType = "HALF" | "FULL";

interface OrderItemInput {
    menu_item_id : string;
    plate_type : PlateType;
    quantity : number;
}

interface PlaceOrderBody {
    restaurant_id : string;
    delivery_address : string;
    items : OrderItemInput[];
}

interface PaginationQuery {
    page? : string;
    limit? : string;
}

/** Allowed status transitions for an order's lifecycle. */
const VALID_TRANSITIONS : Record<OrderStatus, OrderStatus[]> = {
    PLACED : ["ACCEPTED", "CANCELLED"],
    ACCEPTED : ["PREPARING", "CANCELLED"],
    PREPARING : ["OUT_FOR_DELIVERY", "CANCELLED"],
    OUT_FOR_DELIVERY : ["DELIVERED"],
    DELIVERED : [],
    CANCELLED : []
};

function paginate(query : PaginationQuery){
    const page = parseInt(query.page ?? "", 10) || 1;
    const limit = parseInt(query.limit ?? "", 10) || 10;
    return { skip : (page - 1) * limit, take : limit };
}

/**
 * Place a new order (Customer).
 *
 * Prices are taken from the authoritative menu in the restaurants service, never
 * from the client, and snapshotted onto the order items.
 */
export async function place_order(request : FastifyRequest<{Body : PlaceOrderBody}>, reply : FastifyReply){
    const customer_id = get_user_id(request);
    if(!customer_id){
        return reply.unauthorized("Missing x-user-id header");
    }

    const { restaurant_id, delivery_address, items } = request.body;

    let menu;
    try {
        menu = await fetch_menu(restaurant_id);
    } catch (err) {
        if(err instanceof UpstreamError){
            return reply.code(err.statusCode).send({ message: err.message });
        }
        throw err;
    }

    if(menu.length === 0){
        return reply.notFound("Restaurant not found or has no menu");
    }
    const menu_by_id = new Map(menu.map((m) => [m.id, m]));

    const order_items = [];
    let total_amount = 0;
    for(const item of items){
        const menu_item = menu_by_id.get(item.menu_item_id);
        if(menu_item === undefined){
            return reply.badRequest(`Menu item ${item.menu_item_id} does not belong to this restaurant`);
        }
        const unit_price = item.plate_type === "HALF" ? menu_item.half_plate_price : menu_item.full_plate_price;
        const subtotal = unit_price * item.quantity;
        total_amount += subtotal;
        order_items.push({
            menu_item_id : menu_item.id,
            item_name : menu_item.item_name,
            plate_type : item.plate_type,
            unit_price : unit_price,
            quantity : item.quantity,
            subtotal : subtotal
        });
    }

    const order = await request.server.prisma.order.create({
        data : {
            customer_id,
            restaurant_id,
            delivery_address,
            total_amount,
            items : { create : order_items }
        },
        include : { items : true }
    });

    return reply.code(201).send({ data : order });
}

/**
 * List the authenticated customer's orders.
 */
export async function get_my_orders(request : FastifyRequest<{Querystring : PaginationQuery}>, reply : FastifyReply){
    const customer_id = get_user_id(request);
    if(!customer_id){
        return reply.unauthorized("Missing x-user-id header");
    }

    const orders = await request.server.prisma.order.findMany({
        where : { customer_id },
        include : { items : true },
        orderBy : { created_at : "desc" },
        ...paginate(request.query)
    });
    return { data : orders };
}

/**
 * Get a single order. Visible to the customer who placed it, an ADMIN, or the
 * owner of the restaurant the order belongs to.
 */
export async function get_order_by_id(request : FastifyRequest<{Params : {id : string}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);

    const order = await request.server.prisma.order.findUnique({
        where : { id : request.params.id },
        include : { items : true }
    });
    if(order === null){
        return reply.notFound("Order not found");
    }

    if(order.customer_id !== user_id && role !== "ADMIN"){
        try {
            const owns = role === "OWNER" && await verify_restaurant_owner(order.restaurant_id, user_id);
            if(!owns){
                return reply.forbidden("You are not allowed to view this order");
            }
        } catch (err) {
            if(err instanceof UpstreamError){
                return reply.code(err.statusCode).send({ message: err.message });
            }
            throw err;
        }
    }

    return { data : order };
}

/**
 * List the orders placed against a restaurant (restaurant OWNER or ADMIN).
 */
export async function get_restaurant_orders(request : FastifyRequest<{Params : {restaurantId : string}, Querystring : PaginationQuery}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);
    const { restaurantId } = request.params;

    if(role !== "ADMIN"){
        try {
            if(!(await verify_restaurant_owner(restaurantId, user_id))){
                return reply.forbidden("You are not the owner of this restaurant");
            }
        } catch (err) {
            if(err instanceof UpstreamError){
                return reply.code(err.statusCode).send({ message: err.message });
            }
            throw err;
        }
    }

    const orders = await request.server.prisma.order.findMany({
        where : { restaurant_id : restaurantId },
        include : { items : true },
        orderBy : { created_at : "desc" },
        ...paginate(request.query)
    });
    return { data : orders };
}

/**
 * Decides whether the caller may move an order to `target`.
 * - CANCELLED: the customer who placed it, the restaurant owner, or an ADMIN.
 * - ACCEPTED / PREPARING: the restaurant owner or an ADMIN.
 * - OUT_FOR_DELIVERY / DELIVERED: a DELIVERY agent or an ADMIN.
 */
async function authorize_status_change(request : FastifyRequest, order : {customer_id : string, restaurant_id : string}, target : OrderStatus) : Promise<boolean> {
    const user_id = get_user_id(request)!;
    const role = get_user_role(request);

    if(role === "ADMIN"){
        return true;
    }
    if(target === "CANCELLED"){
        if(order.customer_id === user_id){
            return true;
        }
        return role === "OWNER" && await verify_restaurant_owner(order.restaurant_id, user_id);
    }
    if(target === "ACCEPTED" || target === "PREPARING"){
        return role === "OWNER" && await verify_restaurant_owner(order.restaurant_id, user_id);
    }
    // OUT_FOR_DELIVERY or DELIVERED
    return role === "DELIVERY";
}

/**
 * Advance an order through its lifecycle.
 */
export async function update_order_status(request : FastifyRequest<{Params : {id : string}, Body : {status : OrderStatus}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const target = request.body.status;

    const order = await request.server.prisma.order.findUnique({ where : { id : request.params.id } });
    if(order === null){
        return reply.notFound("Order not found");
    }

    const current = order.status as OrderStatus;
    if(!VALID_TRANSITIONS[current].includes(target)){
        return reply.badRequest(`Cannot change order status from ${current} to ${target}`);
    }

    try {
        if(!(await authorize_status_change(request, order, target))){
            return reply.forbidden("You are not allowed to set this order status");
        }
    } catch (err) {
        if(err instanceof UpstreamError){
            return reply.code(err.statusCode).send({ message: err.message });
        }
        throw err;
    }

    const updated = await request.server.prisma.order.update({
        where : { id : order.id },
        data : { status : target },
        include : { items : true }
    });
    return { data : updated };
}
