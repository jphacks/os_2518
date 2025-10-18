import { apiFetch } from '@/lib/api/client';
import type { Message, Schedule, ScheduleWithCounterpart } from '@/types/domain';

export async function createSchedule(matchId: number, payload: { startTime: string; endTime: string; note?: string; action: 'propose' | 'confirm' }) {
  return apiFetch<{ schedule: Schedule; message: Message }>(`/matches/${matchId}/schedules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function acceptSchedule(scheduleId: number) {
  return apiFetch<{ schedule: Schedule; message: Message | null }>(`/schedules/${scheduleId}/accept`, {
    method: 'POST',
  });
}

export async function listSchedules() {
  return apiFetch<{ schedules: ScheduleWithCounterpart[] }>('/schedules');
}
