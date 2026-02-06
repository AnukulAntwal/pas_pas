import express from 'express'
const router=express.Router()
import { createSupportTicket, getAppVersion } from '../../controller/supportTicketController.js'
router.post('/support',createSupportTicket)
router.get('/version', getAppVersion)

export default router;
