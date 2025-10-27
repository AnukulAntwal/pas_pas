import User from "../models/User.js";
import { loginValidate, registerValidate } from "../validations/userValidate.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// Login api function
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
    return res.status(500).json({status: 'fail', error: e.message });
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

    let profileImage = null;
    if (req.file) {
      profileImage = req.file.filename; // only store filename
    }
    // 3. Create new user
    const hashedPass = await bcrypt.hash(password, 10);  

    const newUser = new User({first_name,last_name,phone_number,email,password:hashedPass,profile_image: profileImage });

   const userDetails =  await newUser.save();

    // 4. Success response
    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: userDetails,
    });
  } catch (e) {
    return res.status(500).json({ status: 'fail', error: e.message });
  }
};


export const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
     
    if(email && !newPassword){
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ status: "fail", message: "User not found", data:[] });
      }
      return res.status(200).json({ status: "success", message: "User verified successfully", data:user });

    }

    if(email && newPassword){
      const user = await User.findOne({ email });
      const updatePassword = await User.updateOne({ email:email },{$set: {password:newPassword}});
      return res.status(200).json({ status: "success", message: "User password updated successfully", data:updatePassword });

    }
    return res.status(404).json({ status: "fail", message: "Please fill the required fields", data:[] });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: error.message,data:[] });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.query;

    if (!token || !newPassword) {
      return res.status(400).json({ status: "fail", message: "Token and new password are required",data:[]});
    }

    // Hash token to match DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ status: "fail", message: "Invalid or expired token", data:[]});
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
   const userDetails = await user.save();

    return res.status(200).json({
      status: "success",
      message: "Password has been reset successfully",
      data:userDetails
    });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: error.message });
  }
};
