import express from "express";
import { bookOrCancel, getMyBookings } from "../../controller/bookingController.js";

const router = express.Router();

router.post("/BookOrCancel", bookOrCancel);
router.get("/getMyBookings", getMyBookings);

export default router;