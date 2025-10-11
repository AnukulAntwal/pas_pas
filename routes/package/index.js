import express from 'express'
const router=express.Router()
import {savePackage} from '../../controller/packageController.js'
import {getPackages} from '../../controller/packageController.js'


router.post('/packageDetails',savePackage)
router.get('/getPackages',getPackages)


export default router;