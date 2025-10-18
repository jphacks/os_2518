import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { markMessageAsRead } from '@/lib/services/message-service';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const messageId = Number(id);
    if (Number.isNaN(messageId)) {
      return error('INVALID_MESSAGE_ID', 'Invalid message id', 400);
    }

    const message = await markMessageAsRead(messageId, user.id);
    return ok({ message });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('Mark message read error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
