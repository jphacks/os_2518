import { NextRequest } from 'next/server';

import { issueSessionTokens, setAuthCookies } from '@/lib/auth/session';
import { AppError, isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import { verifyRefreshToken } from '@/lib/auth/token';
import { refreshSchema } from '@/lib/validators/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = refreshSchema.parse(body);

    const existing = await verifyRefreshToken(payload.refreshToken);
    if (!existing) {
      throw new AppError('INVALID_REFRESH_TOKEN', 'Invalid refresh token', 401);
    }

    await prisma.refreshToken.update({
      where: { token: existing.token },
      data: { revokedAt: new Date() },
    });

    const forwarded = request.headers.get('x-forwarded-for');
    const tokens = await issueSessionTokens(existing.user, {
      userAgent: request.headers.get('user-agent'),
      ipAddress: forwarded ? forwarded.split(',')[0]?.trim() ?? undefined : undefined,
    });

    await setAuthCookies(tokens);

    return ok({
      tokens,
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }

    if (err instanceof SyntaxError) {
      return error('INVALID_JSON', 'Invalid JSON payload', 400);
    }

    console.error('Refresh error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
