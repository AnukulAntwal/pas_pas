import express from "express";
import { sendMessage,} from "../../controller/chatController.js";

const router = express.Router();

router.post("/send", sendMessage);
// router.get("/getChat", getConversations); // ✅ now using req.body instead of params

export default router;
