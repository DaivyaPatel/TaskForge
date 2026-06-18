import Redis from 'ioredis';
import { env } from './env.js';

// Create a singleton Redis client to use across the app
export const redisClient = new Redis(env.REDIS_URL);

redisClient.on('error', (err) => console.error('Redis Client Error', err));