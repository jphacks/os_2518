import nodemailer from 'nodemailer';

let cachedTransporter: nodemailer.Transporter | null = null;

type ScheduleReminderPayload = {
  to: string;
  subject: string;
  text: string;
};

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn('GMAIL_USER / GMAIL_APP_PASSWORD are not configured. Reminder emails will be skipped.');
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

export async function sendScheduleReminderEmail(payload: ScheduleReminderPayload) {
  const transporter = getTransporter();
  if (!transporter) {
    return false;
  }
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
  return true;
}
