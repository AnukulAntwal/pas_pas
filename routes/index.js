import routes from './api/index.js';   // ⚡ extension .js lagana mat bhoolna (ESM me required)
import express from 'express';

const router = express.Router();

// sabhi api routes ko `/api` prefix ke saath mount kar rahe ho
router.use('/', routes);

export default router;
