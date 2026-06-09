// Routes for restaurant reviews

import { FastifyReply, FastifyRequest } from "fastify";
import { verify_owner } from "../utils/authorization";

interface ReviewBody {
    review : string;
    review_by : number; // User id
    image : string;
    rating : number;
    date? : string;
}

/**
 * Get all reviews of a restaurant (Public)
 */
export async function get_reviews(request : FastifyRequest<{Params : {id : string}}>, reply : FastifyReply){
    const {id} = request.params;
    const reviews = await request.server.prisma.reviews.findMany({
        where : {restaurant_id : id},
        orderBy : {date : "desc"}
    });
    return {data : reviews};
}

/**
 * Add a review to a restaurant (Any authenticated user)
 */
export async function create_review(request : FastifyRequest<{Params : {id : string}, Body : ReviewBody}>, reply : FastifyReply){
    const {id} = request.params;
    const body = request.body;

    try{
        const review = await request.server.prisma.reviews.create({
            data : {
                restaurant_id : id,
                review : body.review,
                review_by : body.review_by,
                image : body.image,
                rating : body.rating,
                date : body.date ? new Date(body.date) : new Date()
            }
        });
        return reply.code(201).send({data : review});
    }catch(err : any){
        if(err?.code === "P2003"){
            return reply.notFound("Restaurant not found");
        }
        throw err;
    }
}

/**
 * Delete a review (Owner only - moderation)
 */
export async function delete_review(request : FastifyRequest<{Params : {id : string, reviewId : string}}>, reply : FastifyReply){
    const {id, reviewId} = request.params;

    if(!(await verify_owner(request, id))){
        return reply.forbidden("You are not the owner of this restaurant");
    }

    const existing = await request.server.prisma.reviews.findUnique({where : {id : reviewId}});
    if(existing === null || existing.restaurant_id !== id){
        return reply.notFound("Review not found");
    }

    await request.server.prisma.reviews.delete({where : {id : reviewId}});
    return reply.code(204).send();
}
