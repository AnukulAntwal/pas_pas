import express from 'express'
const router=express.Router()
import {getDeliveryServiceDetails, saveDeliveryService, updateDeliveryService} from '../../controller/deliveryServiceController.js'
import {getServices,deleteDeliveryService} from '../../controller/deliveryServiceController.js'

router.post('/serviceDetails',saveDeliveryService)
router.get('/getServices',getServices)
router.delete('/delete',deleteDeliveryService)
router.get('/getDeliveryServiceDetails',getDeliveryServiceDetails)
router.post('/updateDeliveryService',updateDeliveryService)

export default router;