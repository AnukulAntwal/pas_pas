import express from "express";
import { bookOrCancel, getMyBookings, getMyPublished, updateDeliveryService, updatePackage } from "../../controller/bookingController.js";

const router = express.Router();

router.post("/BookOrCancel", bookOrCancel);
router.get("/getMyBookings", getMyBookings);
router.get("/getMyPublications", getMyPublished);
router.post('/editUpdatePackage',updatePackage)
router.post('/editUpdateService',updateDeliveryService)


export default router;