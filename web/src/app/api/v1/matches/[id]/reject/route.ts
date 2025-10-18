import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { serializeUser } from '@/lib/serializers/user';
import { rejectMatch } from '@/lib/services/match-service';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const matchId = Number(id);
    if (Number.isNaN(matchId)) {
      return error('INVALID_MATCH_ID', 'Invalid match id', 400);
    }

    const match = await rejectMatch(matchId, user.id);

    return ok({
      match: {
        id: match.id,
        status: match.status.code,
        requester: serializeUser(match.requester),
        receiver: serializeUser(match.receiver),
        rejectedAt: match.rejectedAt,
      },
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('Reject match error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
