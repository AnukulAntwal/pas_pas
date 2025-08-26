import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// ================= REGISTER API =================
router.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, phone_number, email, password } = req.body;

    // check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone_number }]
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email or Phone already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new user
    const newUser = new User({
      first_name,
      last_name,
      phone_number,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(200).json({ 
      message: "User registered successfully",
      user: {
        id: newUser._id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        phone_number: newUser.phone_number,
        email: newUser.email,
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ================= LOGIN API =================

router.post("/login", async (req, res) => {
  try {
    const { email, password , device_token , device_type } = req.body;

    // check user exist
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // generate token (JWT)
    const token = jwt.sign(
      { id: user._id, email: user.email },
      "mySecretKey", // secret key (env file me rakhna production ke liye)
      { expiresIn: "1h" }
    );
      user.device_token = device_token || user.device_token;
      user.device_type = device_type || user.device_type;
      await user.save();

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ================= LOGOUT API =================

router.post("/logout", async (req, res) => {
  try {
    const { email } = req.body;

    // check user exist
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // clear device_token & device_type
    // user.device_token = null;
    // user.device_type = null;
    // await user.save();

    res.status(200).json({
      message: "Logout successful, device info removed"
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



export default router;
