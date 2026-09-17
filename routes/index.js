import routes from './api/index.js';   // ⚡ extension .js lagana mat bhoolna (ESM me required)
import express from 'express';
import cors from 'cors';

const router = express.Router();
// At the top, after other imports

// Add this before your routes
router.use(cors({
  origin: 'http://localhost:3000', // allow your frontend origin
  credentials: true                // if you use cookies/auth
}));
// sabhi api routes ko `/api` prefix ke saath mount kar rahe ho
router.use('/', routes);

export default router;
