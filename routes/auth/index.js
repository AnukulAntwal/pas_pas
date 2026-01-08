import express from 'express'
const router=express.Router()
import { editProfile, getMyProfile,loginController, resetPassword} from '../../controller/auth.js'
import  {registerController} from '../../controller/auth.js'
import { uploadDocs } from "../../middlewares/upload.js";
import resetPasswordRouter from "./forgot/index.js"
import verifyCustomToken from "../../middlewares/authAdmin.js";

router.post('/login',loginController)
router.post('/register',uploadDocs.single("profile_image"),registerController)
router.use("/forgot-password", resetPasswordRouter);
// router.put("/edit-profile",verifyCustomToken,upload.single("profile_image"),editProfile);
router.put(
  "/edit-profile",
  verifyCustomToken,
  uploadDocs.fields([
    { name: "profile_image", maxCount: 1 },
    { name: "pan_image", maxCount: 1 },
    { name: "aadhar_front_image", maxCount: 1 },
    { name: "aadhar_back_image", maxCount: 1 },
  ]),
  editProfile
);

router.get('/getUserDetails',verifyCustomToken,getMyProfile);

export default router;