import fp from "fastify-plugin";
import cors from "@fastify/cors";

/**
 * Enables CORS for all origins.
 *
 * Wrapped with fastify-plugin so the hooks apply across the whole gateway
 * (including the proxied routes) rather than being encapsulated.
 */
export default fp(async (app) => {
    await app.register(cors, {
        origin: "*"
    });
});
