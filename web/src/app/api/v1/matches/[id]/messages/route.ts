import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok, created } from '@/lib/http/responses';
import { createMessage, listMessages } from '@/lib/services/message-service';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const matchId = Number(id);
    if (Number.isNaN(matchId)) {
      return error('INVALID_MATCH_ID', 'Invalid match id', 400);
    }

    const { messages, nextCursor } = await listMessages(matchId, user.id, Object.fromEntries(request.nextUrl.searchParams));

    return ok({ messages, nextCursor });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('List messages error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const matchId = Number(id);
    if (Number.isNaN(matchId)) {
      return error('INVALID_MATCH_ID', 'Invalid match id', 400);
    }

    const body = await request.json();
    const message = await createMessage(matchId, user.id, body);

    return created({ message });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    if (err instanceof SyntaxError) {
      return error('INVALID_JSON', 'Invalid JSON payload', 400);
    }
    console.error('Create message error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
