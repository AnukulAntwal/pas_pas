import express from "express";
import { sendMessage,getConversationList,getMessages, markMessagesAsRead, deleteMessage} from "../../controller/chatController.js";

const router = express.Router();

router.post("/send", sendMessage);
// router.get("/getChat", getConversations); // ✅ now using req.body instead of params
router.post("/getList", getConversationList);
router.post("/conversation", getMessages);
router.post("/markAsRead", markMessagesAsRead);
router.post("/delete", deleteMessage);





export default router;
