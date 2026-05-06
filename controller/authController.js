import pkg from "joi";
const { date, string, object } = pkg;
import OTP, { generateOTP } from "../models/OTP.js";
import User from "../models/User.js";
import { sendOTPEmail } from "../services/emailService.js";
import bcrypt from "bcryptjs";
// Step 1: Request OTP for password reset
import DeletedAccount from "../models/DeletedAccount.js";

export const requestPasswordReset = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    // 🔒 Validation
    if (!email || !purpose) {
      return res.status(400).json({
        status: "fail",
        message: "Email and purpose are required.",
        data: [],
      });
    }

    if (purpose !== "account" && purpose !== "reset") {
      return res.status(400).json({
        status: "fail",
        message: "Invalid purpose. Please provide a valid request type.",
        data: [],
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 🛑 NEW: Check deleted account (ONLY for signup/account verification)
    if (purpose === "account") {
      const deleted = await DeletedAccount.findOne({ email: normalizedEmail });

      if (deleted) {
        return res.status(403).json({
          status: "fail",
          message:
            "This account has been permanently removed from the PasPas platform and cannot be used for registration.",
          data: [],
        });
      }
    }

    // 🔍 Existing user check (only for reset)
    if (purpose !== "account") {
      const user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        return res.status(404).json({
          status: "fail",
          message: "No account found with the provided email address.",
          data: [],
        });
      }
    }

    // 🔐 Generate OTP
    const otp = generateOTP(6);
    console.log(`Generated OTP for ${normalizedEmail}: ${otp}`);

    // 🧹 Remove old OTPs
    await OTP.deleteMany({ email: normalizedEmail });

    // 💾 Save new OTP
    await OTP.create({
      email: normalizedEmail,
      otp,
    });

    // 📧 Send Email
    await sendOTPEmail(normalizedEmail, otp, purpose);

    let message = "";

    if (purpose === "account") {
      message = "An OTP has been sent to your email for account verification.";
    } else if (purpose === "reset") {
      message = "An OTP has been sent to your email to reset your password.";
    }

    return res.json({
      status: "success",
      message,
      email: normalizedEmail,
      data: normalizedEmail,
    });

  } catch (error) {
    console.error("Request OTP error:", error);

    return res.status(500).json({
      status: "fail",
      message: "An unexpected error occurred. Please try again later.",
      data: [],
    });
  }
};

// Step 2: Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    // console.log(req.body);
    if (!email || !otp) {
      return res.status(400).json({
        status: "fail",
        message: "Email and OTP are required",
        data: [],
      });
    }
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
   res.status(200).json({
    status: "success",
    message: "OTP has been verified successfully.",
    data: { email },
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
    const { email,otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: "fail",
        message: "Email, OTP, and new password are required",
        data: [],
      });
    }
    // Verify OTP again
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

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "No account found with this email.",
      });
    }

    // Update password
    const hashedPass = await bcrypt.hash(newPassword, 10);
    user.password = hashedPass;
    await user.save();

    // Mark OTP as used and delete it
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      status: "success",
      message: "Your password has been reset successfully.",
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
