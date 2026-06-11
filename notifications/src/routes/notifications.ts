import { FastifyPluginAsync } from "fastify";
import { get_my_notifications, get_notification_by_id } from "../controllers/notification.controller";

const notifications_routes : FastifyPluginAsync = async(fastify, opts)=>{
    fastify.get("/notifications", get_my_notifications);
    fastify.get("/notifications/:id", get_notification_by_id);
}

export default notifications_routes;
