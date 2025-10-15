import express from 'express'
const router=express.Router()
import {loginController} from '../../controller/auth.js'
import  {registerController} from '../../controller/auth.js'
import { upload } from "../../middlewares/upload.js";

router.post('/login',loginController)
router.post('/register',upload.single("profile_image"),registerController)

export default router;