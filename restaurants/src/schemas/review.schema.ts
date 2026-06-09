// JSON Schemas for review request validation

export const create_review_schema = {
    body : {
        type : "object",
        required : ["review", "review_by", "image", "rating"],
        additionalProperties : false,
        properties : {
            review : {type : "string", minLength : 1},
            review_by : {type : "integer"},
            image : {type : "string"},
            rating : {type : "integer", minimum : 0, maximum : 5},
            date : {type : "string", format : "date-time"}
        }
    }
};
