import express from "express";
import { bookServiceOrPackage, cancelBookingByReference, completedTransportOrParcel, deleteParcelOrDeliveryService, getMyBookings, getMyPublished, updateDeliveryService, updatePackage } from "../../controller/bookingController.js";

const router = express.Router();

router.post("/transportOrParcel", bookServiceOrPackage);
router.post("/cancelTransportOrParcel", cancelBookingByReference);
router.get("/completedTransportOrParcel", completedTransportOrParcel);

router.get("/getMyBookings", getMyBookings);
router.get("/getMyPublications", getMyPublished);
router.post('/editUpdatePackage',updatePackage)
router.post('/editUpdateService',updateDeliveryService)
router.delete('/deletePackageOrTransport',deleteParcelOrDeliveryService)

export default router;  