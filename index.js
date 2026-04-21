import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import routes from "./routes/index.js";
import { Server } from "socket.io";
import http from "http";
import initSocket from "./socketServer.js";
import path from "path";
import { fileURLToPath } from "url";
import "./cron/deliveryCron.js"; // 👈 THIS LINE IS MUST
import "./cron/packageCron.js"; // 👈 THIS LINE IS MUST
import "./cron/verifyUsersCron.js" // 👈 THIS LINE IS MUST
import appVersion from './routes/app/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api", routes);
app.use('/app',  appVersion);

app.get("/terms", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "terms.html"));
});

app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy.html"));
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");

    // Create HTTP server (for both Express + Socket.IO)
    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = new Server(server, {
      cors: { origin: "*" },
    });
    initSocket(io);
    console.log("🌐 HOST:", req.headers.host);
    console.log("📦 DB URI:", process.env.MONGO_URI);
    console.log("🗄️ DB NAME:", mongoose.connection.name);
    // Start server
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Server & Socket running on port ${PORT}`)
    );

  })
  .catch((err) => console.error("❌ MongoDB connection failed:", err));
