import { NextRequest } from 'next/server';

import { ZodError } from 'zod';

import { issueSessionTokens, setAuthCookies } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { AppError, isAppError } from '@/lib/errors';
import { created, error } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import { serializeUser } from '@/lib/serializers/user';
import { createUserWithProfile } from '@/lib/services/user-service';
import { registerSchema } from '@/lib/validators/auth';

/**
 * ユーザー登録 API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 'Email is already registered', 409);
    }

    const passwordHash = await hashPassword(payload.password);
    const user = await createUserWithProfile({
      displayName: payload.displayName,
      email: payload.email,
      passwordHash,
      nativeLanguageCode: payload.nativeLanguageCode,
      targetLanguages: payload.targetLanguages,
      hobby: payload.hobby,
      skill: payload.skill,
      comment: payload.comment,
    });

    const forwarded = request.headers.get('x-forwarded-for');
    const tokens = await issueSessionTokens(user, {
      userAgent: request.headers.get('user-agent'),
      ipAddress: forwarded ? forwarded.split(',')[0]?.trim() ?? undefined : undefined,
    });
    await setAuthCookies(tokens);

    return created({
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

    console.error('Register error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
