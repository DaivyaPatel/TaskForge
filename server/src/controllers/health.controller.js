import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis'; // ioredis is already installed as a dependency of BullMQ

const prisma = new PrismaClient();

// Configure Redis to fail fast for health checks rather than queuing commands
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false 
});

export const checkHealth = async (req, res) => {
  const health = {
    status: 'ok',
    db: 'ok',
    redis: 'ok',
    uptime: process.uptime()
  };

  let isDegraded = false;

  // 1. Check Database Health
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('[HealthCheck] DB Failed:', error.message);
    health.db = 'degraded';
    isDegraded = true;
  }

  // 2. Check Redis Health
  try {
    await redis.ping();
  } catch (error) {
    console.error('[HealthCheck] Redis Failed:', error.message);
    health.redis = 'degraded';
    isDegraded = true;
  }

  // 3. Return 503 if any vital service is down, letting Docker/Railway know it's unhealthy
  if (isDegraded) {
    health.status = 'degraded';
    return res.status(503).json(health);
  }

  res.status(200).json(health);
};