import type { FastifyInstance } from "fastify";

import cors from "@fastify/cors";
export default async function corsPlugin(app : FastifyInstance){
    app.register(cors, {
        origin : '*'
    })
}