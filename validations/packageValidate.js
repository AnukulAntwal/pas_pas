import Joi from "joi";                                              

export const savePackageValidate = Joi.object({
//   userId: Joi.number().integer().required().messages({
//     "any.required": "userId is required",
//     "number.base": "userId must be a number",
//     "number.integer": "userId must be an integer"
//   }),

  pickup: Joi.object({
    address: Joi.string().required().messages({
      "any.required": "Pickup address is required"
    }),
    latitude: Joi.number().required().messages({
      "any.required": "Pickup latitude is required"
    }),
    longitude: Joi.number().required().messages({
      "any.required": "Pickup longitude is required"
    }),
    datetime: Joi.date().required().messages({
      "any.required": "Pickup datetime is required"
    }),
  }).required(),

  drop: Joi.object({
    address: Joi.string().required().messages({
      "any.required": "Drop address is required"
    }),
    latitude: Joi.number().required().messages({
      "any.required": "Drop latitude is required"
    }),
    longitude: Joi.number().required().messages({
      "any.required": "Drop longitude is required"
    }),
    datetime: Joi.date().required().messages({
      "any.required": "Drop datetime is required"
    }),
  }).required(),

  status: Joi.string()
    .valid("pending", "picked_up", "on_the_way", "delivered", "cancelled")
    .default("pending"),
});
