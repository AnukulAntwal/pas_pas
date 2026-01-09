import User from "../models/User.js";
export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
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

export const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
