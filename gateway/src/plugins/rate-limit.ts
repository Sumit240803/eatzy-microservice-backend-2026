import fp from "fastify-plugin";
import ratelimit from "@fastify/rate-limit";

/**
 * Global rate limiting: 100 requests per minute per client.
 */
export default fp(async (app) => {
    await app.register(ratelimit, {
        max: 100,
        timeWindow: "1 minute"
    });
});
