import { Worker } from 'bullmq';
import { createNotification } from '../services/notification.service.js';
import prisma from '../config/db.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

export const reminderWorker = new Worker('task-reminders', async (job) => {
  const { taskId, userId, title } = job.data;

  try {
    // 1. Verify the task still exists and actually needs a reminder
    // (e.g., if it was completed or deleted between scheduling and execution, we skip the notification)
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    
    if (!task || task.status === 'DONE' || task.isArchived) {
      console.log(`[Reminder Worker] Skipping reminder for Task ${taskId} (Completed/Archived/Deleted)`);
      return;
    }

    // 2. Trigger the notification service (this handles the DB insert AND the Socket emission)
    await createNotification({
      userId,
      type: 'DUE_DATE_REMINDER',
      message: `Reminder: "${title}" is due soon.`,
      taskId
    });

    console.log(`[Reminder Worker] Successfully sent reminder for Task ${taskId}`);

  } catch (error) {
    console.error(`[Reminder Worker] Failed to process job ${job.id}:`, error);
    throw error; // Let BullMQ handle retries if configured
  }
}, { connection });

// Handle worker events for debugging/logging
reminderWorker.on('failed', (job, err) => {
  console.error(`[Reminder Worker] Job ${job?.id} failed with error ${err.message}`);
});