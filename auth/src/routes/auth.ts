import { FastifyPluginAsync } from "fastify";
import { login, me, register } from "../controllers/auth.controller";
import { login_schema, register_schema } from "../schemas/auth.schema";

const auth_routes : FastifyPluginAsync = async(fastify, opts)=>{
    fastify.post("/auth/register", {schema : register_schema}, register);
    fastify.post("/auth/login", {schema : login_schema}, login);
    fastify.get("/auth/me", me);
}

export default auth_routes;
