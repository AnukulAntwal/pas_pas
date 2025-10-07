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
      status: 'fail',
      error: error.message,
    });
  }
};

export const getServiceDetails = async (req,res)=> {
  try{

    const service = await DeliveryService.find().populate({
      path:"uid",
      select:"first_name last_name email phone_number device_type device_token"
    }).sort({created: -1});

    if(!service || service.length == 0){
      return res.status(404).json({ status:'fail', message: "No service records found" });
    }

     return res.status(200).json({
      status:'success',
      message: "Service details fetched successfully",
      data: service,
    });

  }catch(error){ 

     return res.status(500).json({
      status: 'fail',
      message: "Error fetching service details",
      error: error.message,
    });
  }
}
