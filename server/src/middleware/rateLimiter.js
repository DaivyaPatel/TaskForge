import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';

// Helper to create limiters with standard formatting
const createLimiter = (windowMs, max, keyGenerator) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator, // Optional custom key (like email or user ID)
    handler: (req, res, next, options) => {
      // Return 429 status with the requested JSON format
      res.status(options.statusCode).json({ 
        error: "Too many requests",
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

// 1. Login: 10 requests per IP per 15 minutes
export const loginLimiter = createLimiter(15 * 60 * 1000, 10);

// 2. Register: 5 requests per IP per hour
export const registerLimiter = createLimiter(60 * 60 * 1000, 5);

// 3. Forgot Password: 3 requests per email per hour
export const forgotPasswordLimiter = createLimiter(
  60 * 60 * 1000, 
  3, 
  (req) => req.body.email || req.ip // Limit by email if present, otherwise fallback to IP
);

// 4. General API: 200 requests per user per minute
export const apiLimiter = createLimiter(
  60 * 1000, 
  200, 
  (req) => req.user?.id || req.ip // Limit by user ID if authenticated, otherwise IP
);