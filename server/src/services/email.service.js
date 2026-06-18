import { env } from '../config/env.js';

export const sendEmail = async (to, subject, body) => {
  if (env.NODE_ENV === 'development') {
    // In development, just log to the console instead of sending
    console.log('\n--- EMAIL SIMULATION ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log('------------------------\n');
    return;
  }

  // TODO: Add Resend or Nodemailer logic for production here later
  console.log('Production email sending not yet implemented.');
};