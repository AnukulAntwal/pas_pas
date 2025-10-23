import express from 'express'
const router=express.Router()
import {forgotPassword, loginController, resetPassword} from '../../controller/auth.js'
import  {registerController} from '../../controller/auth.js'
import { upload } from "../../middlewares/upload.js";

router.post('/login',loginController)
router.post('/register',upload.single("profile_image"),registerController)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;