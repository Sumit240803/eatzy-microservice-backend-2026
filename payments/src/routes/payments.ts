import { FastifyPluginAsync } from "fastify";
import {
    create_payment,
    get_my_payments,
    get_payment_by_id,
    get_payments_for_order,
    refund_payment
} from "../controllers/payment.controller";
import { create_payment_schema, refund_schema } from "../schemas/payment.schema";

const payments_routes : FastifyPluginAsync = async(fastify, opts)=>{
    fastify.post("/payments", { schema : create_payment_schema }, create_payment);
    fastify.get("/payments", get_my_payments);
    fastify.get("/payments/order/:orderId", get_payments_for_order);
    fastify.get("/payments/:id", get_payment_by_id);
    fastify.post("/payments/:id/refund", { schema : refund_schema }, refund_payment);
}

export default payments_routes;
