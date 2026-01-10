import express from 'express'
const router=express.Router()
import { getDashboardStats, getUserById, getUsers } from '../../controller/userController.js';
import verifyCustomToken from "../../middlewares/authAdmin.js";


router.get('/getUsers',verifyCustomToken,getUsers)
router.get('/getUserById/:id',verifyCustomToken,getUserById)
router.get('/getDashboardStats',verifyCustomToken,getDashboardStats)



export default router;