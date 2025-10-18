import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { AppError, isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import { serializeUser } from '@/lib/serializers/user';
import { getUserProfile, getLanguageByCode } from '@/lib/services/user-service';
import { createTargetLanguageSchema } from '@/lib/validators/profile';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const payload = createTargetLanguageSchema.parse(body);

    const language = await getLanguageByCode(payload.languageCode);

    const existing = await prisma.targetLanguage.findUnique({
      where: {
        userId_languageId: {
          userId: user.id,
          languageId: language.id,
        },
      },
    });

    if (existing) {
      throw new AppError('TARGET_ALREADY_EXISTS', 'Target language already exists', 409);
    }

    await prisma.targetLanguage.create({
      data: {
        userId: user.id,
        languageId: language.id,
        level: payload.level,
      },
    });

    const profile = await getUserProfile(user.id);
    return ok({
      user: profile ? serializeUser(profile) : null,
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    if (err instanceof SyntaxError) {
      return error('INVALID_JSON', 'Invalid JSON payload', 400);
    }
    console.error('Add target language error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
