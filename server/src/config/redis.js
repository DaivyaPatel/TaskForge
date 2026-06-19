import Redis from 'ioredis';
import { env } from './env.js';

// Create a singleton Redis client to use across the app
export const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_PASSWORD ? {} : undefined,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));