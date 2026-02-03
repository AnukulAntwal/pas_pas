import express from 'express'
const router=express.Router()
import { createSupportTicket } from '../../controller/supportTicketController.js'
router.post('/support',createSupportTicket)
export default router;
