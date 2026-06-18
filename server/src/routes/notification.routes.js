import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../controllers/notification.controller.js';

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

router.get('/', asyncHandler(getNotifications));

// WARNING: /read-all must be defined BEFORE /:id/read, otherwise Express thinks "read-all" is an ID!
router.post('/read-all', asyncHandler(markAllAsRead));
router.post('/:id/read', asyncHandler(markAsRead));

export default router;