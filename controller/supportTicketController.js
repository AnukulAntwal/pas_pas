import SupportTicket from "../models/SupportTicket.js";
import AppVersion from "../models/AppVersion.js";
import moment from "moment";

export const createSupportTicket = async (req, res) => {
  try {
    const {
      type,
      subject,
      message,
      app_version,
      platform,
      device_info,
      user_name,
      user_email
    } = req.body;

    const user_id = req.user._id; // from auth middleware

    // 🔒 Validation
    if (!type || !message) {
      return res.status(400).json({
        status: "fail",
        message: "type and message are required",
        data: []
      });
    }

    const ticket = await SupportTicket.create({
      type,
      subject,
      message,
      app_version,
      platform,
      device_info,
      user_id,
      user_name,
      user_email
    });

    const responseMessages = {
      BUG: "We have received your bug report. Our technical team is reviewing the issue and will investigate it as soon as possible.",
      SUPPORT: "Thank you for contacting support. Our team has received your request and will assist you shortly.",
      FEEDBACK: "Thank you for your valuable feedback. We truly appreciate your input and will use it to improve our platform."
    };

    return res.status(200).json({
    status: "success",
    message: responseMessages[type],
    data: ticket
    });


  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
      data: []
    });
  }
};



export const getAppVersion = async (req, res) => {
  try {
    const versions = await AppVersion.find({}).lean();

    const data = {};

    versions.forEach(v => {
      data[v.platform] = {
        latest_version: v.latest_version,
        minimum_supported_version: v.minimum_supported_version,
        force_update: v.force_update,
        update_url: v.update_url,
        message: v.message,
        created_at: v.createdAt
        ? moment(v.createdAt).format("YYYY-MM-DD HH:mm:ss")
        : null,
        updated_at: v.updatedAt
        ? moment(v.updatedAt).format("YYYY-MM-DD HH:mm:ss")
        : null

      };
    });

    return res.status(200).json({
      status: "success",
      message: "App version details fetched successfully",
      data
    });

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
      data: {}
    });
  }
};

