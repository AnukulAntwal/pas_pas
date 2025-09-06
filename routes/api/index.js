import express from 'express';
import authRoute from '../auth/index.js';   

const router = express.Router();

// mount auth routes at /auth
router.use('/auth', authRoute);

export default router;
