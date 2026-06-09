// JSON Schemas for restaurant request validation

export const create_restaurant_schema = {
    body : {
        type : "object",
        required : [
            "name", "email", "website",
            "address_line_1", "address_line_2",
            "pincode", "state", "city", "country"
        ],
        additionalProperties : false,
        properties : {
            name : {type : "string", minLength : 1},
            email : {type : "string", format : "email"},
            website : {type : "string", minLength : 1},
            address_line_1 : {type : "string", minLength : 1},
            address_line_2 : {type : "string", minLength : 1},
            address_line_3 : {type : "string"},
            pincode : {type : "string", minLength : 1},
            state : {type : "string", minLength : 1},
            city : {type : "string", minLength : 1},
            country : {type : "string", minLength : 1},
            phone_number : {type : "array", items : {type : "integer"}},
            rating : {type : "integer", minimum : 0, maximum : 5}
        }
    }
};

export const update_restaurant_schema = {
    body : {
        type : "object",
        additionalProperties : false,
        minProperties : 1,
        properties : {
            name : {type : "string", minLength : 1},
            email : {type : "string", format : "email"},
            website : {type : "string", minLength : 1},
            address_line_1 : {type : "string", minLength : 1},
            address_line_2 : {type : "string", minLength : 1},
            address_line_3 : {type : "string"},
            pincode : {type : "string", minLength : 1},
            state : {type : "string", minLength : 1},
            city : {type : "string", minLength : 1},
            country : {type : "string", minLength : 1},
            phone_number : {type : "array", items : {type : "integer"}},
            rating : {type : "integer", minimum : 0, maximum : 5}
        }
    }
};
