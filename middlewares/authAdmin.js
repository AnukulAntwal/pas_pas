import User from "../models/User.js";

export default async function verifyCustomToken(req, res, next) {
  try {
    let token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized access. Please log in.",
        auth: false,
      });
    }

    // Remove Bearer
    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    const user = await User.findOne({ token });

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "You’ve been signed out. Please sign in again to continue.",
        auth: false,
      });
    }

    req.user = user; // logged-in user
    next();

  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: "Authentication failed. Please try again.",
      auth: false

    });
  }
}
