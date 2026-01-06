import User from "../models/User.js";
import { loginValidate, registerValidate } from "../validations/userValidate.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";

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
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Step 3: Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Step 4: Generate random token (32 bytes = 64-char hex string)
    const token = crypto.randomBytes(32).toString("hex");

    // Step 5: Update user record
    user.device_type = device_type;
    user.device_token = device_token;
    user.last_login = new Date();
    user.token = token; // ✅ save random token

    const userSave = await user.save();

    // Step 6: Respond with token
    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: userSave,
    });
  } catch (e) {
    return res.status(500).json({ status: "fail", error: e.message });
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

export const editProfile = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        status: "fail",
        message: "User ID is required to proceed",
        data: [],
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "We couldn’t find this user. Please try again.",
        data: [],
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
      pincode,
    } = req.body;

    // 📧 Email uniqueness check
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(409).json({
          status: "fail",
          message: "This email address is already in use.",
        });
      }
      user.email = email;
    }

    // 📞 Phone uniqueness check
    if (phone_number && phone_number !== user.phone_number) {
      const phoneExists = await User.findOne({ phone_number });
      if (phoneExists) {
        return res.status(409).json({
          status: "fail",
          message: "This phone number is already in use.",
        });
      }
      user.phone_number = phone_number;
    }

    // 🆔 Aadhaar uniqueness check
    if (aadhar_number && aadhar_number !== user.aadhar_number) {
      const adharExists = await User.findOne({ aadhar_number });
      if (adharExists) {
        return res.status(409).json({
          status: "fail",
          message: "This Aadhaar number is already in use.",
        });
      }
      user.aadhar_number = aadhar_number;
    }

    // 🪪 PAN uniqueness check
    if (pan_number && pan_number !== user.pan_number) {
      const panExists = await User.findOne({ pan_number });
      if (panExists) {
        return res.status(409).json({
          status: "fail",
          message: "This PAN number is already in use.",
        });
      }
      user.pan_number = pan_number;
      user.is_valid_pan = 0;
    }

    // ✏️ Other fields
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (address) user.address = address;
    if (city) user.city = city;
    if (state) user.state = state;
    if (pincode) user.pincode = pincode;

    // 🖼️ Profile image
    if (req.file) {
      if (user.profile_image) {
        const oldPath = `uploads/profile_images/${user.profile_image}`;
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.profile_image = req.file.filename;
    }

    const updatedUser = await user.save();

    // 🔒 Hide sensitive data
    updatedUser.password = undefined;
    updatedUser.adhar_number = undefined;
    updatedUser.pan_number = undefined;

    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: updatedUser,
    });

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};


export const getUserById = async (req, res) => {
  try {
    const { userId } = req.query; // OR req.params.userId

    if (!userId) {
      return res.status(400).json({
        status: "fail",
        message: "userId is required",
      });
    }

    const user = await User.findById(userId).select("-password");;
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    if (user?.profile_image) {
      user.profile_image = `${baseUrl}/uploads/profile_images/${user.profile_image}`;
    }

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User details fetched successfully",
      data: user,
    });

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};