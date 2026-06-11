import config from "../config/env";

const ORDERS_URL = config.services.orders_url;

export interface Order {
    id : string;
    customer_id : string;
    restaurant_id : string;
    status : string;
    delivery_address : string;
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

function identity_headers(user_id : string, role : string | undefined) : Record<string, string> {
    const headers : Record<string, string> = { "x-user-id" : user_id };
    if(role){
        headers["x-user-role"] = role;
    }
    return headers;
}

/**
 * Fetches an order from the orders service, forwarding the caller's identity so
 * the orders service applies its own ownership checks.
 */
export async function fetch_order(order_id : string, user_id : string, role : string | undefined) : Promise<Order> {
    let response : Response;
    try {
        response = await fetch(`${ORDERS_URL}/orders/${order_id}`, { headers : identity_headers(user_id, role) });
    } catch {
        throw new UpstreamError("Orders service is unavailable", 503);
    }

    if(response.status === 404){
        throw new UpstreamError("Order not found", 404);
    }
    if(response.status === 403){
        throw new UpstreamError("You are not allowed to access this order", 403);
    }
    if(!response.ok){
        throw new UpstreamError(`Orders service responded with ${response.status}`, 502);
    }

    const body = await response.json() as {data : Order};
    return body.data;
}

/**
 * Advances an order's status in the orders service, forwarding the caller's
 * identity (a DELIVERY agent or ADMIN) so the transition is authorized there.
 */
export async function update_order_status(order_id : string, status : string, user_id : string, role : string | undefined) : Promise<void> {
    let response : Response;
    try {
        response = await fetch(`${ORDERS_URL}/orders/${order_id}/status`, {
            method : "PATCH",
            headers : { ...identity_headers(user_id, role), "content-type" : "application/json" },
            body : JSON.stringify({ status })
        });
    } catch {
        throw new UpstreamError("Orders service is unavailable", 503);
    }

    if(!response.ok){
        const body = await response.json().catch(() => ({})) as {message? : string};
        throw new UpstreamError(body.message ?? `Failed to update order status (${response.status})`, 502);
    }
}
