import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import { serializeUser } from '@/lib/serializers/user';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(request);
    const { id } = await context.params;
    const userId = Number(id);
    if (Number.isNaN(userId)) {
      return error('INVALID_USER_ID', 'Invalid user id', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        nativeLanguage: true,
        targets: { include: { language: true } },
      },
    });

    if (!user) {
      return error('USER_NOT_FOUND', 'User not found', 404);
    }

    return ok({
      user: serializeUser(user),
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('Get user error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
