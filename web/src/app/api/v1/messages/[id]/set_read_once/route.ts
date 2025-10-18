import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { error, ok } from '@/lib/http/responses';
import { isAppError } from '@/lib/errors';

export async function POST(request: NextRequest, context: { params: Promise<{ matchId: string }> }) {
  try {
    const user = await requireUser(request);
    const { matchId } = await context.params;
    const id = Number(matchId);

    if (Number.isNaN(id)) return error('INVALID_MATCH_ID', 'Invalid match id', 400);

    const updated = await prisma.message.updateMany({
      where: {
        matchId: id,
        senderId: { not: user.id }, // 自分以外のメッセージ
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return ok({ updatedCount: updated.count });
  } catch (err) {
    if (isAppError(err)) return error(err.code, err.message, err.status, err.details);
    console.error('Mark messages read error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
