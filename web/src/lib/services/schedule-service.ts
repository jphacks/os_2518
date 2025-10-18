import { SCHEDULE_MESSAGE_TYPE, SCHEDULE_STATUS } from '@/lib/constants/schedule';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { postScheduleSchema } from '@/lib/validators/schedule';
import { createNotification } from '@/lib/services/notification-service';
import { broadcastToUser } from '@/lib/websocket/registry';
import { getMatchForUser } from '@/lib/services/match-service';

export async function createScheduleForMatch(matchId: number, userId: number, payload: unknown) {
  const match = await getMatchForUser(matchId, userId);

  if (match.status.code !== 'ACCEPTED') {
    throw new AppError('MATCH_NOT_ACCEPTED', '予定を追加できるのはマッチが承認された後です', 400);
  }

  const parsed = postScheduleSchema.parse(payload);

  const receiverId = match.requesterId === userId ? match.receiverId : match.requesterId;

  const status =
    parsed.action === 'propose' ? SCHEDULE_STATUS.PROPOSED : SCHEDULE_STATUS.CONFIRMED;
  const messageType =
    status === SCHEDULE_STATUS.PROPOSED ? SCHEDULE_MESSAGE_TYPE.PROPOSAL : SCHEDULE_MESSAGE_TYPE.CONFIRMED;

  const schedule = await prisma.schedule.create({
    data: {
      matchId,
      proposerId: userId,
      receiverId,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      note: parsed.note ?? null,
      status,
    },
  });

  const message = await prisma.message.create({
    data: {
      matchId,
      senderId: userId,
      content: parsed.note ?? '',
      type: messageType,
      scheduleId: schedule.id,
    },
    include: {
      schedule: true,
    },
  });

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

  broadcastToUser(userId, {
    event: 'schedule.changed',
    data: {
      scheduleId: schedule.id,
      matchId,
    },
  });
  broadcastToUser(receiverId, {
    event: 'schedule.changed',
    data: {
      scheduleId: schedule.id,
      matchId,
    },
  });

  return { schedule, message };
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
      messages: {
        orderBy: {
          createdAt: 'asc',
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

  const updatedSchedule = await prisma.schedule.update({
    where: { id: scheduleId },
    data: {
      status: SCHEDULE_STATUS.CONFIRMED,
      updatedAt: new Date(),
    },
  });

  const relatedMessage = schedule.messages[0]
    ? await prisma.message.update({
        where: { id: schedule.messages[0].id },
        data: {
          type: SCHEDULE_MESSAGE_TYPE.CONFIRMED,
        },
        include: { schedule: true },
      })
    : null;

  const proposerId = schedule.proposerId;

  broadcastToUser(userId, {
    event: 'schedule.changed',
    data: {
      scheduleId,
      matchId: schedule.matchId,
    },
  });
  broadcastToUser(proposerId, {
    event: 'schedule.changed',
    data: {
      scheduleId,
      matchId: schedule.matchId,
    },
  });

  if (relatedMessage) {
    broadcastToUser(userId, {
      event: 'message.updated',
      data: {
        matchId: schedule.matchId,
        messageId: relatedMessage.id,
      },
    });
    broadcastToUser(proposerId, {
      event: 'message.updated',
      data: {
        matchId: schedule.matchId,
        messageId: relatedMessage.id,
      },
    });
  }

  await createNotification(proposerId, 'MESSAGE_RECEIVED', {
    matchId: schedule.matchId,
    messageId: relatedMessage?.id ?? null,
    senderId: userId,
    type: 'SCHEDULE_CONFIRMED',
  });

  return {
    schedule: updatedSchedule,
    message: relatedMessage,
  };
}

export async function listSchedulesForUser(userId: number) {
  const schedules = await prisma.schedule.findMany({
    where: {
      status: {
        in: [SCHEDULE_STATUS.PROPOSED, SCHEDULE_STATUS.CONFIRMED],
      },
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
