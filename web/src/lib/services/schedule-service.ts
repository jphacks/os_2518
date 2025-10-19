import { SCHEDULE_MESSAGE_TYPE, SCHEDULE_STATUS } from '@/lib/constants/schedule';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { postScheduleSchema } from '@/lib/validators/schedule';
import { createNotification } from '@/lib/services/notification-service';
import { broadcastToUser } from '@/lib/websocket/registry';
import { getMatchForUser } from '@/lib/services/match-service';

async function fetchMessageWithSchedules(messageId: number) {
  return prisma.message.findUnique({
    where: { id: messageId },
    include: {
      schedules: {
        orderBy: { startTime: 'asc' },
      },
    },
  });
}

export async function createScheduleForMatch(matchId: number, userId: number, payload: unknown) {
  const match = await getMatchForUser(matchId, userId);

  if (match.status.code !== 'ACCEPTED') {
    throw new AppError('MATCH_NOT_ACCEPTED', '予定を追加できるのはマッチが承認された後です', 400);
  }

  const parsed = postScheduleSchema.parse(payload);
  const receiverId = match.requesterId === userId ? match.receiverId : match.requesterId;
  const status = parsed.action === 'propose' ? SCHEDULE_STATUS.PROPOSED : SCHEDULE_STATUS.CONFIRMED;
  const messageType =
    status === SCHEDULE_STATUS.PROPOSED ? SCHEDULE_MESSAGE_TYPE.PROPOSAL : SCHEDULE_MESSAGE_TYPE.CONFIRMED;

  const { messageId, scheduleIds } = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        matchId,
        senderId: userId,
        content: parsed.note ?? '',
        type: messageType,
      },
    });

    const ids: number[] = [];
    // Ensure we only register a single slot when action === 'confirm'
    const targetSlots = parsed.action === 'confirm' ? parsed.slots.slice(0, 1) : parsed.slots;

    for (const slot of targetSlots) {
      const created = await tx.schedule.create({
        data: {
          matchId,
          proposerId: userId,
          receiverId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          note: parsed.note ?? null,
          status,
          messageId: message.id,
        },
      });
      ids.push(created.id);
    }

    return { messageId: message.id, scheduleIds: ids };
  });

  const message = await fetchMessageWithSchedules(messageId);
  if (!message) {
    throw new AppError('MESSAGE_NOT_FOUND', '作成した予定メッセージが見つかりませんでした', 500);
  }

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

  const participants = new Set([userId, receiverId]);
  for (const participant of participants) {
    broadcastToUser(participant, {
      event: 'schedule.changed',
      data: {
        scheduleIds,
        matchId,
      },
    });
  }

  return { message, schedules: message.schedules };
}

export async function acceptSchedule(scheduleId: number, userId: number) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      match: {
        include: {
          status: true,
        },
      },
      message: {
        include: {
          schedules: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new AppError('SCHEDULE_NOT_FOUND', 'Schedule not found', 404);
  }

  if (schedule.match.status.code !== 'ACCEPTED') {
    throw new AppError('MATCH_NOT_ACCEPTED', 'この予定は操作できません', 400);
  }

  if (schedule.receiverId !== userId) {
    throw new AppError('SCHEDULE_FORBIDDEN', '予定を承認できるのは受信者のみです', 403);
  }

  if (schedule.status !== SCHEDULE_STATUS.PROPOSED) {
    throw new AppError('SCHEDULE_ALREADY_HANDLED', 'この予定はすでに処理されています', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.schedule.update({
      where: { id: scheduleId },
      data: {
        status: SCHEDULE_STATUS.CONFIRMED,
        updatedAt: new Date(),
      },
    });

    if (schedule.messageId) {
      await tx.schedule.updateMany({
        where: {
          messageId: schedule.messageId,
          id: { not: scheduleId },
        },
        data: {
          status: SCHEDULE_STATUS.CANCELLED,
          updatedAt: new Date(),
        },
      });

      await tx.message.update({
        where: { id: schedule.messageId },
        data: {
          type: SCHEDULE_MESSAGE_TYPE.CONFIRMED,
          updatedAt: new Date(),
        },
      });
    }
  });

  const proposerId = schedule.proposerId;
  const message = schedule.messageId ? await fetchMessageWithSchedules(schedule.messageId) : null;

  const participants = new Set([userId, proposerId]);
  for (const participant of participants) {
    broadcastToUser(participant, {
      event: 'schedule.changed',
      data: {
        scheduleIds: message?.schedules.map((s) => s.id) ?? [scheduleId],
        matchId: schedule.matchId,
      },
    });
  }

  if (message) {
    broadcastToUser(userId, {
      event: 'message.updated',
      data: {
        matchId: schedule.matchId,
        messageId: message.id,
      },
    });
    broadcastToUser(proposerId, {
      event: 'message.updated',
      data: {
        matchId: schedule.matchId,
        messageId: message.id,
      },
    });
  }

  await createNotification(proposerId, 'MESSAGE_RECEIVED', {
    matchId: schedule.matchId,
    messageId: message?.id ?? null,
    senderId: userId,
    type: 'SCHEDULE_CONFIRMED',
  });

  return {
    scheduleId,
    message,
  };
}

export async function cancelSchedule(scheduleId: number, userId: number) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      match: {
        include: {
          status: true,
          requester: true,
          receiver: true,
        },
      },
      message: {
        include: {
          schedules: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new AppError('SCHEDULE_NOT_FOUND', 'Schedule not found', 404);
  }

  if (schedule.match.status.code !== 'ACCEPTED') {
    throw new AppError('MATCH_NOT_ACCEPTED', 'この予定は操作できません', 400);
  }

  const isParticipant = schedule.proposerId === userId || schedule.receiverId === userId;
  if (!isParticipant) {
    throw new AppError('SCHEDULE_FORBIDDEN', '予定を操作する権限がありません', 403);
  }

  const otherUserId = schedule.proposerId === userId ? schedule.receiverId : schedule.proposerId;
  const scheduleIdsToCancel: number[] = [];

  if (schedule.messageId) {
    (schedule.message?.schedules ?? []).forEach((s) => {
      if (s.status !== SCHEDULE_STATUS.CANCELLED) {
        scheduleIdsToCancel.push(s.id);
      }
    });
  } else {
    scheduleIdsToCancel.push(scheduleId);
  }

  const { cancelMessageId } = await prisma.$transaction(async (tx) => {
    if (scheduleIdsToCancel.length > 0) {
      await tx.schedule.updateMany({
        where: { id: { in: scheduleIdsToCancel } },
        data: {
          status: SCHEDULE_STATUS.CANCELLED,
          updatedAt: new Date(),
        },
      });
    }

    if (schedule.messageId) {
      await tx.message.update({
        where: { id: schedule.messageId },
        data: {
          type: SCHEDULE_MESSAGE_TYPE.CANCELLED,
          updatedAt: new Date(),
        },
      });
    }

    const cancellationMessage = await tx.message.create({
      data: {
        matchId: schedule.matchId,
        senderId: userId,
        content: 'メッセージが廃棄されました。',
        type: SCHEDULE_MESSAGE_TYPE.CANCELLED,
      },
    });

    return { cancelMessageId: cancellationMessage.id };
  });

  const message = schedule.messageId ? await fetchMessageWithSchedules(schedule.messageId) : null;
  const cancellationMessage = await prisma.message.findUnique({
    where: { id: cancelMessageId },
  });

  const scheduleIds = message?.schedules.map((s) => s.id) ?? [scheduleId];
  const participants = new Set([userId, otherUserId]);
  for (const participant of participants) {
    broadcastToUser(participant, {
      event: 'schedule.changed',
      data: {
        scheduleIds,
        matchId: schedule.matchId,
      },
    });
  }

  if (message) {
    broadcastToUser(userId, {
      event: 'message.updated',
      data: {
        matchId: schedule.matchId,
        messageId: message.id,
      },
    });
    broadcastToUser(otherUserId, {
      event: 'message.updated',
      data: {
        matchId: schedule.matchId,
        messageId: message.id,
      },
    });
  }

  if (cancellationMessage) {
    for (const participant of [userId, otherUserId]) {
      broadcastToUser(participant, {
        event: 'message.created',
        data: {
          matchId: schedule.matchId,
          messageId: cancellationMessage.id,
        },
      });
    }
  }

  await createNotification(otherUserId, 'MESSAGE_RECEIVED', {
    matchId: schedule.matchId,
    messageId: cancellationMessage?.id ?? null,
    senderId: userId,
    type: 'SCHEDULE_CANCELLED',
  });

  return {
    cancelledScheduleIds: scheduleIds,
    message,
    cancellationMessage,
  };
}

export async function listSchedulesForUser(userId: number) {
  const schedules = await prisma.schedule.findMany({
    where: {
      status: SCHEDULE_STATUS.CONFIRMED,
      OR: [{ proposerId: userId }, { receiverId: userId }],
    },
    include: {
      match: {
        include: {
          requester: true,
          receiver: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  return schedules.map((schedule) => {
    const counterpart =
      schedule.proposerId === userId ? schedule.match.receiver : schedule.match.requester;
    return {
      ...schedule,
      counterpart: {
        id: counterpart.id,
        displayName: counterpart.displayName,
      },
    };
  });
}
