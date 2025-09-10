export default function verifyCustomToken(req, res, next) {
  let token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ error: "No token provided" });
  }

  // Agar "Bearer ..." format hai to split kar lo
  if (token.startsWith("Bearer ")) {
    token = token.slice(7).trim(); // sirf token part nikalo
  }

  if (token !== process.env.X_API_TOKEN) {
    return res.status(401).json({ error: "Invalid token" });
  }

  next();
}
