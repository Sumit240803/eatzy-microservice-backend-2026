// JSON Schemas for owner request validation

export const create_owner_schema = {
    body : {
        type : "object",
        required : ["name", "email", "phone_number"],
        additionalProperties : false,
        properties : {
            name : {type : "string", minLength : 1},
            email : {type : "string", format : "email"},
            phone_number : {type : "integer"}
        }
    }
};

export const update_owner_schema = {
    body : {
        type : "object",
        additionalProperties : false,
        minProperties : 1,
        properties : {
            name : {type : "string", minLength : 1},
            email : {type : "string", format : "email"},
            phone_number : {type : "integer"}
        }
    }
};
