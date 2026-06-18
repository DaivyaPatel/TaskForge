import { Router } from 'express';
import { checkHealth } from '../controllers/health.controller.js';

const router = Router();

// Endpoint: GET /health
router.get('/', checkHealth);

export default router;