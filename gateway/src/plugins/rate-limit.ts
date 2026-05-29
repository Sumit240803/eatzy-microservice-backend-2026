import type { FastifyInstance } from "fastify";
import ratelimit from "@fastify/rate-limit";
export default async function ratelimitPlugin(app : FastifyInstance){
    app.register(ratelimit, {
        max : 100,
        timeWindow : '1 minute'
    })
}