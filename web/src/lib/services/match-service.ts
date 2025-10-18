import { MATCH_STATUS } from '@/lib/constants/match';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { listMatchesQuerySchema } from '@/lib/validators/match';
import { createNotification } from '@/lib/services/notification-service';

export async function requestMatch(requesterId: number, receiverId: number, initialMessage?: string) {
  if (requesterId === receiverId) {
    throw new AppError('MATCH_SELF_NOT_ALLOWED', 'Cannot match with yourself', 400);
  }

  const existing = await prisma.match.findFirst({
    where: {
      OR: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ],
    },
  });

  if (existing) {
    throw new AppError('MATCH_ALREADY_EXISTS', 'Match already exists', 409);
  }

  const match = await prisma.match.create({
    data: {
      requesterId,
      receiverId,
      statusId: MATCH_STATUS.PENDING,
      messages: initialMessage
        ? {
            create: {
              senderId: requesterId,
              content: initialMessage,
            },
          }
        : undefined,
    },
    include: {
      requester: {
        include: { nativeLanguage: true, targets: { include: { language: true } } },
      },
      receiver: {
        include: { nativeLanguage: true, targets: { include: { language: true } } },
      },
      status: true,
    },
  });

  await createNotification(receiverId, 'MATCH_REQUEST', {
    matchId: match.id,
    requesterId,
  });

  return match;
}

export async function getMatchForUser(matchId: number, userId: number) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      requester: {
        include: { nativeLanguage: true, targets: { include: { language: true } } },
      },
      receiver: {
        include: { nativeLanguage: true, targets: { include: { language: true } } },
      },
      status: true,
    },
  });

  if (!match) {
    throw new AppError('MATCH_NOT_FOUND', 'Match not found', 404);
  }

  if (match.requesterId !== userId && match.receiverId !== userId) {
    throw new AppError('MATCH_FORBIDDEN', 'Not allowed to access this match', 403);
  }

  return match;
}

export async function listMatches(userId: number, query: Record<string, string | string[] | undefined>) {
  const parsed = listMatchesQuerySchema.parse(query);
  const take = parsed.limit ?? 20;

  const cursor = parsed.cursor ? { id: parsed.cursor } : undefined;

  const matches = await prisma.match.findMany({
    where: {
      status: parsed.status ? { code: parsed.status } : undefined,
      OR: [
        { requesterId: userId },
        { receiverId: userId },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take,
    cursor,
    skip: cursor ? 1 : undefined,
    include: {
      status: true,
      requester: {
        include: { nativeLanguage: true, targets: { include: { language: true } } },
      },
      receiver: {
        include: { nativeLanguage: true, targets: { include: { language: true } } },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const nextCursor = matches.length === take ? matches[matches.length - 1].id : null;

  return { matches, nextCursor };
}

export async function acceptMatch(matchId: number, userId: number) {
  const match = await getMatchForUser(matchId, userId);

  if (match.receiverId !== userId) {
    throw new AppError('MATCH_FORBIDDEN', 'Only receiver can accept match', 403);
  }

  if (match.status.code !== 'PENDING') {
    throw new AppError('MATCH_ALREADY_RESOLVED', 'Match already resolved', 400);
  }

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      statusId: MATCH_STATUS.ACCEPTED,
      acceptedAt: new Date(),
    },
    include: {
      status: true,
      requester: {
        include: { nativeLanguage: true, targets: { include: { language: true } } },
      },
      receiver: {
        include: { nativeLanguage: true, targets: { include: { language: true } } },
      },
    },
  });

  await createNotification(match.requesterId, 'MATCH_ACCEPT', {
    matchId: match.id,
    receiverId: userId,
  });

  return updated;
}

export async function rejectMatch(matchId: number, userId: number) {
  const match = await getMatchForUser(matchId, userId);

  if (match.receiverId !== userId) {
    throw new AppError('MATCH_FORBIDDEN', 'Only receiver can reject match', 403);
  }

  if (match.status.code !== 'PENDING') {
    throw new AppError('MATCH_ALREADY_RESOLVED', 'Match already resolved', 400);
  }

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      statusId: MATCH_STATUS.REJECTED,
      rejectedAt: new Date(),
    },
    include: {
      status: true,
      requester: {
        include: { nativeLanguage: true, targets: { include: { language: true } } },
      },
      receiver: {
        include: { nativeLanguage: true, targets: { include: { language: true } } },
      },
    },
  });

  await createNotification(match.requesterId, 'MATCH_REJECT', {
    matchId: match.id,
    receiverId: userId,
  });

  return updated;
}
