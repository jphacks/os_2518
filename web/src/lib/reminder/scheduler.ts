import cron from 'node-cron';

import { prisma } from '@/lib/prisma';
import { SCHEDULE_STATUS } from '@/lib/constants/schedule';
import { sendScheduleReminderEmail } from '@/lib/email/mailer';

type ReminderSchedule = Awaited<ReturnType<typeof fetchSchedulesForReminders>>[number];

let schedulerStarted = false;

function getStartOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date) {
  const d = getStartOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

async function fetchSchedulesForReminders() {
  const now = new Date();
  const startOfToday = getStartOfDay(now);
  const endOfToday = getEndOfDay(now);

  return prisma.schedule.findMany({
    where: {
      status: SCHEDULE_STATUS.CONFIRMED,
      reminderSentAt: null,
      startTime: {
        gte: startOfToday,
        lt: endOfToday,
      },
    },
    include: {
      match: {
        include: {
          requester: true,
          receiver: true,
        },
      },
    },
  });
}

function buildReminderText(schedule: ReminderSchedule) {
  const start = new Date(schedule.startTime);
  const end = new Date(schedule.endTime);

  return [
    'こんにちは！ Lingua Bridge からのリマインダーです。',
    '',
    '本日、以下の予定が登録されています。',
    `開始時刻: ${start.toLocaleString()}`,
    `終了時刻: ${end.toLocaleString()}`,
    schedule.note ? `メモ: ${schedule.note}` : undefined,
    '',
    '良い交流になりますように！',
  ]
    .filter(Boolean)
    .join('\n');
}

async function processReminders() {
  try {
    const schedules = await fetchSchedulesForReminders();

    if (schedules.length === 0) {
      return;
    }

    for (const schedule of schedules) {
      const text = buildReminderText(schedule);
      const subject = '【Lingua Bridge】本日の交流予定リマインダー';

      const recipients = [
        schedule.match.requester.email,
        schedule.match.receiver.email,
      ].filter(Boolean);

      const results = await Promise.all(
        recipients.map((recipient) =>
          sendScheduleReminderEmail({
            to: recipient,
            subject,
            text,
          }),
        ),
      );

      if (results.every(Boolean)) {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            reminderSentAt: new Date(),
          },
        });
      }
    }
  } catch (err) {
    console.error('Failed to process schedule reminders', err);
  }
}

export function startReminderScheduler() {
  if (schedulerStarted) {
    return;
  }
  schedulerStarted = true;

  const task = cron.schedule('0 * * * *', () => {
    void processReminders();
  });

  task.start();

  void processReminders();
}
