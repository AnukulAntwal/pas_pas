import DeliveryService from "../models/DeliveryService.js";

export const saveDeliveryService = async (req, res) => {
  try {
    const newService = new DeliveryService(req.body);
    const savedService = await newService.save();

    res.status(201).json({
      success: 'success',
      message: "Your service has been successfully published",
      data: savedService,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
