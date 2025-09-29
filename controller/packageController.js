import Package from "../models/Package.js";

export const savePackage = async (req, res) => {
  try {
    const newPackage = new Package(req.body);
    const savedPackage = await newPackage.save();

    res.status(201).json({
      success: true,
      message: "Package saved successfully",
      data: savedPackage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
