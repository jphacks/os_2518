import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { AppError, isAppError } from '@/lib/errors';
import { error, ok, created } from '@/lib/http/responses';
import { serializeUser } from '@/lib/serializers/user';
import { listMatches, requestMatch } from '@/lib/services/match-service';
import { createMatchSchema } from '@/lib/validators/match';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { matches, nextCursor } = await listMatches(user.id, Object.fromEntries(request.nextUrl.searchParams));

    return ok({
      matches: matches.map((match) => ({
        id: match.id,
        status: match.status.code,
        requester: serializeUser(match.requester),
        receiver: serializeUser(match.receiver),
        latestMessage: match.messages[0] ?? null,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
      })),
      nextCursor,
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('List matches error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const payload = createMatchSchema.parse(body);

    if (payload.receiverId === user.id) {
      throw new AppError('MATCH_SELF_NOT_ALLOWED', 'Cannot match with yourself', 400);
    }

    const match = await requestMatch(user.id, payload.receiverId, payload.message);

    return created({
      match: {
        id: match.id,
        status: match.status.code,
        requester: serializeUser(match.requester),
        receiver: serializeUser(match.receiver),
        createdAt: match.createdAt,
      },
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    if (err instanceof SyntaxError) {
      return error('INVALID_JSON', 'Invalid JSON payload', 400);
    }
    console.error('Create match error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
