import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import routes from './routes/index.js'

dotenv.config();
const app = express();
app.use(express.json());

// Routes
app.use("/api",routes);

mongoose.connect(process.env.MONGO_URL).then((r)=>{
  console.log("db connected");
  
  app.listen(process.env.PORT,()=>console.log("server started"))
}).catch((e)=>{
  console.log(e);
  
})

 

