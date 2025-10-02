import DeliveryService from "../models/DeliveryService.js";

export const saveDeliveryService = async (req, res) => {
  try {
    const newService = new DeliveryService(req.body);
    const savedService = await newService.save();

    res.status(201).json({
      status: 'success',
      message: "Your service has been successfully published",
      data: savedService,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};
