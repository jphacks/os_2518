import { NotificationType, Prisma } from '@prisma/client';

import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { notificationsQuerySchema } from '@/lib/validators/notification';
import { broadcastToUser } from '@/lib/websocket/registry';

export async function createNotification(userId: number, type: NotificationType, payload: Prisma.InputJsonValue) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      payload,
    },
  });

  broadcastToUser(userId, {
    event: 'notification.created',
    data: {
      id: notification.id,
      type,
      payload,
      createdAt: notification.createdAt,
      isRead: notification.isRead,
      readAt: notification.readAt,
    },
  });

  return notification;
}

export async function listNotifications(userId: number, query: Record<string, string | string[] | undefined>) {
  const parsed = notificationsQuerySchema.parse(query);

  const take = parsed.limit ?? 20;
  const cursor = parsed.cursor ? { id: parsed.cursor } : undefined;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      isRead: parsed.unreadOnly ? false : undefined,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take,
    cursor,
    skip: cursor ? 1 : undefined,
  });

  const nextCursor = notifications.length === take ? notifications[notifications.length - 1].id : null;

  return { notifications, nextCursor };
}

export async function markNotificationAsRead(userId: number, notificationId: number) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
  }

  if (notification.isRead) {
    return notification;
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  broadcastToUser(userId, {
    event: 'notification.read',
    data: {
      id: updated.id,
      readAt: updated.readAt,
    },
  });

  return updated;
}
