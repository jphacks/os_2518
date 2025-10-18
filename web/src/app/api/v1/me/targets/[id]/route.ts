import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { AppError, isAppError } from '@/lib/errors';
import { error, noContent } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const targetId = Number(id);

    if (Number.isNaN(targetId)) {
      return error('INVALID_TARGET_ID', 'Invalid target language id', 400);
    }

    const target = await prisma.targetLanguage.findUnique({
      where: { id: targetId },
    });

    if (!target || target.userId !== user.id) {
      throw new AppError('TARGET_NOT_FOUND', 'Target language not found', 404);
    }

    await prisma.targetLanguage.delete({
      where: { id: targetId },
    });

    return noContent();
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('Delete target language error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
