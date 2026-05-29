import jwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";

export default async function jwtPlugin(app : FastifyInstance) {
    app.register(jwt , {
        secret : process.env.JWT_SECRET!
    });
}