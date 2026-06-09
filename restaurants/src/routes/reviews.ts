import { FastifyPluginAsync } from "fastify";
import { create_review, delete_review, get_reviews } from "../controllers/review.controller";
import { create_review_schema } from "../schemas/review.schema";

const reviews_routes : FastifyPluginAsync = async(fastify, opts)=>{
    fastify.get("/restaurant/:id/reviews", get_reviews);
    fastify.post("/restaurant/:id/reviews", {schema : create_review_schema}, create_review);
    fastify.delete("/restaurant/:id/reviews/:reviewId", delete_review);
}

export default reviews_routes;
