import express from 'express';
import authRoute from '../auth/index.js';   
import packageRoute from '../package/index.js';   
import deliveryRoute from '../delivery-service/index.js';   
import verifyCustomToken from "../../middlewares/authAdmin.js";

const router = express.Router();

// mount auth routes at /auth
router.use('/auth', verifyCustomToken, authRoute);
router.use('/package',verifyCustomToken, packageRoute);
router.use('/delivery',verifyCustomToken, deliveryRoute);

export default router;
