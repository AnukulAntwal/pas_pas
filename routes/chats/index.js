import express from "express";
import { sendMessage, getChatHistory } from "../../controller/chatController.js";

const router = express.Router();

router.post("/send", sendMessage);
router.get("/getChat", getChatHistory); // ✅ now using req.body instead of params

export default router;
