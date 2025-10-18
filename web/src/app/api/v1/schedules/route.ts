import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { ok, error } from '@/lib/http/responses';
import { listSchedulesForUser } from '@/lib/services/schedule-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const schedules = await listSchedulesForUser(user.id);
    return ok({ schedules });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('List schedules error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
