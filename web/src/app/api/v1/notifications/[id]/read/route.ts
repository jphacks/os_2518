import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { markNotificationAsRead } from '@/lib/services/notification-service';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const notificationId = Number(id);
    if (Number.isNaN(notificationId)) {
      return error('INVALID_NOTIFICATION_ID', 'Invalid notification id', 400);
    }

    const notification = await markNotificationAsRead(user.id, notificationId);
    return ok({ notification });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('Read notification error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
