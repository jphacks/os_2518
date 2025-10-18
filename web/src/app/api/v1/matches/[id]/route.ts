import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { serializeUser } from '@/lib/serializers/user';
import { getMatchForUser } from '@/lib/services/match-service';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const matchId = Number(id);
    if (Number.isNaN(matchId)) {
      return error('INVALID_MATCH_ID', 'Invalid match id', 400);
    }

    const match = await getMatchForUser(matchId, user.id);

    return ok({
      match: {
        id: match.id,
        status: match.status.code,
        requester: serializeUser(match.requester),
        receiver: serializeUser(match.receiver),
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        acceptedAt: match.acceptedAt ?? null,
        rejectedAt: match.rejectedAt ?? null,
      },
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('Get match detail error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
