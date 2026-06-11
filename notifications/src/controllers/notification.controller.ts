// Notification history routes

import { FastifyReply, FastifyRequest } from "fastify";

interface PaginationQuery {
    page? : string;
    limit? : string;
}

function get_user_id(request : FastifyRequest) : string | undefined {
    const value = request.headers["x-user-id"];
    return Array.isArray(value) ? value[0] : value;
}

function get_user_role(request : FastifyRequest) : string | undefined {
    const value = request.headers["x-user-role"];
    return Array.isArray(value) ? value[0] : value;
}

function paginate(query : PaginationQuery){
    const page = parseInt(query.page ?? "", 10) || 1;
    const limit = parseInt(query.limit ?? "", 10) || 20;
    return { skip : (page - 1) * limit, take : limit };
}

/**
 * List the authenticated user's notifications.
 */
export async function get_my_notifications(request : FastifyRequest<{Querystring : PaginationQuery}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const notifications = await request.server.prisma.notification.findMany({
        where : { user_id },
        orderBy : { created_at : "desc" },
        ...paginate(request.query)
    });
    return { data : notifications };
}

/**
 * Get a single notification (the recipient or an ADMIN).
 */
export async function get_notification_by_id(request : FastifyRequest<{Params : {id : string}}>, reply : FastifyReply){
    const user_id = get_user_id(request);
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const role = get_user_role(request);

    const notification = await request.server.prisma.notification.findUnique({ where : { id : request.params.id } });
    if(notification === null){
        return reply.notFound("Notification not found");
    }
    if(notification.user_id !== user_id && role !== "ADMIN"){
        return reply.forbidden("You are not allowed to view this notification");
    }
    return { data : notification };
}
