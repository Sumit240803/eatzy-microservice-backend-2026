import type { FastifyInstance } from "fastify";
import proxy from "@fastify/http-proxy"
export default async function proxyPlug(app : FastifyInstance, url : string){
    app.register(proxy , {
        upstream : url,
        prefix : '/'
    })
}