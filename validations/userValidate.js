import Joi from "joi";


export const loginValidate = Joi.object({
  email: Joi.string().email().min(3).required().messages({
    "string.email": "Valid email required",
    "string.min": "Email should be at least 3 characters",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(3).required().messages({
    "string.min": "Password should be at least 3 characters",
    "any.required": "Password is required",
  }),
});



export const registerValidate = Joi.object({
  first_name: Joi.string().min(2).max(30).required().messages({
    "string.base": "First name must be a string",
    "string.empty": "First name is required",
    "string.min": "First name must be at least 2 characters",
    "any.required": "First name is required",
  }),

  last_name: Joi.string().min(2).max(30).required().messages({
    "string.base": "Last name must be a string",
    "string.empty": "Last name is required",
    "string.min": "Last name must be at least 2 characters",
    "any.required": "Last name is required",
  }),

  phone_number: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be 10 digits",
      "any.required": "Phone number is required",
    }),

  email: Joi.string().email().required().messages({
    "string.email": "Valid email required",
    "any.required": "Email is required",
  }),

  password: Joi.string().min(5).required().messages({
    "string.min": "Password must be at least 5 characters",
    "any.required": "Password is required",
  }),
});
