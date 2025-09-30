import express from 'express'
const router=express.Router()
import {savePackage} from '../../controller/packageController.js'

router.post('/packageDetails',savePackage)

export default router;