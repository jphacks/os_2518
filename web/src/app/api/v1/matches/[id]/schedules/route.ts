import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { created, error } from '@/lib/http/responses';
import { createScheduleForMatch } from '@/lib/services/schedule-service';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const matchId = Number(id);

    if (Number.isNaN(matchId)) {
      return error('INVALID_MATCH_ID', 'Invalid match id', 400);
    }

    const payload = await request.json();
    const result = await createScheduleForMatch(matchId, user.id, payload);

    return created(result);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    if (err instanceof SyntaxError) {
      return error('INVALID_JSON', 'Invalid JSON payload', 400);
    }
    console.error('Create schedule error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
