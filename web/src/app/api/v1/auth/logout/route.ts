import { NextRequest } from 'next/server';

import { clearAuthCookies, getAuthenticatedUser } from '@/lib/auth/session';
import { revokeAllRefreshTokens, revokeRefreshToken } from '@/lib/auth/token';
import { isAppError } from '@/lib/errors';
import { error, noContent } from '@/lib/http/responses';
import { logoutSchema } from '@/lib/validators/auth';

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const payload = logoutSchema.parse(body);
    const user = await getAuthenticatedUser(request);

    if (payload.allDevices && user) {
      await revokeAllRefreshTokens(user.id);
    } else if (payload.refreshToken) {
      await revokeRefreshToken(payload.refreshToken);
    }

    await clearAuthCookies();
    return noContent();
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }

    if (err instanceof SyntaxError) {
      return error('INVALID_JSON', 'Invalid JSON payload', 400);
    }

    console.error('Logout error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
