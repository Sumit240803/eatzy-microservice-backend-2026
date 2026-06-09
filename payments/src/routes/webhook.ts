import { FastifyPluginAsync } from "fastify";
import { handle_webhook } from "../controllers/payment.controller";

/**
 * Stripe webhook route, kept in its own encapsulated plugin so that the raw-body
 * content-type parser (required for signature verification) applies ONLY here
 * and does not affect the JSON parsing of the other payment routes.
 */
const webhook_routes : FastifyPluginAsync = async(fastify, opts)=>{
    // Replace the inherited JSON parser (in this scope only) with a raw-buffer
    // parser so Stripe signature verification has the exact bytes.
    fastify.removeContentTypeParser("application/json");
    fastify.addContentTypeParser("application/json", { parseAs : "buffer" }, (_req, body, done) => {
        done(null, body);
    });

    fastify.post("/payments/webhook", handle_webhook);
}

export default webhook_routes;
