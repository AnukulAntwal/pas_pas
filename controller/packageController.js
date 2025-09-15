import Package from "../models/PackageLocation.js";

// ✅ Save new package
export const savePackage = async (req, res) => {
  try {
    const {userId,pickup, drop, status } = req.body;

    if (!pickup || !drop) {
      return res.status(400).json({ error: "userId, pickup & drop are required" });
    }

    const newPackage = new Package({
      userId:'68c807645e95684d540b3817',
      pickup,
      drop,
      status
    });

    const savedPackage = await newPackage.save();

    res.status(201).json({
      success: true,
      message: "Package saved successfully",
      data: savedPackage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
