import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { serializeUser } from '@/lib/serializers/user';
import { listUsersForQuery } from '@/lib/services/user-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { users, nextCursor } = await listUsersForQuery(user.id, Object.fromEntries(request.nextUrl.searchParams));
    return ok({
      users: users.map(serializeUser),
      nextCursor,
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('List users error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
