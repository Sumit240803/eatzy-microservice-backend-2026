import { FastifyPluginAsync } from "fastify";
import { PrismaClient } from "../generated/prisma/client";
import fp from 'fastify-plugin'
import { PrismaPg } from "@prisma/adapter-pg";
import config from "../config/env";
declare module 'fastify' {
    interface FastifyInstance {prisma : PrismaClient}
}

const prismaPlugin : FastifyPluginAsync = fp(async(server , _options)=>{
    const prisma = new PrismaClient({
        adapter : new PrismaPg({
            connectionString : config.development.db.connection_string
        })
    })
    await prisma.$connect()
    server.decorate('prisma',prisma);
    server.addHook('onClose', async(server)=>{
        await server.prisma.$disconnect()
    })
})

export default prismaPlugin;
