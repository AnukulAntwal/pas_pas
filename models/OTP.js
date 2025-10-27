import mongoose from 'mongoose';
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // OTP will be automatically deleted after 5 minutes (300 seconds)
  },
  isUsed: {
    type: Boolean,
    default: false
  }
});

// Index for faster queries
otpSchema.index({ email: 1, createdAt: -1 });
export default mongoose.model('OTP', otpSchema);

// ==================== utils/otpGenerator.js ====================
export const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};
