
import express from "express"
import { requestPasswordReset, verifyOTP } from "../../../controller/authController.js";
import { validate } from "../../../middlewares/validator.js";
import { resetPassword } from "../../../controller/authController.js";
import { body } from "express-validator";
const router = express.Router();

// Validation middleware
const validateEmail = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address')
];

const validateOTP = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits')
];

const validatePasswordReset = [
  body('email')
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('otp')
    .notEmpty().withMessage('OTP is required.')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits.')
    .isNumeric().withMessage('OTP must contain only numbers.'),

  body('newPassword')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
];

// Routes
router.post('/request-otp', validateEmail, validate, requestPasswordReset);
router.post('/verify-otp', validateOTP, validate, verifyOTP);
router.post('/reset-password', validatePasswordReset, validate, resetPassword);

export default router;