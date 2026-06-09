// JSON Schemas for order request validation

export const place_order_schema = {
    body : {
        type : "object",
        required : ["restaurant_id", "delivery_address", "items"],
        additionalProperties : false,
        properties : {
            restaurant_id : { type : "string", minLength : 1 },
            delivery_address : { type : "string", minLength : 1 },
            items : {
                type : "array",
                minItems : 1,
                items : {
                    type : "object",
                    required : ["menu_item_id", "plate_type", "quantity"],
                    additionalProperties : false,
                    properties : {
                        menu_item_id : { type : "string", minLength : 1 },
                        plate_type : { type : "string", enum : ["HALF", "FULL"] },
                        quantity : { type : "integer", minimum : 1 }
                    }
                }
            }
        }
    }
};

export const update_status_schema = {
    body : {
        type : "object",
        required : ["status"],
        additionalProperties : false,
        properties : {
            status : {
                type : "string",
                enum : ["ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]
            }
        }
    }
};
