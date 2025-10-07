import express from 'express'
const router=express.Router()
import {saveDeliveryService} from '../../controller/deliveryServiceController.js'
import {getServiceDetails} from '../../controller/deliveryServiceController.js'

router.post('/serviceDetails',saveDeliveryService)
router.get('/getServices',getServiceDetails)

export default router;