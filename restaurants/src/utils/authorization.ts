import { FastifyRequest } from "fastify";

/**
 * Reads the authenticated user id forwarded by the gateway.
 * Returns undefined when the header is missing.
 */
export function get_user_id(request : FastifyRequest) : string | undefined {
    const user_id = request.headers["x-user-id"];
    if(Array.isArray(user_id)){
        return user_id[0];
    }
    return user_id;
}

/**
 * Verifies that the caller (identified by the `x-user-id` header) is the
 * registered owner of the given restaurant.
 *
 * Owner.id is the user id, mirroring how `get_my_restraunt` resolves ownership.
 */
export async function verify_owner(request : FastifyRequest, restaurant_id : string) : Promise<boolean> {
    const user_id = get_user_id(request);
    if(!user_id){
        return false;
    }
    const owner = await request.server.prisma.owner.findUnique({
        where : {restaurant_id : restaurant_id}
    });
    return owner !== null && owner.id === user_id;
}
