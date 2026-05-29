//CRUD Routes for restaurants 

import { FastifyReply, FastifyRequest } from "fastify";

// Get Routes
/**
 * Get All Restaurants (Public)
 * Get Restaurants By Id
 * Get My Restaurant
 */
interface PaginationParams {
    page : string;
    limit : string;
}
export async function get_all_restaurants(request : FastifyRequest<{Params : PaginationParams }> , reply : FastifyReply){
    const {page , limit } = request.params;
    const page_num = parseInt(page,10) || 1;
    const page_limit = parseInt(limit, 10) || 10;
    const restaurants = await request.server.prisma.restaurant.findMany({
        skip : (page_num - 1)* page_limit,
        take : page_limit
    });
    return {data : restaurants.length == 0 ? 0 : restaurants}
}

export async function get_restraunt_by_id(request : FastifyRequest<{Params : {id : string} }>, reply : FastifyReply){
    const {id} = request.params;
    const restraunt = await request.server.prisma.restaurant.findUnique({
        where : {id : id}
    })
    if(restraunt !== undefined || restraunt !== null){
        return {data : restraunt}
    }else{
        return {data : null}
    }
}

export async function get_my_restraunt(request : FastifyRequest<{Headers : {"x-user-id" : string}}>, reply : FastifyReply){
    const header = request.headers;
    const user_id = header["x-user-id"];
    const restaurants = await request.server.prisma.restaurant.findMany({
        where : {
            owner : {id : user_id}
        }
    });
    return {data : restaurants}
}