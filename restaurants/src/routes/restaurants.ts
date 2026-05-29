import { FastifyPluginAsync } from "fastify";
import { get_all_restaurants, get_my_restraunt, get_restraunt_by_id } from "../controllers/restaurant.controller";

const restaurants_routes : FastifyPluginAsync = async(fastify, opts)=>{
    fastify.get("/restaurants", get_all_restaurants);
    fastify.get("/restaurant/:id", get_restraunt_by_id);
    fastify.get("/my-restaurant", get_my_restraunt);
}

export default restaurants_routes;