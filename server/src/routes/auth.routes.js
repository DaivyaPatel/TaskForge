import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { 
  register, verifyEmail, login, refreshToken, logout, 
  forgotPassword, resetPassword, getSessions, revokeSession, revokeAllSessions,
  setupTOTP, verifyTOTPSetup, disableTOTP // <-- Imported disableTOTP
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { 
  loginLimiter, 
  registerLimiter, 
  forgotPasswordLimiter 
} from '../middleware/rateLimiter.js';

const router = Router();

// --- 1. Schemas ---
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().length(6).optional()
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  password: z.string().min(8)
});

const verifyTotpSchema = z.object({
  token: z.string().length(6, "Code must be exactly 6 digits")
});

// --- NEW: Schema for disabling TOTP ---
const disableTotpSchema = z.object({
  password: z.string().min(1, "Password is required to disable 2FA")
});

// --- 2. Public Routes (with Rate Limiters) ---
router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);

// --- 3. Public Routes (No extra limits needed) ---
router.post('/verify-email/:token', verifyEmail);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);

// --- 4. Protected Routes (Requires Login) ---
router.get('/sessions', requireAuth, getSessions);
router.delete('/sessions', requireAuth, revokeAllSessions);
router.delete('/sessions/:sessionId', requireAuth, revokeSession);

// --- 5. TOTP Routes ---
router.post('/totp/setup', requireAuth, setupTOTP);
router.post('/totp/verify', requireAuth, validate(verifyTotpSchema), verifyTOTPSetup);
router.post('/totp/disable', requireAuth, validate(disableTotpSchema), disableTOTP); // <-- New route

// --- 6. Export ---
export default router;