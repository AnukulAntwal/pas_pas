import express from 'express'
const router=express.Router()
import {saveDeliveryService} from '../../controller/deliveryServiceController.js'
import {getServices} from '../../controller/deliveryServiceController.js'

router.post('/serviceDetails',saveDeliveryService)
router.get('/getServices',getServices)

export default router;