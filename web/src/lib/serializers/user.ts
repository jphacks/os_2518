import { env } from '@/lib/env';

type LanguageInfo = {
  id: number;
  code: string;
  name: string;
};

type TargetLanguageInfo = {
  id: number;
  level: number;
  language?: LanguageInfo | null;
};

type UserWithRelations = {
  id: number;
  displayName: string;
  email: string;
  hobby?: string | null;
  skill?: string | null;
  comment?: string | null;
  iconPath?: string | null;
  createdAt: Date;
  updatedAt: Date;
  nativeLanguage?: LanguageInfo | null;
  targets?: TargetLanguageInfo[];
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
