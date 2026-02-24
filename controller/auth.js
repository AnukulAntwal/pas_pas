import User from "../models/User.js";
import { loginValidate, registerValidate } from "../validations/userValidate.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
import { deleteOldFile } from "../utils/deleteOldFile.js";


// Login api function
// export const loginController = async (req, res) => {
  
//   const { error } = loginValidate.validate(req.body);
//   if (error)
//     return res.status(400).json({ error: error.details[0].message });

//   try {
//     const { email, password , device_type , device_token} = req.body;
   
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }
//     user.device_type = device_type;
//     user.device_token = device_token;
//     user.last_login = new Date();
    
//     const userSave = await user.save()
   
//     return res.status(200).json({
//       status: "success",
//       message: "Login successful",
//       data: userSave
//     });
//   } catch (e) {
//     return res.status(500).json({status: 'fail', error: e.message });
//   }
// };
export const loginController = async (req, res) => {
  // Step 1: Validate request body
  const { error } = loginValidate.validate(req.body);
  if (error)
    return res.status(400).json({ error: error.details[0].message });

  try {
    const { email, password, device_type, device_token } = req.body;

    // Step 2: Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
        data: []
      });
    }

  

    // Step 3: Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
        data: []
      });
    }
    // ✅ Step 2.1: Check if user is blocked

    if (user.is_blocked === 1) {
      return res.status(403).json({
        status: "fail",
        message:
          "Your account has been blocked due to unverified documents. Please contact paspaspackage@gmail.com",
        data: []
      });
    }
    // Step 4: Generate random token
    const token = crypto.randomBytes(32).toString("hex");

    // Step 5: Update user record
    user.device_type = device_type;
    user.device_token = device_token;
    user.last_login = new Date();
    user.token = token;

    const userSave = await user.save();
        // ✅ Create base URL
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // ✅ Convert mongoose document to normal object
    const userObj = userSave.toObject();

    /* ================= PROFILE IMAGE ================= */

    if (userObj.profile_image) {
      userObj.profile_image = `${baseUrl}/uploads/profile_images/${userObj.profile_image}`;
    } else {
      userObj.profile_image = null;
    }

    // Step 6: Respond with token
    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: userObj
    });

  } catch (e) {
    return res.status(500).json({
      status: "fail",
      message: e.message,
      data: []
    });
  }
};


export const registerController = async (req, res) => {
  
  const { error } = registerValidate.validate(req.body);
  if (error)
    return res.status(400).json({ status: "fail", message: error.details[0].message, data: [] });

  try {
    const {first_name,last_name,phone_number,email,password}=req.body
     
     
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ status: "fail", message: "User already exists with this email", data: [] });
    }

    let profileImage = null;
    if (req.file) {
      profileImage = req.file.filename; // only store filename
    }
    // 3. Create new user
    const hashedPass = await bcrypt.hash(password, 10);  

    const newUser = new User({first_name,last_name,phone_number,email,copy_password:password,password:hashedPass,profile_image: profileImage });

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

export const editProfile = async (req, res) => {
  try {
    const user = req.user; // from auth middleware

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized. Please log in.",
        data: []
      });
    }

    const {
      first_name,
      last_name,
      email,
      phone_number,
      aadhar_number,
      pan_number,
      address,
      city,
      state,
      pincode
    } = req.body;

    /* ================= AADHAAR IMAGE VALIDATION ================= */
    const aadharFront = req.files?.aadhar_front_image;
    const aadharBack = req.files?.aadhar_back_image;

    if ((aadharFront && !aadharBack) || (!aadharFront && aadharBack)) {
      return res.status(400).json({
        status: "fail",
        message: "Please upload both Aadhaar front and back images together.",
        data: []
      });
    }

    /* ================= EMAIL CHECK ================= */
    if (email && email !== user.email) {
      const exists = await User.findOne({ email, _id: { $ne: user._id } });
      if (exists) {
        return res.status(409).json({
          status: "fail",
          message: "This email address is already in use.",
          data: []
        });
      }
      user.email = email;
    }

    /* ================= PHONE CHECK ================= */
    if (phone_number && phone_number !== user.phone_number) {
      const exists = await User.findOne({ phone_number, _id: { $ne: user._id } });
      if (exists) {
        return res.status(409).json({
          status: "fail",
          message: "This phone number is already in use.",
          data: []
        });
      }
      user.phone_number = phone_number;
    }

    /* ================= AADHAAR CHECK ================= */
    if (aadhar_number && aadhar_number !== user.aadhar_number) {
      const exists = await User.findOne({
        aadhar_number,
        _id: { $ne: user._id }
      });
      if (exists) {
        return res.status(409).json({
          status: "fail",
          message: "This Aadhaar number is already in use.",
          data: []
        });
      }
      user.aadhar_number = aadhar_number;
      user.is_valid_adhar = 0;
    }

    /* ================= PAN CHECK ================= */
    if (pan_number && pan_number !== user.pan_number) {
      const exists = await User.findOne({
        pan_number,
        _id: { $ne: user._id }
      });
      if (exists) {
        return res.status(409).json({
          status: "fail",
          message: "This PAN number is already in use.",
          data: []
        });
      }
      user.pan_number = pan_number;
      user.is_valid_pan = 0;
    }

    /* ================= BASIC FIELDS ================= */
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (address) user.address = address;
    if (city) user.city = city;
    if (state) user.state = state;
    if (pincode) user.pincode = pincode;

    /* ================= PROFILE IMAGE ================= */
    if (req.files?.profile_image) {
      deleteOldFile("uploads/profile_images", user.profile_image);
      user.profile_image = req.files.profile_image[0].filename;
    }

    /* ================= PAN IMAGE ================= */
    if (req.files?.pan_image) {
      deleteOldFile("uploads/pan_images", user.pan_image);
      user.pan_image = req.files.pan_image[0].filename;
      user.is_valid_pan = 0;
    }

    /* ================= AADHAAR IMAGES ================= */
    if (aadharFront && aadharBack) {
      deleteOldFile("uploads/aadhar_images/front", user.aadhar_front_image);
      deleteOldFile("uploads/aadhar_images/back", user.aadhar_back_image);

      user.aadhar_front_image = aadharFront[0].filename;
      user.aadhar_back_image = aadharBack[0].filename;
      user.is_valid_adhar = 0;
    }

    const updatedUser = await user.save();

    /* ================= HIDE SENSITIVE DATA ================= */
    const responseUser = updatedUser.toObject();
    delete responseUser.password;
    delete responseUser.pan_number;
    delete responseUser.aadhar_number;

    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully. Documents are under verification.",
      data: responseUser
    });

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message
    });
  }
};


export const getMyProfile = async (req, res) => {
  try {
    const user = req.user; // 👈 from verifyCustomToken

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized. Please log in.",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const userObj = user.toObject();

    /* ================= PROFILE IMAGE ================= */
    if (userObj.profile_image) {
      userObj.profile_image = `${baseUrl}/uploads/profile_images/${userObj.profile_image}`;
    }

    /* ================= PAN IMAGE ================= */
    if (userObj.pan_image) {
      userObj.pan_image = `${baseUrl}/uploads/pan_images/${userObj.pan_image}`;
    }

    /* ================= AADHAAR IMAGES ================= */
    if (userObj.aadhar_front_image) {
      userObj.aadhar_front_image = `${baseUrl}/uploads/aadhar_images/front/${userObj.aadhar_front_image}`;
    }

    if (userObj.aadhar_back_image) {
      userObj.aadhar_back_image = `${baseUrl}/uploads/aadhar_images/back/${userObj.aadhar_back_image}`;
    }

    /* ================= HIDE SENSITIVE ================= */
    delete userObj.password;
    delete userObj.token;
    // delete userObj.aadhar_number;
    // delete userObj.pan_number;

    return res.status(200).json({
      status: "success",
      message: "Profile details retrieved successfully.",
      data: userObj,
    });

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
