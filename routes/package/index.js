import express from 'express'
const router=express.Router()
import {savePackage} from '../../controller/packageController.js'

router.post('/save',savePackage)

export default router;