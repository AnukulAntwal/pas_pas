import express from "express";
import { bookOrCancel } from "../../controller/bookingController.js";

const router = express.Router();

router.post("/BookOrCancel", bookOrCancel);

export default router;