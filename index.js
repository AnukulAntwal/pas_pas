import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import routes from './routes/index.js'
import { Server } from "socket.io";
import http from "http";
import initSocket from "./socketServer.js";

dotenv.config();
const app = express();
app.use(express.json());

// Routes
app.use("/api",routes);

mongoose.connect(process.env.MONGO_URL).then((r)=>{
  console.log("db connected");
      // HTTP server for socket
    const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  initSocket(io); // socket initialize

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((e)=>{
  console.log(e);
  
})

 

