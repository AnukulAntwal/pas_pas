// controllers/contactController.js
import ContactUs from "../models/ContactUs.js";

export const saveContact = async (req, res) => {
  try {
    const { full_name, email, subject, message } = req.body;

    // validation
    if (!full_name || !email || !message) {
      return res.status(400).json({
        status: "fail",
        message: "Required fields missing"
      });
    }

    const newContact = await ContactUs.create({
      full_name,
      email,
      subject,
      message
    });

    res.status(201).json({
      status: "success",
      message: "Form submitted successfully",
      data: newContact
    });

  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};