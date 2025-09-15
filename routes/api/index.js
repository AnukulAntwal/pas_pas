import express from 'express';
import authRoute from '../auth/index.js';   
import packageRoute from '../package/index.js';   
import verifyCustomToken from "../../middlewares/authAdmin.js";

const router = express.Router();

// mount auth routes at /auth
router.use('/auth', verifyCustomToken, authRoute);
router.use('/package',verifyCustomToken, packageRoute);

export default router;
