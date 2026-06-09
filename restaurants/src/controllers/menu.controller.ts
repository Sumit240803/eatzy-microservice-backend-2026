// CRUD Routes for a restaurant's menu

import { FastifyReply, FastifyRequest } from "fastify";
import { verify_owner } from "../utils/authorization";

interface MenuBody {
    item_name : string;
    half_plate_price : number;
    full_plate_price : number;
    image : string[];
    description? : string;
}

/**
 * Get the full menu of a restaurant (Public)
 */
export async function get_menu(request : FastifyRequest<{Params : {id : string}}>, reply : FastifyReply){
    const {id} = request.params;
    const menu = await request.server.prisma.menu.findMany({
        where : {restaurant_id : id}
    });
    return {data : menu};
}

/**
 * Add a menu item to a restaurant (Owner only)
 */
export async function create_menu_item(request : FastifyRequest<{Params : {id : string}, Body : MenuBody}>, reply : FastifyReply){
    const {id} = request.params;
    const body = request.body;

    if(!(await verify_owner(request, id))){
        return reply.forbidden("You are not the owner of this restaurant");
    }

    try{
        const item = await request.server.prisma.menu.create({
            data : {
                item_name : body.item_name,
                half_plate_price : body.half_plate_price,
                full_plate_price : body.full_plate_price,
                image : body.image ?? [],
                description : body.description,
                restaurant_id : id
            }
        });
        return reply.code(201).send({data : item});
    }catch(err : any){
        // Foreign key violation -> restaurant does not exist
        if(err?.code === "P2003"){
            return reply.notFound("Restaurant not found");
        }
        throw err;
    }
}

/**
 * Update a menu item (Owner only)
 */
export async function update_menu_item(request : FastifyRequest<{Params : {id : string, menuId : string}, Body : Partial<MenuBody>}>, reply : FastifyReply){
    const {id, menuId} = request.params;
    const body = request.body;

    if(!(await verify_owner(request, id))){
        return reply.forbidden("You are not the owner of this restaurant");
    }

    // Ensure the menu item belongs to this restaurant before updating
    const existing = await request.server.prisma.menu.findUnique({where : {id : menuId}});
    if(existing === null || existing.restaurant_id !== id){
        return reply.notFound("Menu item not found");
    }

    const item = await request.server.prisma.menu.update({
        where : {id : menuId},
        data : body
    });
    return {data : item};
}

/**
 * Delete a menu item (Owner only)
 */
export async function delete_menu_item(request : FastifyRequest<{Params : {id : string, menuId : string}}>, reply : FastifyReply){
    const {id, menuId} = request.params;

    if(!(await verify_owner(request, id))){
        return reply.forbidden("You are not the owner of this restaurant");
    }

    const existing = await request.server.prisma.menu.findUnique({where : {id : menuId}});
    if(existing === null || existing.restaurant_id !== id){
        return reply.notFound("Menu item not found");
    }

    await request.server.prisma.menu.delete({where : {id : menuId}});
    return reply.code(204).send();
}
