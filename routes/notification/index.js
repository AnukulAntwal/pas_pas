import express from "express";
import {getNotifications, sendMessageNotification} from "../../controller/notificationController.js";

const router = express.Router();

router.post("/save", sendMessageNotification);
router.get("/getNotification", getNotifications);





export default router;
