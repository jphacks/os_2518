import { MATCH_STATUS } from '@/lib/constants/match';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { messagesQuerySchema, postMessageSchema } from '@/lib/validators/message';
import { broadcastToUser } from '@/lib/websocket/registry';
import { createNotification } from '@/lib/services/notification-service';

async function ensureMatchParticipant(matchId: number, userId: number) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
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

export async function listMessages(matchId: number, userId: number, query: Record<string, string | string[] | undefined>) {
  await ensureMatchParticipant(matchId, userId);
  const parsed = messagesQuerySchema.parse(query);
  const take = parsed.limit ?? 50;
  const cursor = parsed.cursor ? { id: parsed.cursor } : undefined;

  const messages = await prisma.message.findMany({
    where: { matchId },
    include: {
      schedule: true,
    },
    orderBy: { createdAt: 'desc' },
    take,
    cursor,
    skip: cursor ? 1 : undefined,
  });

  const nextCursor = messages.length === take ? messages[messages.length - 1].id : null;
  return { messages, nextCursor };
}

export async function createMessage(matchId: number, userId: number, payload: unknown) {
  const match = await ensureMatchParticipant(matchId, userId);

  if (match.statusId !== MATCH_STATUS.ACCEPTED) {
    throw new AppError('MATCH_NOT_ACCEPTED', 'Messages can be sent only on accepted matches', 400);
  }

  const parsed = postMessageSchema.parse(payload);

  const message = await prisma.message.create({
    data: {
      matchId,
      senderId: userId,
      content: parsed.content,
      type: 'TEXT',
    },
    include: {
      schedule: true,
    },
  });

  const receiverId = match.requesterId === userId ? match.receiverId : match.requesterId;

  await createNotification(receiverId, 'MESSAGE_RECEIVED', {
    matchId,
    messageId: message.id,
    senderId: userId,
  });

  broadcastToUser(receiverId, {
    event: 'message.created',
    data: {
      matchId,
      messageId: message.id,
    },
  });

  return message;
}

export async function markMessageAsRead(messageId: number, userId: number) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      match: true,
    },
  });

  if (!message) {
    throw new AppError('MESSAGE_NOT_FOUND', 'Message not found', 404);
  }

  const { match } = message;

  const isReceiver = match.requesterId === userId || match.receiverId === userId;
  if (!isReceiver) {
    throw new AppError('MESSAGE_FORBIDDEN', 'Not allowed to update this message', 403);
  }

  if (message.isRead) {
    return message;
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  const otherUserId = match.requesterId === userId ? match.receiverId : match.requesterId;

  broadcastToUser(otherUserId, {
    event: 'message.read',
    data: {
      matchId: match.id,
      messageId,
      readerId: userId,
    },
  });

  await createNotification(otherUserId, 'MESSAGE_READ', {
    matchId: match.id,
    messageId,
    readerId: userId,
  });

  return updated;
}
