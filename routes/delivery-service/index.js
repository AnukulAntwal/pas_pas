import express from 'express'
const router=express.Router()
import {saveDeliveryService} from '../../controller/deliveryServiceController.js'

router.post('/saveDelivery',saveDeliveryService)

export default router;