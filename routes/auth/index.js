import express from 'express'
const router=express.Router()
import { editProfile, getMyProfile,loginController, resetPassword} from '../../controller/auth.js'
import  {registerController} from '../../controller/auth.js'
import { upload } from "../../middlewares/upload.js";
import resetPasswordRouter from "./forgot/index.js"
import verifyCustomToken from "../../middlewares/authAdmin.js";

router.post('/login',loginController)
router.post('/register',upload.single("profile_image"),registerController)
router.use("/forgot-password", resetPasswordRouter);
router.put("/edit-profile",verifyCustomToken,upload.single("profile_image"),editProfile);
router.get('/getUserDetails',verifyCustomToken,getMyProfile);

export default router;