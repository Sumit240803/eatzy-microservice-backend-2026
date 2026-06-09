import fp from "fastify-plugin";
import proxy from "@fastify/http-proxy";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * Shape of the JWT payload issued by the auth service.
 */
interface TokenPayload {
    id: string;
    email?: string;
    role?: string;
}

interface ServiceRoute {
    prefix: string;
    upstream: string;
    /** Returns true when the given request is allowed through without a token. */
    isPublic: (request: FastifyRequest) => boolean;
}

const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:3001";
const RESTAURANTS_URL = process.env.RESTAURANTS_URL ?? "http://localhost:3002";
const ORDERS_URL = process.env.ORDERS_URL ?? "http://localhost:3003";

/**
 * Routing table. More specific prefixes are listed first. Reads are public;
 * writes (and owner-scoped reads like /my-restaurant) require a valid token.
 */
const services: ServiceRoute[] = [
    {
        prefix: "/auth",
        upstream: AUTH_URL,
        isPublic: (r) =>
            r.method === "POST" &&
            (r.url.startsWith("/auth/login") || r.url.startsWith("/auth/register"))
    },
    {
        prefix: "/restaurants",
        upstream: RESTAURANTS_URL,
        isPublic: () => true
    },
    {
        prefix: "/my-restaurant",
        upstream: RESTAURANTS_URL,
        isPublic: () => false
    },
    {
        prefix: "/restaurant",
        upstream: RESTAURANTS_URL,
        // GET (catalog/menu/reviews reads) is public; writes require auth.
        isPublic: (r) => r.method === "GET"
    },
    {
        prefix: "/orders",
        upstream: ORDERS_URL,
        // All order operations require an authenticated user.
        isPublic: () => false
    }
];

/**
 * Builds a pre-handler that authenticates the request before it is proxied.
 *
 * It rewrites the request headers in place: any client-supplied identity headers
 * are stripped (anti-spoofing), and on a valid token the verified identity is
 * injected as `x-user-id` / `x-user-role` for the downstream service. These
 * mutated headers are what @fastify/http-proxy forwards upstream.
 */
function make_auth_guard(isPublic: (request: FastifyRequest) => boolean) {
    return async function auth_guard(request: FastifyRequest, reply: FastifyReply) {
        // Never trust identity headers coming from the client.
        delete request.headers["x-user-id"];
        delete request.headers["x-user-role"];

        const authorization = request.headers["authorization"];
        if (!authorization) {
            if (isPublic(request)) {
                return;
            }
            return reply.code(401).send({ message: "Authentication required" });
        }

        try {
            const payload = await request.jwtVerify<TokenPayload>();
            request.headers["x-user-id"] = payload.id;
            if (payload.role) {
                request.headers["x-user-role"] = payload.role;
            }
        } catch {
            return reply.code(401).send({ message: "Invalid or expired token" });
        }
    };
}

/**
 * Registers an authenticating reverse proxy for every downstream service.
 *
 * Each proxy is registered in its own encapsulated scope so that the underlying
 * @fastify/reply-from decorator does not collide across upstreams.
 */
export default fp(async (app: FastifyInstance) => {
    for (const svc of services) {
        await app.register(async (scope) => {
            await scope.register(proxy, {
                upstream: svc.upstream,
                prefix: svc.prefix,
                rewritePrefix: svc.prefix,
                preHandler: make_auth_guard(svc.isPublic)
            });
        });
    }
});
