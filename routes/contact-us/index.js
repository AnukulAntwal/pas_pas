import express from "express";
import { saveContact, getContacts } from "../../controller/contactController.js";
const router = express.Router();
router.post("/save",saveContact );
router.get('/getContacts', getContacts);
export default router;  
