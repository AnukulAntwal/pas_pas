import express from "express";
import sequelize from "./config/db.js";
import User from "./models/User.js";
import authRoutes from "./routes/auth.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// DB connection
sequelize
  .sync() // table create karega agar exist nahi hai
  .then(() => {
    console.log("✅ Database connected & tables synced");
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.log("❌ DB Error: ", err));
