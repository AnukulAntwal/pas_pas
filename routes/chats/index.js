import express from "express";
import { sendMessage,getConversationList,getMessages} from "../../controller/chatController.js";

const router = express.Router();

router.post("/send", sendMessage);
// router.get("/getChat", getConversations); // ✅ now using req.body instead of params
router.post("/getList", getConversationList);
router.post("/conversation", getMessages);



export default router;
