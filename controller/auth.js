import User from "../models/User.js";
import { loginValidate, registerValidate } from "../validations/userValidate.js";
import bcrypt from "bcryptjs";

export const loginController = async (req, res) => {
  
  const { error } = loginValidate.validate(req.body);
  if (error)
    return res.status(400).json({ error: error.details[0].message });

  try {
    const { email, password } = req.body;

    // 2. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 3. If matched → success response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};


export const registerController = async (req, res) => {
const hashPassword = async (password) => {
  const hashedPass = await bcrypt.hash(password, 10);  
  return hashedPass;
};
  const { error } = registerValidate.validate(req.body);
  if (error)
    return res.status(400).json({ error: error.details[0].message });

  try {
    const {first_name,last_name,phone_number,email,password}=req.body
     const hpassword = await hashPassword(password) 
     console.log(hpassword);
     
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User already exists with this email" });
    }

    // 3. Create new user

    const newUser = new User({first_name,last_name,phone_number,email,hpassword });

    await newUser.save();

    // 4. Success response
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: newUser,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
