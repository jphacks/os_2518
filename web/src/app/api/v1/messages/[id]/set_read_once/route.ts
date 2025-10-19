import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { error, ok } from '@/lib/http/responses';
import { isAppError } from '@/lib/errors';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id: rawMatchId } = await context.params;
    const matchId = Number(rawMatchId);

    if (Number.isNaN(matchId)) return error('INVALID_MATCH_ID', 'Invalid match id', 400);

    const updated = await prisma.message.updateMany({
      where: {
        matchId,
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
