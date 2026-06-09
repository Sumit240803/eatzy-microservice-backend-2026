// JSON Schemas for auth request validation

export const register_schema = {
    body : {
        type : "object",
        required : ["name", "email", "password"],
        additionalProperties : false,
        properties : {
            name : {type : "string", minLength : 1},
            email : {type : "string", format : "email"},
            password : {type : "string", minLength : 6},
            phone_number : {type : "string"},
            role : {type : "string", enum : ["CUSTOMER", "OWNER", "DELIVERY", "ADMIN"]}
        }
    }
};

export const login_schema = {
    body : {
        type : "object",
        required : ["email", "password"],
        additionalProperties : false,
        properties : {
            email : {type : "string", format : "email"},
            password : {type : "string", minLength : 1}
        }
    }
};
