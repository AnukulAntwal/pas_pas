import User from "../models/User.js";
import { loginValidate, registerValidate } from "../validations/userValidate.js";
import bcrypt from "bcryptjs";

export const loginController = async (req, res) => {
  
  const { error } = loginValidate.validate(req.body);
  if (error)
    return res.status(400).json({ error: error.details[0].message });

  try {
    const { email, password , device_type , device_token} = req.body;
   
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    user.device_type = device_type;
    user.device_token = device_token;
    user.last_login = new Date();
    
    const userSave = await user.save()
   
    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: userSave
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};


export const registerController = async (req, res) => {
  
  const { error } = registerValidate.validate(req.body);
  if (error)
    return res.status(400).json({ error: error.details[0].message });

  try {
    const {first_name,last_name,phone_number,email,password}=req.body
     
     
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User already exists with this email" });
    }

    // 3. Create new user
    const hashedPass = await bcrypt.hash(password, 10);  

    const newUser = new User({first_name,last_name,phone_number,email,password:hashedPass });

   const userDetails =  await newUser.save();

    // 4. Success response
    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: userDetails,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
