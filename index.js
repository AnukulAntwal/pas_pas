import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import routes from "./routes/index.js";
import { Server } from "socket.io";
import http from "http";
import initSocket from "./socketServer.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
// Routes
app.use("/api", routes);

// Connect to DB
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB connected");

    // Create HTTP server for both Express + Socket
    const server = http.createServer(app);

    // Attach socket.io
    const io = new Server(server, {
      cors: { origin: "*" },
    });

    // Initialize socket logic
    initSocket(io);

    // ✅ Listen using `server`, not `app`
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () =>
      console.log(`🚀 Server & Socket running on port ${PORT}`)
    );
  })
  .catch((err) => console.error("❌ MongoDB connection failed:", err));
