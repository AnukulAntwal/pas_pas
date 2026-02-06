import SupportTicket from "../models/SupportTicket.js";
import AppVersion from "../models/AppVersion.js";

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
    const { platform } = req.query;

    if (!platform) {
      return res.status(400).json({
        status: "fail",
        message: "platform is required",
        data: []
      });
    }

    const version = await AppVersion.findOne({
      platform: platform.toUpperCase()
    }).lean();

    if (!version) {
      return res.status(200).json({
        status: "success",
        data: null
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        latest_version: version.latest_version,
        minimum_supported_version: version.minimum_supported_version,
        force_update: version.force_update,
        update_url: version.update_url,
        message: version.message
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error.message,
      data: []
    });
  }
};
