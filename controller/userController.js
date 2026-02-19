import User from "../models/User.js";
import path from "path";
import { deleteOldFile } from "../utils/deleteOldFile.js";
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    ;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const processedUsers = users.map((user) => {
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

      return userObj;
    });

    res.status(200).json({
        status: true,
        message: "Users fetched successfully",
        data: processedUsers
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const userObj = user.toObject();

    if (userObj.profile_image) {
      userObj.profile_image = `${baseUrl}/uploads/profile_images/${userObj.profile_image}`;
    }
    if (userObj.pan_image) {
      userObj.pan_image = `${baseUrl}/uploads/pan_images/${userObj.pan_image}`;
    }
    if (userObj.aadhar_front_image) {
      userObj.aadhar_front_image = `${baseUrl}/uploads/aadhar_images/front/${userObj.aadhar_front_image}`;
    }
    if (userObj.aadhar_back_image) {
      userObj.aadhar_back_image = `${baseUrl}/uploads/aadhar_images/back/${userObj.aadhar_back_image}`;
    }

    res.status(200).json({
      status: true,
      data: userObj
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server Error", error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    // Count promises (run in parallel)
    const totalUsersPromise = User.countDocuments({});
    const activeUsersPromise = User.countDocuments({ is_blocked: 0 });

    // Pending verifications: either aadhar or pan not validated (value 0)
    const pendingVerificationsPromise = User.countDocuments({
      $or: [{ is_valid_adhar: 0 }, { is_valid_pan: 0 }]
    });

    // New users today (server local timezone)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const newUsersTodayPromise = User.countDocuments({ createdAt: { $gte: startOfDay } });

    const [totalUsers, activeUsers, pendingVerifications, newUsersToday] = await Promise.all([
      totalUsersPromise,
      activeUsersPromise,
      pendingVerificationsPromise,
      newUsersTodayPromise,
    ]);

    return res.status(200).json({
      success: true,
      data: { totalUsers, activeUsers, pendingVerifications, newUsersToday },
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });

    // Allowed fields to update
    const allowed = [
      "first_name",
      "last_name",
      "phone_number",
      "email",
      "pincode",
      "city",
      "state",
      "address",
      "aadhar_number",
      "pan_number",
      "is_valid_adhar",
      "is_valid_pan",
      "is_blocked",
    ];

    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        user[key] = req.body[key];
      }
    });

    // Handle uploaded files (if any)
    if (req.files) {
      const files = req.files;

      if (files.profile_image && files.profile_image.length > 0) {
        deleteOldFile(path.join(process.cwd(), "uploads", "profile_images"), user.profile_image);
        user.profile_image = files.profile_image[0].filename;
      }

      if (files.pan_image && files.pan_image.length > 0) {
        deleteOldFile(path.join(process.cwd(), "uploads", "pan_images"), user.pan_image);
        user.pan_image = files.pan_image[0].filename;
      }

      if (files.aadhar_front_image && files.aadhar_front_image.length > 0) {
        deleteOldFile(path.join(process.cwd(), "uploads", "aadhar_images", "front"), user.aadhar_front_image);
        user.aadhar_front_image = files.aadhar_front_image[0].filename;
      }

      if (files.aadhar_back_image && files.aadhar_back_image.length > 0) {
        deleteOldFile(path.join(process.cwd(), "uploads", "aadhar_images", "back"), user.aadhar_back_image);
        user.aadhar_back_image = files.aadhar_back_image[0].filename;
      }
    }

    await user.save();

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const userObj = user.toObject();

    if (userObj.profile_image) {
      userObj.profile_image = `${baseUrl}/uploads/profile_images/${userObj.profile_image}`;
    }
    if (userObj.pan_image) {
      userObj.pan_image = `${baseUrl}/uploads/pan_images/${userObj.pan_image}`;
    }
    if (userObj.aadhar_front_image) {
      userObj.aadhar_front_image = `${baseUrl}/uploads/aadhar_images/front/${userObj.aadhar_front_image}`;
    }
    if (userObj.aadhar_back_image) {
      userObj.aadhar_back_image = `${baseUrl}/uploads/aadhar_images/back/${userObj.aadhar_back_image}`;
    }

    return res.status(200).json({ status: true, message: "User updated successfully", data: userObj });
  } catch (error) {
    console.error("updateUser error:", error);
    return res.status(500).json({ status: false, message: "Server Error", error: error.message });
  }
};