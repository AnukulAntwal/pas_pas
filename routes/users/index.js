import express from 'express'
const router=express.Router()
import {
  getDashboardStats,
  getAdminDashboardKPIs,
  getAdminDashboardEnterprise,
  getUserById,
  getUsers,
  verifyUser,
} from '../../controller/userController.js';
import { updateUser } from '../../controller/userController.js';
import { uploadDocs } from '../../middlewares/upload.js';
import verifyCustomToken from "../../middlewares/authAdmin.js";
import { getSupportTickets } from '../../controller/supportTicketController.js';


router.get('/getUsers', getUsers)
router.get('/getUserById/:id', getUserById)
router.get('/getDashboardStats', verifyCustomToken, getDashboardStats)
router.get('/dashboard/kpi', verifyCustomToken, getAdminDashboardKPIs)
router.get('/dashboard/enterprise', verifyCustomToken, getAdminDashboardEnterprise)
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
router.put("/verifyUser/:id", verifyUser);
router.get("/support",verifyCustomToken,getSupportTickets)


export default router;