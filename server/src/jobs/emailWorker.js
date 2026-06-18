import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { sendEmail } from '../services/email.service.js';

export const emailWorker = new Worker('emailQueue', async (job) => {
  const { type, data } = job;
  const { email, token } = data;

  if (job.name === 'verify-email') {
    // Construct the verification link
    const verifyLink = `${env.CLIENT_ORIGIN}/auth/verify-email/${token}`;
    await sendEmail(
      email,
      'Verify your TaskForge Account',
      `Welcome! Click here to verify: ${verifyLink}`
    );
  } 
  else if (job.name === 'reset-password') {
    // We will use this in a future ticket
    const resetLink = `${env.CLIENT_ORIGIN}/auth/reset-password/${token}`;
    await sendEmail(
      email,
      'Reset your TaskForge Password',
      `Click here to reset your password: ${resetLink}`
    );
  }
}, {
  connection: {
    url: env.REDIS_URL
  }
});

emailWorker.on('completed', (job) => {
  console.log(`[Job Completed] Email job ${job.id} (${job.name}) finished.`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Job Failed] Email job ${job.id} failed with error: ${err.message}`);
});