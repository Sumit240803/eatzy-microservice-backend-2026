import config from "../config/env";

const RESTAURANTS_URL = config.services.restaurants_url;

export interface MenuItem {
    id : string;
    item_name : string;
    half_plate_price : number;
    full_plate_price : number;
    restaurant_id : string;
}

/**
 * Error raised when the restaurants service is unreachable or returns an
 * unexpected response. Carries an HTTP status code for the controller to relay.
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
 * Fetches the menu of a restaurant from the restaurants service.
 * Returns an empty array when the restaurant has no menu items.
 */
export async function fetch_menu(restaurant_id : string) : Promise<MenuItem[]> {
    let response : Response;
    try {
        response = await fetch(`${RESTAURANTS_URL}/restaurant/${restaurant_id}/menu`);
    } catch {
        throw new UpstreamError("Restaurants service is unavailable", 503);
    }

    if(!response.ok){
        throw new UpstreamError(`Restaurants service responded with ${response.status}`);
    }

    const body = await response.json() as {data : MenuItem[]};
    return Array.isArray(body.data) ? body.data : [];
}

/**
 * Verifies (via the restaurants service) that `user_id` owns `restaurant_id`.
 */
export async function verify_restaurant_owner(restaurant_id : string, user_id : string) : Promise<boolean> {
    let response : Response;
    try {
        response = await fetch(`${RESTAURANTS_URL}/restaurant/${restaurant_id}/owner`);
    } catch {
        throw new UpstreamError("Restaurants service is unavailable", 503);
    }

    if(response.status === 404){
        return false;
    }
    if(!response.ok){
        throw new UpstreamError(`Restaurants service responded with ${response.status}`);
    }

    const body = await response.json() as {data : {id : string} | null};
    return body.data !== null && body.data.id === user_id;
}
