import type { Prisma } from '@prisma/client';

import { MATCH_STATUS } from '@/lib/constants/match';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { listUsersQuerySchema } from '@/lib/validators/users';

type RegisterInput = {
  displayName: string;
  email: string;
  passwordHash: string;
  nativeLanguageCode: string;
  targetLanguages: Array<{
    languageCode: string;
    level: number;
  }>;
  hobby?: string;
  skill?: string;
  comment?: string;
};

export async function getLanguageByCode(code: string) {
  const language = await prisma.language.findUnique({ where: { code } });
  if (!language) {
    throw new AppError('LANGUAGE_NOT_FOUND', `Language not found: ${code}`, 400);
  }
  return language;
}

export async function createUserWithProfile(input: RegisterInput) {
  const nativeLanguage = await getLanguageByCode(input.nativeLanguageCode);

  const targetsData = await Promise.all(
    input.targetLanguages.map(async (target) => {
      const language = await getLanguageByCode(target.languageCode);
      return {
        languageId: language.id,
        level: target.level,
      };
    }),
  );

  return prisma.user.create({
    data: {
      displayName: input.displayName,
      email: input.email,
      passwordHash: input.passwordHash,
      nativeLanguageId: nativeLanguage.id,
      hobby: input.hobby ?? null,
      skill: input.skill ?? null,
      comment: input.comment ?? null,
      targets: {
        createMany: {
          data: targetsData.map((target) => ({
            languageId: target.languageId,
            level: target.level,
          })),
        },
      },
    },
    include: {
      nativeLanguage: true,
      targets: {
        include: { language: true },
      },
    },
  });
}

export async function getUserProfile(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      nativeLanguage: true,
      targets: {
        include: {
          language: true,
        },
      },
    },
  });
}

export async function updateUserProfile(userId: number, payload: Partial<Omit<RegisterInput, 'passwordHash' | 'targetLanguages' | 'email'>>) {
  const data: Record<string, unknown> = {};

  if (payload.displayName !== undefined) {
    data.displayName = payload.displayName;
  }

  if (payload.hobby !== undefined) {
    data.hobby = payload.hobby;
  }

  if (payload.skill !== undefined) {
    data.skill = payload.skill;
  }

  if (payload.comment !== undefined) {
    data.comment = payload.comment;
  }

  if (payload.nativeLanguageCode) {
    const language = await getLanguageByCode(payload.nativeLanguageCode);
    data.nativeLanguageId = language.id;
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    include: {
      nativeLanguage: true,
      targets: {
        include: { language: true },
      },
    },
  });
}

export async function listUsersForQuery(currentUserId: number, query: Record<string, string | string[] | undefined>) {
  const parsed = listUsersQuerySchema.parse(query);
  const take = parsed.limit ?? 20;

  const whereBase: Prisma.UserWhereInput = {
    id: { not: currentUserId },
  };

  if (parsed.mode === 'recommended' || !parsed.mode) {
    const currentTargets = await prisma.targetLanguage.findMany({
      where: { userId: currentUserId },
    });
    const nativeLanguageIds = currentTargets.map((target) => target.languageId);

    const existingMatches = await prisma.match.findMany({
      where: {
        OR: [{ requesterId: currentUserId }, { receiverId: currentUserId }],
        statusId: {
          in: [MATCH_STATUS.PENDING, MATCH_STATUS.ACCEPTED, MATCH_STATUS.REJECTED],
        },
      },
      select: {
        requesterId: true,
        receiverId: true,
      },
    });

    const excludedUserIds = new Set<number>();
    existingMatches.forEach((match) => {
      const otherId = match.requesterId === currentUserId ? match.receiverId : match.requesterId;
      excludedUserIds.add(otherId);
    });

    const idFilter: Prisma.IntFilter = {
      not: currentUserId,
      notIn: excludedUserIds.size > 0 ? Array.from(excludedUserIds) : undefined,
    };

    whereBase.id = idFilter;
    whereBase.nativeLanguageId = {
      in: nativeLanguageIds.length > 0 ? nativeLanguageIds : undefined,
    };
  }

  if (parsed.displayName) {
    Object.assign(whereBase, {
      displayName: {
        contains: parsed.displayName,
        mode: 'insensitive' as const,
      },
    });
  }

  if (parsed.nativeLanguageCode) {
    const language = await getLanguageByCode(parsed.nativeLanguageCode);
    Object.assign(whereBase, { nativeLanguageId: language.id });
  }

  const cursor = parsed.cursor ? { id: parsed.cursor } : undefined;

  const users = await prisma.user.findMany({
    where: {
      ...whereBase,
      ...(parsed.targetLanguageCode
        ? {
            targets: {
              some: {
                language: {
                  code: parsed.targetLanguageCode,
                },
                level: parsed.targetLevelGte
                  ? {
                      gte: parsed.targetLevelGte,
                    }
                  : undefined,
              },
            },
          }
        : {}),
    },
    include: {
      nativeLanguage: true,
      targets: { include: { language: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
    cursor,
    skip: cursor ? 1 : undefined,
  });

  const nextCursor = users.length === take ? users[users.length - 1].id : null;

  return { users, nextCursor };
}
