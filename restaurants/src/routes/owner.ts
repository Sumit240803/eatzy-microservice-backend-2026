import { FastifyPluginAsync } from "fastify";
import { create_owner, delete_owner, get_owner, update_owner } from "../controllers/owner.controller";
import { create_owner_schema, update_owner_schema } from "../schemas/owner.schema";

const owner_routes : FastifyPluginAsync = async(fastify, opts)=>{
    fastify.get("/restaurant/:id/owner", get_owner);
    fastify.post("/restaurant/:id/owner", {schema : create_owner_schema}, create_owner);
    fastify.put("/restaurant/:id/owner", {schema : update_owner_schema}, update_owner);
    fastify.delete("/restaurant/:id/owner", delete_owner);
}

export default owner_routes;
