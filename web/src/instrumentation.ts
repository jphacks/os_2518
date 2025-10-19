export const runtime = 'nodejs';

import { startReminderScheduler } from '@/lib/reminder/scheduler';

let registered = false;

export async function register() {
  if (registered) {
    return;
  }
  registered = true;
  try {
    startReminderScheduler();
  } catch (err) {
    console.error('Failed to start reminder scheduler', err);
  }
}
