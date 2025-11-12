import express from 'express';
import authRoute from '../auth/index.js';   
import packageRoute from '../package/index.js';
import packagGetRoute from '../package/index.js';
import packageDeleteRoute from '../package/index.js';
import deliveryRoute from '../delivery-service/index.js';   
import deliveryGetRoute from '../delivery-service/index.js';
import deliveryDeleteRoute from '../delivery-service/index.js';   
import verifyCustomToken from "../../middlewares/authAdmin.js";
import chatRoutes from '../chats/index.js';
import notificationRoutes from '../notification/index.js';   
import bookingRoute from '../booking/index.js';   

const router = express.Router();

// mount auth routes at /auth
router.use('/auth', authRoute);
router.use('/publish',verifyCustomToken, packageRoute);
router.use('/publish',verifyCustomToken, deliveryRoute);
router.use('/search',verifyCustomToken, deliveryGetRoute);
router.use('/service',verifyCustomToken, deliveryDeleteRoute);
router.use('/search/package', verifyCustomToken, packagGetRoute);
router.use('/package', verifyCustomToken, packageDeleteRoute);
router.use('/chat', verifyCustomToken, chatRoutes);
router.use('/notification', verifyCustomToken, notificationRoutes);
router.use('/booking', verifyCustomToken, bookingRoute);
router.use('/publications', verifyCustomToken, bookingRoute);



export default router;
