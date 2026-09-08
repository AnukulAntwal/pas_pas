import express from 'express'
const router=express.Router()
import { getAppVersion } from '../../controller/supportTicketController.js'
router.get('/version', getAppVersion)
export default router;
