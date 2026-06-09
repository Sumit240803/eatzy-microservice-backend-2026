//CRUD Routes for restaurants

import { FastifyReply, FastifyRequest } from "fastify";
import { verify_owner } from "../utils/authorization";

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
export async function get_all_restaurants(request : FastifyRequest<{Querystring : PaginationParams }> , reply : FastifyReply){
    const {page , limit } = request.query;
    const page_num = parseInt(page,10) || 1;
    const page_limit = parseInt(limit, 10) || 10;
    const restaurants = await request.server.prisma.restaurant.findMany({
        skip : (page_num - 1)* page_limit,
        take : page_limit
    });
    return {data : restaurants}
}

export async function get_restraunt_by_id(request : FastifyRequest<{Params : {id : string} }>, reply : FastifyReply){
    const {id} = request.params;
    const restraunt = await request.server.prisma.restaurant.findUnique({
        where : {id : id}
    })
    if(restraunt === null){
        return reply.notFound("Restaurant not found");
    }
    return {data : restraunt}
}

export async function get_my_restraunt(request : FastifyRequest<{Headers : {"x-user-id" : string}}>, reply : FastifyReply){
    const header = request.headers;
    const user_id = header["x-user-id"];
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }
    const restaurants = await request.server.prisma.restaurant.findMany({
        where : {
            owner : {id : user_id}
        }
    });
    return {data : restaurants}
}

// Write Routes
/**
 * Create Restaurant
 * Update Restaurant By Id
 * Delete Restaurant By Id
 */
interface RestaurantBody {
    name : string;
    email : string;
    website : string;
    address_line_1 : string;
    address_line_2 : string;
    address_line_3? : string;
    pincode : string;
    state : string;
    city : string;
    country : string;
    phone_number : number[];
    rating : number;
}

export async function create_restaurant(request : FastifyRequest<{Body : RestaurantBody}>, reply : FastifyReply){
    const body = request.body;
    try{
        const restaurant = await request.server.prisma.restaurant.create({
            data : {
                name : body.name,
                email : body.email,
                website : body.website,
                address_line_1 : body.address_line_1,
                address_line_2 : body.address_line_2,
                address_line_3 : body.address_line_3,
                pincode : body.pincode,
                state : body.state,
                city : body.city,
                country : body.country,
                phone_number : body.phone_number ?? [],
                rating : body.rating ?? 0
            }
        });
        return reply.code(201).send({data : restaurant});
    }catch(err : any){
        // Prisma unique constraint violation
        if(err?.code === "P2002"){
            return reply.conflict("A restaurant with the same name, email or website already exists");
        }
        throw err;
    }
}

export async function update_restaurant(request : FastifyRequest<{Params : {id : string} , Body : Partial<RestaurantBody>}>, reply : FastifyReply){
    const {id} = request.params;
    const body = request.body;

    if(!(await verify_owner(request, id))){
        return reply.forbidden("You are not the owner of this restaurant");
    }

    try{
        const restaurant = await request.server.prisma.restaurant.update({
            where : {id : id},
            data : body
        });
        return {data : restaurant};
    }catch(err : any){
        if(err?.code === "P2025"){
            return reply.notFound("Restaurant not found");
        }
        if(err?.code === "P2002"){
            return reply.conflict("A restaurant with the same name, email or website already exists");
        }
        throw err;
    }
}

export async function delete_restaurant(request : FastifyRequest<{Params : {id : string}}>, reply : FastifyReply){
    const {id} = request.params;

    if(!(await verify_owner(request, id))){
        return reply.forbidden("You are not the owner of this restaurant");
    }

    try{
        await request.server.prisma.restaurant.delete({
            where : {id : id}
        });
        return reply.code(204).send();
    }catch(err : any){
        if(err?.code === "P2025"){
            return reply.notFound("Restaurant not found");
        }
        throw err;
    }
}
