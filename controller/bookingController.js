// controllers/bookingController.js
import User from "../models/User.js";  // <-- add this
import Package from "../models/Package.js";
import DeliveryService from "../models/DeliveryService.js";

export const bookOrCancel = async (req, res) => {
  try {
    const { reference_id, user_id, type, action } = req.body;
    // action => "book" | "cancel"
    // type => "package" | "service"

    if (!reference_id || !user_id || !type || !action) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields (reference_id, user_id, type, action)",
        data:[]
      });
    }

    // Pick model based on type
    let Model;
    if (type === "package") Model = Package;
    else if (type === "service") Model = DeliveryService;
    else {
      return res.status(400).json({
        status: "fail",
        message: "Invalid type (must be package or service)",
        data:[]
      });
    }

    // Fetch reference record
    const record = await Model.findById(reference_id);
    if (!record) {
      return res.status(404).json({
        status: "success",
        message: `${type} not found`,
        data:[]
      });
    }

    // Booking logic
    if (action === "book") {
      if (record.is_available === "acquired") {
        return res.status(400).json({
          status: "fail",
          message: "Already booked by another user",
          data:[]
        });
      }

      record.booking_type = "book";
      record.is_available = "acquired";
      record.booked_by = user_id;
    }

    if (action === "cancel") {
      if (record.booked_by?.toString() !== user_id.toString()) {
        return res.status(403).json({
          status: "fail",
          message: "You can only cancel your own booking",
          data:[]
        });
      }

      record.booking_type = "cancel";
      record.is_available = "yes";
      record.booked_by = null;
    }

    await record.save();

    // Fetch user details (booked_by)
    const user = await User.findById(user_id)
      .select("first_name last_name phone_number")
      .lean();

    // Fetch reference details with selected fields
    const referenceDetails = await Model.findById(reference_id)
      .select(
        type === "service"
          ? "start_location end_location date_time price"
          : "pickup_address delivery_address package_type weight price"
      )
      .lean();

    // Response
    return res.status(200).json({
      status: "success",
      message:
        action === "book"
          ? `${type} booked successfully`
          : `${type} booking canceled successfully`,
      data: {
        reference_id: record._id,
        type,
        booking_type: record.booking_type,
        is_available: record.is_available,
        booked_by: user || null,
        reference_details: referenceDetails || null,
      },
    });
  } catch (error) {
    console.error("Booking error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message,
      data:[]
    });
  }
};