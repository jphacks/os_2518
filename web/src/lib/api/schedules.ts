import { apiFetch } from '@/lib/api/client';
import type { Message, Schedule, ScheduleWithCounterpart } from '@/types/domain';

type ScheduleSlotPayload = {
  startTime: string;
  endTime: string;
};

type CreateSchedulePayload = {
  action: 'propose' | 'confirm';
  note?: string;
  slots: ScheduleSlotPayload[];
};

export async function createSchedule(matchId: number, payload: CreateSchedulePayload) {
  return apiFetch<{ message: Message; schedules: Schedule[] }>(`/matches/${matchId}/schedules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function acceptSchedule(scheduleId: number) {
  return apiFetch<{ scheduleId: number; message: Message | null }>(`/schedules/${scheduleId}/accept`, {
    method: 'POST',
  });
}

export async function cancelSchedule(scheduleId: number) {
  return apiFetch<{ cancelledScheduleIds: number[]; message: Message | null; cancellationMessage: Message | null }>(
    `/schedules/${scheduleId}/cancel`,
    {
      method: 'POST',
    },
  );
}

export async function listSchedules() {
  return apiFetch<{ schedules: ScheduleWithCounterpart[] }>('/schedules');
}
