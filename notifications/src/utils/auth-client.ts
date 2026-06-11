import config from "../config/env";

const AUTH_URL = config.services.auth_url;

export interface AuthUser {
    id : string;
    name : string;
    email : string;
    role : string;
}

/**
 * Resolves a user (id, name, email, role) from the auth service via its
 * internal lookup endpoint. Returns null when the user cannot be found.
 */
export async function fetch_user(user_id : string) : Promise<AuthUser | null> {
    let response : Response;
    try {
        response = await fetch(`${AUTH_URL}/internal/users/${user_id}`);
    } catch {
        throw new Error("Auth service is unavailable");
    }
    if(response.status === 404){
        return null;
    }
    if(!response.ok){
        throw new Error(`Auth service responded with ${response.status}`);
    }
    const body = await response.json() as { data : AuthUser };
    return body.data;
}
