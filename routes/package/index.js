import express from 'express'
const router=express.Router()
import {deletePackage, savePackage,getPackages} from '../../controller/packageController.js'
// import {getPackages} from '../../controller/packageController.js'

router.post('/packageDetails',savePackage)
router.get('/getPackages',getPackages)
router.delete('/delete',deletePackage)



export default router;