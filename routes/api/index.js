import express from 'express';
import authRoute from '../auth/index.js';   
import packageRoute from '../package/index.js';
import packagGetRoute from '../package/index.js';
import deliveryRoute from '../delivery-service/index.js';   
import deliveryGetRoute from '../delivery-service/index.js';   
import verifyCustomToken from "../../middlewares/authAdmin.js";
import chatRoutes from '../chats/index.js';   

const router = express.Router();

// mount auth routes at /auth
router.use('/auth', verifyCustomToken, authRoute);
router.use('/publish',verifyCustomToken, packageRoute);
router.use('/publish',verifyCustomToken, deliveryRoute);
router.use('/search',verifyCustomToken, deliveryGetRoute);
router.use('/search/package', verifyCustomToken, packagGetRoute);
router.use('/chat', verifyCustomToken, chatRoutes);

export default router;
