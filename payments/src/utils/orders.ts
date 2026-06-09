import config from "../config/env";

const ORDERS_URL = config.services.orders_url;

export interface Order {
    id : string;
    customer_id : string;
    restaurant_id : string;
    status : string;
    total_amount : number;
}

/**
 * Error raised when the orders service is unreachable or rejects the request.
 * Carries an HTTP status code for the controller to relay.
 */
export class UpstreamError extends Error {
    statusCode : number;
    constructor(message : string, statusCode = 502){
        super(message);
        this.name = "UpstreamError";
        this.statusCode = statusCode;
    }
}

/**
 * Fetches an order from the orders service, forwarding the caller's identity so
 * the orders service can apply its own ownership checks.
 */
export async function fetch_order(order_id : string, user_id : string, role : string | undefined) : Promise<Order> {
    const headers : Record<string, string> = { "x-user-id" : user_id };
    if(role){
        headers["x-user-role"] = role;
    }

    let response : Response;
    try {
        response = await fetch(`${ORDERS_URL}/orders/${order_id}`, { headers });
    } catch {
        throw new UpstreamError("Orders service is unavailable", 503);
    }

    if(response.status === 404){
        throw new UpstreamError("Order not found", 404);
    }
    if(response.status === 403){
        throw new UpstreamError("You are not allowed to pay for this order", 403);
    }
    if(!response.ok){
        throw new UpstreamError(`Orders service responded with ${response.status}`, 502);
    }

    const body = await response.json() as {data : Order};
    return body.data;
}
