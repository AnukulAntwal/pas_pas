import express from 'express'
const router=express.Router()
import {savePackage} from '../../controller/packageController.js'

router.post('/savePackage',savePackage)

export default router;