
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
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Routes
router.post('/request-otp', validateEmail, validate, requestPasswordReset);
router.post('/verify-otp', validateOTP, validate, verifyOTP);
router.post('/reset-password', validatePasswordReset, validate, resetPassword);

export default router;