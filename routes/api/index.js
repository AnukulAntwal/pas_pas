import express from 'express';
import authRoute from '../auth/index.js';   
import verifyCustomToken from "../../middlewares/authAdmin.js";

const router = express.Router();

// mount auth routes at /auth
router.use('/auth', verifyCustomToken, authRoute);

export default router;
