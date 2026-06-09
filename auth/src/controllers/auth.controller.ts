// Authentication & user routes

import { FastifyReply, FastifyRequest } from "fastify";
import { hash_password, verify_password } from "../utils/password";
import config from "../config/env";

type Role = "CUSTOMER" | "OWNER" | "DELIVERY" | "ADMIN";

interface RegisterBody {
    name : string;
    email : string;
    password : string;
    phone_number? : string;
    role? : Role;
}

interface LoginBody {
    email : string;
    password : string;
}

/**
 * Strips the password hash before returning a user to the client.
 */
function to_public_user(user : {password : string} & Record<string, unknown>){
    const {password, ...rest} = user;
    return rest;
}

/**
 * Issues a signed JWT carrying the user identity. The gateway verifies this
 * token and forwards `id` to downstream services as the `x-user-id` header.
 */
function sign_token(request : FastifyRequest, user : {id : string, email : string, role : Role}){
    return request.server.jwt.sign(
        {id : user.id, email : user.email, role : user.role},
        {expiresIn : config.jwt.expires_in}
    );
}

/**
 * Register a new user.
 */
export async function register(request : FastifyRequest<{Body : RegisterBody}>, reply : FastifyReply){
    const {name, email, password, phone_number, role} = request.body;

    const existing = await request.server.prisma.user.findUnique({where : {email}});
    if(existing !== null){
        return reply.conflict("Email already registered");
    }

    const password_hash = await hash_password(password);
    const user = await request.server.prisma.user.create({
        data : {
            name,
            email,
            password : password_hash,
            phone_number : phone_number,
            role : role ?? "CUSTOMER"
        }
    });

    const token = sign_token(request, user);
    return reply.code(201).send({data : {user : to_public_user(user), token}});
}

/**
 * Authenticate a user and return a fresh token.
 */
export async function login(request : FastifyRequest<{Body : LoginBody}>, reply : FastifyReply){
    const {email, password} = request.body;

    const user = await request.server.prisma.user.findUnique({where : {email}});
    if(user === null){
        return reply.unauthorized("Invalid email or password");
    }

    const ok = await verify_password(password, user.password);
    if(!ok){
        return reply.unauthorized("Invalid email or password");
    }

    const token = sign_token(request, user);
    return {data : {user : to_public_user(user), token}};
}

/**
 * Return the currently authenticated user.
 *
 * The gateway validates the JWT and forwards the user id as `x-user-id`.
 */
export async function me(request : FastifyRequest, reply : FastifyReply){
    const header = request.headers["x-user-id"];
    const user_id = Array.isArray(header) ? header[0] : header;
    if(!user_id){
        return reply.unauthorized("Missing x-user-id header");
    }

    const user = await request.server.prisma.user.findUnique({where : {id : user_id}});
    if(user === null){
        return reply.notFound("User not found");
    }
    return {data : to_public_user(user)};
}
