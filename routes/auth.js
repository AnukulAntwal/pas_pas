import express from "express";
import bcrypt from "bcryptjs";
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

    res.status(201).json({ 
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

export default router;
