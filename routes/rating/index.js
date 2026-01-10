import express from 'express'
import { getUserRatingSummary, getUserReviews, rateDelivery } from '../../controller/ratingController.js';
const router=express.Router()
router.post("/rate-delivery", rateDelivery);
router.get('/getUserRatingSummary/:userId', getUserRatingSummary);
router.get('/getUserReviews/:userId', getUserReviews);

export default router;

