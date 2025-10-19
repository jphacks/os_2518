import type { Prisma } from '@prisma/client';

import { env } from '@/lib/env';

type UserWithRelations = Prisma.User & {
  nativeLanguage?: Prisma.Language | null;
  targets?: Array<
    Prisma.TargetLanguage & {
      language?: Prisma.Language | null;
    }
  >;
};

export function serializeUser(user: UserWithRelations) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    nativeLanguage: user.nativeLanguage
      ? {
          id: user.nativeLanguage.id,
          code: user.nativeLanguage.code,
          name: user.nativeLanguage.name,
        }
      : null,
    hobby: user.hobby,
    skill: user.skill,
    comment: user.comment,
    iconPath: user.iconPath,
    iconUrl: user.iconPath ? `${env.NEXT_PUBLIC_APP_BASE_URL}/api/v1/media/icons/${user.iconPath}` : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    targetLanguages:
      user.targets?.map((target) => ({
        id: target.id,
        level: target.level,
        language: target.language
          ? {
              id: target.language.id,
              code: target.language.code,
              name: target.language.name,
            }
          : null,
      })) ?? [],
  };
}
