import fp from "fastify-plugin";
import jwt from "@fastify/jwt";

/**
 * Registers @fastify/jwt so the gateway can verify tokens issued by the auth
 * service. The secret MUST match the auth service's JWT_SECRET.
 *
 * Wrapped with fastify-plugin so `request.jwtVerify` is available to the proxy
 * pre-handlers registered in sibling scopes.
 */
export default fp(async (app) => {
    await app.register(jwt, {
        secret: process.env.JWT_SECRET ?? "super-secret-change-me-in-production"
    });
});
