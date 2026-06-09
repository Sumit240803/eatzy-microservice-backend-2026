// JSON Schemas for payment request validation

export const create_payment_schema = {
    body : {
        type : "object",
        required : ["order_id"],
        additionalProperties : false,
        properties : {
            order_id : { type : "string", minLength : 1 },
            currency : { type : "string", minLength : 3, maxLength : 3 }
        }
    }
};

export const refund_schema = {
    body : {
        type : "object",
        additionalProperties : false,
        properties : {
            amount : { type : "integer", minimum : 1 }
        }
    }
};
