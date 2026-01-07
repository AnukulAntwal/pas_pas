import User from "../models/User.js";

export default async function verifyCustomToken(req, res, next) {
  let token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({
      status: "fail",
      message:"Unauthorized access. Login required",
      auth:false,
    });
  }

  // Extract token from "Bearer <token>"
  if (token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
  }

  // Find user with this token
  const user = await User.findOne({ token });

  if (!user) {
    return res.status(401).json({
      status: "fail",
      message:"Invalid or expired token",
      auth:false,
    });
  }

  // Attach user to request
  req.user = user;

  next();
}
