import { Queue } from 'bullmq';

// Ensure this matches your Redis configuration (usually set in env)
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined, // <-- Added
  tls: process.env.REDIS_PASSWORD ? {} : undefined   // <-- Added
};

export const reminderQueue = new Queue('task-reminders', { connection });

/**
 * Helper to schedule a reminder job
 * @param {string} taskId 
 * @param {string} userId 
 * @param {string} title - Task title for the notification message
 * @param {Date} reminderDate - The exact Date to trigger the job
 */
export const scheduleTaskReminder = async (taskId, userId, title, reminderDate) => {
  const delay = new Date(reminderDate).getTime() - Date.now();
  
  if (delay <= 0) return; // Don't schedule if the time has already passed

  // We use the taskId as the job ID so we can easily delete/overwrite it if the user changes the reminder time
  await reminderQueue.add(
    'send-reminder', 
    { taskId, userId, title },
    { 
      delay,
      jobId: `reminder-${taskId}`, 
      removeOnComplete: true 
    }
  );
};

/**
 * Helper to remove an existing scheduled reminder
 * @param {string} taskId 
 */
export const removeTaskReminder = async (taskId) => {
  const jobId = `reminder-${taskId}`;
  const job = await reminderQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
};