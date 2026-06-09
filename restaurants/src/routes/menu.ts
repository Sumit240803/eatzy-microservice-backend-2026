import { FastifyPluginAsync } from "fastify";
import { create_menu_item, delete_menu_item, get_menu, update_menu_item } from "../controllers/menu.controller";
import { create_menu_schema, update_menu_schema } from "../schemas/menu.schema";

const menu_routes : FastifyPluginAsync = async(fastify, opts)=>{
    fastify.get("/restaurant/:id/menu", get_menu);
    fastify.post("/restaurant/:id/menu", {schema : create_menu_schema}, create_menu_item);
    fastify.put("/restaurant/:id/menu/:menuId", {schema : update_menu_schema}, update_menu_item);
    fastify.delete("/restaurant/:id/menu/:menuId", delete_menu_item);
}

export default menu_routes;
