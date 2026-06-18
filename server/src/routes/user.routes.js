import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { 
  updateProfile, 
  changePassword, 
  deleteAccount 
} from '../controllers/user.controller.js';

const router = Router();

// --- Multer Configuration for Avatar Uploads ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit for avatars
  }
});

// --- Validation Schemas ---
const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
  email: z.string().email("Valid email is required")
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long")
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to confirm deletion")
});

// --- Routes ---
// All user profile routes require authentication
router.use(requireAuth);

// Profile Updates (handles multipart/form-data for the avatar file)
router.put(
  '/me', 
  upload.single('avatar'), 
  validate(updateProfileSchema), 
  asyncHandler(updateProfile)
);

// Password Management
router.put(
  '/me/password', 
  validate(changePasswordSchema), 
  asyncHandler(changePassword)
);

// Account Deletion
router.delete(
  '/me', 
  validate(deleteAccountSchema), 
  asyncHandler(deleteAccount)
);

export default router;