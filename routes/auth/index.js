import express from 'express'
const router=express.Router()
import { loginController, resetPassword} from '../../controller/auth.js'
import  {registerController} from '../../controller/auth.js'
import { upload } from "../../middlewares/upload.js";
import resetPasswordRouter from "./forgot/index.js"
router.post('/login',loginController)
router.post('/register',upload.single("profile_image"),registerController)
router.use("/forgot-password", resetPasswordRouter);


export default router;