import Package from "../models/PackageLocation.js";

export const savePackage = async (req, res) => {
  try {
    const {userId,pickup, drop, status ,description} = req.body;

    if (!pickup || !drop) {
      return res.status(400).json({ error: "pickup & drop are required" });
    }

    const newPackage = new Package({
      userId,
      pickup,
      drop,
      status,
      description
    });

    const savedPackage = await newPackage.save();

    res.status(201).json({
      success: "success",
      message: "Package saved successfully",
      data: savedPackage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
