import { FastifyPluginAsync } from "fastify";
import {
    assign_delivery,
    create_delivery,
    get_available_deliveries,
    get_delivery_by_id,
    get_delivery_for_order,
    get_my_deliveries,
    update_delivery_location,
    update_delivery_status
} from "../controllers/delivery.controller";
import {
    assign_delivery_schema,
    create_delivery_schema,
    update_location_schema,
    update_status_schema
} from "../schemas/delivery.schema";

const deliveries_routes : FastifyPluginAsync = async(fastify, opts)=>{
    fastify.post("/deliveries", { schema : create_delivery_schema }, create_delivery);
    fastify.get("/deliveries", get_my_deliveries);
    fastify.get("/deliveries/available", get_available_deliveries);
    fastify.get("/deliveries/order/:orderId", get_delivery_for_order);
    fastify.get("/deliveries/:id", get_delivery_by_id);
    fastify.post("/deliveries/:id/assign", { schema : assign_delivery_schema }, assign_delivery);
    fastify.patch("/deliveries/:id/status", { schema : update_status_schema }, update_delivery_status);
    fastify.patch("/deliveries/:id/location", { schema : update_location_schema }, update_delivery_location);
}

export default deliveries_routes;
