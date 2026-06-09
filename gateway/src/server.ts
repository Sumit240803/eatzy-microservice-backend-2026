import "dotenv/config";
import fastify from "fastify";
import corsPlugin from "./plugins/cors.js";
import ratelimitPlugin from "./plugins/rate-limit.js";
import jwtPlugin from "./plugins/jwt.js";
import proxyPlugin from "./plugins/proxy.js";

const server = fastify({ logger: true });

// Cross-cutting concerns (applied globally via fastify-plugin).
await server.register(corsPlugin);
await server.register(ratelimitPlugin);
await server.register(jwtPlugin);

// Authenticating reverse proxies to the downstream services.
await server.register(proxyPlugin);

// Gateway health check.
server.get("/ping", async () => "pong\n");

const port = Number(process.env.PORT ?? 3000);

try {
    const address = await server.listen({ port });
    server.log.info(`Gateway listening at ${address}`);
} catch (err) {
    server.log.error(err);
    process.exit(1);
}
