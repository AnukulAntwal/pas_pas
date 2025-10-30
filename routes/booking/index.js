import express from "express";
import { bookOrCancel, getMyBookings, getMyPublished } from "../../controller/bookingController.js";

const router = express.Router();

router.post("/BookOrCancel", bookOrCancel);
router.get("/getMyBookings", getMyBookings);
router.get("/getMyPublications", getMyPublished);

export default router;