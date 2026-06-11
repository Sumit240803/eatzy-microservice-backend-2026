// JSON Schemas for delivery request validation

export const create_delivery_schema = {
    body : {
        type : "object",
        required : ["order_id"],
        additionalProperties : false,
        properties : {
            order_id : { type : "string", minLength : 1 }
        }
    }
};

export const assign_delivery_schema = {
    body : {
        type : "object",
        additionalProperties : false,
        properties : {
            driver_id : { type : "string", minLength : 1 }
        }
    }
};

export const update_status_schema = {
    body : {
        type : "object",
        required : ["status"],
        additionalProperties : false,
        properties : {
            status : { type : "string", enum : ["PICKED_UP", "DELIVERED", "CANCELLED"] }
        }
    }
};

export const update_location_schema = {
    body : {
        type : "object",
        required : ["lat", "lng"],
        additionalProperties : false,
        properties : {
            lat : { type : "number", minimum : -90, maximum : 90 },
            lng : { type : "number", minimum : -180, maximum : 180 }
        }
    }
};
