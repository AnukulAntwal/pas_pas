import DeliveryService from "../models/DeliveryService.js";

export const saveDeliveryService = async (req, res) => {
  try {
    const newService = new DeliveryService(req.body);
    const savedService = await newService.save();

    res.status(201).json({
      success: 'success',
      message: "Delivery service saved successfully",
      data: savedService,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
