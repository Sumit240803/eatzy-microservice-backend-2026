// JSON Schemas for menu request validation

export const create_menu_schema = {
    body : {
        type : "object",
        required : ["item_name", "half_plate_price", "full_plate_price"],
        additionalProperties : false,
        properties : {
            item_name : {type : "string", minLength : 1},
            half_plate_price : {type : "integer", minimum : 0},
            full_plate_price : {type : "integer", minimum : 0},
            image : {type : "array", items : {type : "string"}},
            description : {type : "string"}
        }
    }
};

export const update_menu_schema = {
    body : {
        type : "object",
        additionalProperties : false,
        minProperties : 1,
        properties : {
            item_name : {type : "string", minLength : 1},
            half_plate_price : {type : "integer", minimum : 0},
            full_plate_price : {type : "integer", minimum : 0},
            image : {type : "array", items : {type : "string"}},
            description : {type : "string"}
        }
    }
};
