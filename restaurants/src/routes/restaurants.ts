import { FastifyPluginAsync } from "fastify";
import { create_restaurant, delete_restaurant, get_all_restaurants, get_my_restraunt, get_restraunt_by_id, update_restaurant } from "../controllers/restaurant.controller";
import { create_restaurant_schema, update_restaurant_schema } from "../schemas/restaurant.schema";

const restaurants_routes : FastifyPluginAsync = async(fastify, opts)=>{
    // Read
    fastify.get("/restaurants", get_all_restaurants);
    fastify.get("/restaurant/:id", get_restraunt_by_id);
    fastify.get("/my-restaurant", get_my_restraunt);

    // Write
    fastify.post("/restaurant", {schema : create_restaurant_schema}, create_restaurant);
    fastify.put("/restaurant/:id", {schema : update_restaurant_schema}, update_restaurant);
    fastify.delete("/restaurant/:id", delete_restaurant);
}

export default restaurants_routes;
