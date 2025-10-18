import { NextRequest } from 'next/server';

import { ZodError } from 'zod';

import { issueSessionTokens, setAuthCookies } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { AppError, isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import { serializeUser } from '@/lib/serializers/user';
import { loginSchema } from '@/lib/validators/auth';

/**
 * ログイン API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      include: {
        nativeLanguage: true,
        targets: { include: { language: true } },
      },
    });

    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
    }

    const isValid = await verifyPassword(payload.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const tokens = await issueSessionTokens(user, {
      userAgent: request.headers.get('user-agent'),
      ipAddress: forwarded ? forwarded.split(',')[0]?.trim() ?? undefined : undefined,
    });
    await setAuthCookies(tokens);

    return ok({
      user: serializeUser(user),
      tokens,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return error('VALIDATION_ERROR', 'Invalid request parameters', 400, err.flatten());
    }
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }

    if (err instanceof SyntaxError) {
      return error('INVALID_JSON', 'Invalid JSON payload', 400);
    }

    console.error('Login error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
