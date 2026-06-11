// Internal (service-to-service) routes. These are NOT proxied by the gateway,
// so they are only reachable directly within the cluster.

import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Look up a user by id for other services (e.g. notifications resolving an
 * email). Returns the public profile only - never the password hash.
 */
export async function get_user_internal(request : FastifyRequest<{Params : {id : string}}>, reply : FastifyReply){
    const user = await request.server.prisma.user.findUnique({ where : { id : request.params.id } });
    if(user === null){
        return reply.notFound("User not found");
    }
    return {
        data : {
            id : user.id,
            name : user.name,
            email : user.email,
            role : user.role
        }
    };
}
