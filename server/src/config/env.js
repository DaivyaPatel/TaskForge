import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  CLIENT_ORIGIN: z.string().url(),
  TOTP_ISSUER: z.string().default('TaskForge'),
  
  // These can be optional until we build the email/media features
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const missingVars = Object.keys(parsedEnv.error.flatten().fieldErrors).join(', ');
  console.error(`[startup] Missing required env: ${missingVars} — exiting`);
  process.exit(1);
}

export const env = parsedEnv.data;