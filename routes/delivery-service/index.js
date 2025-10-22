import express from 'express'
const router=express.Router()
import {saveDeliveryService} from '../../controller/deliveryServiceController.js'
import {getServices,deleteDeliveryService} from '../../controller/deliveryServiceController.js'

router.post('/serviceDetails',saveDeliveryService)
router.get('/getServices',getServices)
router.delete('/delete',deleteDeliveryService)
export default router;