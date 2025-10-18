import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { ok, error } from '@/lib/http/responses';
import { acceptSchedule } from '@/lib/services/schedule-service';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const scheduleId = Number(id);

    if (Number.isNaN(scheduleId)) {
      return error('INVALID_SCHEDULE_ID', 'Invalid schedule id', 400);
    }

    const result = await acceptSchedule(scheduleId, user.id);

    return ok(result);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('Accept schedule error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
