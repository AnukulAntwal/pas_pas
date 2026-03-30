import pkg from "joi";
const { date, string, object } = pkg;
import OTP, { generateOTP } from "../models/OTP.js";
import User from "../models/User.js";
import { sendOTPEmail } from "../services/emailService.js";
import bcrypt from "bcryptjs";
// Step 1: Request OTP for password reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if(!email || !purpose){
      return res.status(400).json({
        status: "fail",
        message: "Email and purpose are required",
        data: [],
      });
    }
    if(purpose !== "account" && purpose !== "reset"){
      return res.status(400).json({
        status: "fail",
        message: "Invalid purpose.Please use valid purpose for veryfying the request",
        data: [],
      });
    }
    // Check if user exists
  if(purpose != "account"){
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "No account found with this email",
        data: [],
      });
    }
  }
    // Generate OTP
    const otp = generateOTP(6);
    console.log(`Generated OTP for ${email}: ${otp}`);
    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email });

    // Save new OTP to database
    await OTP.create({
      email,
      otp,
    });

    // Send OTP via email
    await sendOTPEmail(email, otp, purpose);

    res.json({
      status: "success",
      message: "OTP sent to your email",
      email,
      data: email,
    });
  } catch (error) {
    console.error("Request password reset error:", error);
    res.status(500).json({
      status: "fail",
      message: error.message,
      data: [],
    });
  }
};

// Step 2: Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(req.body);
    
    // Find the OTP in database
    const otpRecord = await OTP.findOne({
      email,
      otp,
      isUsed: false,
    });

    if (!otpRecord) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid or expired OTP",
        data: [],
      });
    }

    // OTP is valid
    res.json({
      status: "success",
      message: "OTP verified successfully",
      email,
      data: email,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to verify OTP",
      data: [],
    });
  }
};

// Step 3: Reset password
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Verify OTP again
    // const otpRecord = await OTP.findOne({
    //   email,
    //   otp,
    //   isUsed: false,
    // });

    // if (!otpRecord) {
    //   return res.status(400).json({
    //     status: "fail",
    //     message: "Invalid or expired OTP",
    //     data: [],
    //   });
    // }

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
        data: [],
      });
    }

    // Update password
    const hashedPass = await bcrypt.hash(newPassword, 10);
    user.password = hashedPass;
    await user.save();

    // Mark OTP as used and delete it
    // await OTP.deleteOne({ _id: otpRecord._id });

    res.json({
      status: "success",
      message: "Password reset successfully",
      data: user,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to reset password",
      data: [],
    });
  }
};
