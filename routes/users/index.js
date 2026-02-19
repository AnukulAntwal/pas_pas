import express from 'express'
const router=express.Router()
import { getDashboardStats, getUserById, getUsers } from '../../controller/userController.js';
import { updateUser } from '../../controller/userController.js';
import { uploadDocs } from '../../middlewares/upload.js';
import verifyCustomToken from "../../middlewares/authAdmin.js";


router.get('/getUsers',getUsers)
router.get('/getUserById/:id',getUserById)
router.get('/getDashboardStats',getDashboardStats)
router.put(
	'/updateUser/:id'	,
	uploadDocs.fields([
		{ name: 'profile_image', maxCount: 1 },
		{ name: 'pan_image', maxCount: 1 },
		{ name: 'aadhar_front_image', maxCount: 1 },
		{ name: 'aadhar_back_image', maxCount: 1 },
	]),
	updateUser
)



export default router;