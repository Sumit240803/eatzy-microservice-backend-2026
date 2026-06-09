import { FastifyRequest } from "fastify";

export type Role = "CUSTOMER" | "OWNER" | "DELIVERY" | "ADMIN";

/**
 * Reads the authenticated user id forwarded by the gateway (x-user-id).
 */
export function get_user_id(request : FastifyRequest) : string | undefined {
    const value = request.headers["x-user-id"];
    return Array.isArray(value) ? value[0] : value;
}

/**
 * Reads the authenticated user's role forwarded by the gateway (x-user-role).
 */
export function get_user_role(request : FastifyRequest) : Role | undefined {
    const value = request.headers["x-user-role"];
    const role = Array.isArray(value) ? value[0] : value;
    return role as Role | undefined;
}
