import express from 'express'
const router=express.Router()
import {saveDeliveryService} from '../../controller/deliveryServiceController.js'

router.post('/serviceDetails',saveDeliveryService)

export default router;