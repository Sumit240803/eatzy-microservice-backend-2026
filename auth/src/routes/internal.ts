import { FastifyPluginAsync } from "fastify";
import { get_user_internal } from "../controllers/internal.controller";

const internal_routes : FastifyPluginAsync = async(fastify, opts)=>{
    fastify.get("/internal/users/:id", get_user_internal);
}

export default internal_routes;
