import { Queue } from 'bullmq';
import { env } from '../config/env.js';

export const emailQueue = new Queue('emailQueue', {
  connection: {
    url: env.REDIS_URL
  },
  defaultJobOptions: {
    attempts: 3, // Retry 3 times
    backoff: {
      type: 'exponential', // Exponential backoff
      delay: 1000, 
    },
    removeOnComplete: true, // Keep the database clean
  }
});