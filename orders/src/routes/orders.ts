import { FastifyPluginAsync } from "fastify";
import {
    get_my_orders,
    get_order_by_id,
    get_restaurant_orders,
    place_order,
    update_order_status
} from "../controllers/order.controller";
import { place_order_schema, update_status_schema } from "../schemas/order.schema";

const orders_routes : FastifyPluginAsync = async(fastify, opts)=>{
    fastify.post("/orders", { schema : place_order_schema }, place_order);
    fastify.get("/orders", get_my_orders);
    fastify.get("/orders/restaurant/:restaurantId", get_restaurant_orders);
    fastify.get("/orders/:id", get_order_by_id);
    fastify.patch("/orders/:id/status", { schema : update_status_schema }, update_order_status);
}

export default orders_routes;
