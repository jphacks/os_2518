import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { listNotifications } from '@/lib/services/notification-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { notifications, nextCursor } = await listNotifications(user.id, Object.fromEntries(request.nextUrl.searchParams));

    return ok({
      notifications,
      nextCursor,
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('List notifications error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
