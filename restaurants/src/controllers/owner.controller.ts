// Routes for restaurant owner

import { FastifyReply, FastifyRequest } from "fastify";
import { get_user_id, verify_owner } from "../utils/authorization";

interface OwnerBody {
    name : string;
    email : string;
    phone_number : number;
}

/**
 * Get the owner of a restaurant (Public)
 */
export async function get_owner(request : FastifyRequest<{Params : {id : string}}>, reply : FastifyReply){
    const {id} = request.params;
    const owner = await request.server.prisma.owner.findUnique({
        where : {restaurant_id : id}
    });
    if(owner === null){
        return reply.notFound("Owner not found");
    }
    return {data : owner};
}

/**
 * Claim ownership of a restaurant.
 *
 * The authenticated caller (x-user-id) becomes the owner, so that subsequent
 * owner-only operations can be authorized via `verify_owner`. A restaurant can
 * have at most one owner (enforced by the unique restaurant_id on Owner).
 */
export async function create_owner(request : FastifyRequest<{Params : {id : string}, Body : OwnerBody}>, reply : FastifyReply){
    const {id} = request.params;
    const body = request.body;
    const user_id = get_user_id(request);

    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }

    try{
        const owner = await request.server.prisma.owner.create({
            data : {
                id : user_id,
                name : body.name,
                email : body.email,
                phone_number : body.phone_number,
                restaurant_id : id
            }
        });
        return reply.code(201).send({data : owner});
    }catch(err : any){
        // Unique violation -> restaurant already has an owner / email taken / id taken
        if(err?.code === "P2002"){
            return reply.conflict("This restaurant already has an owner, or the email/user is already registered as an owner");
        }
        // Foreign key violation -> restaurant does not exist
        if(err?.code === "P2003"){
            return reply.notFound("Restaurant not found");
        }
        throw err;
    }
}

/**
 * Update owner details (Owner only)
 */
export async function update_owner(request : FastifyRequest<{Params : {id : string}, Body : Partial<OwnerBody>}>, reply : FastifyReply){
    const {id} = request.params;
    const body = request.body;

    if(!(await verify_owner(request, id))){
        return reply.forbidden("You are not the owner of this restaurant");
    }

    try{
        const owner = await request.server.prisma.owner.update({
            where : {restaurant_id : id},
            data : {
                name : body.name,
                email : body.email,
                phone_number : body.phone_number
            }
        });
        return {data : owner};
    }catch(err : any){
        if(err?.code === "P2002"){
            return reply.conflict("This email is already registered as an owner");
        }
        throw err;
    }
}

/**
 * Remove the owner of a restaurant (Owner only)
 */
export async function delete_owner(request : FastifyRequest<{Params : {id : string}}>, reply : FastifyReply){
    const {id} = request.params;

    if(!(await verify_owner(request, id))){
        return reply.forbidden("You are not the owner of this restaurant");
    }

    await request.server.prisma.owner.delete({where : {restaurant_id : id}});
    return reply.code(204).send();
}
