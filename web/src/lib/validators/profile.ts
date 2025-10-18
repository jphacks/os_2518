import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  nativeLanguageCode: z.string().min(1).optional(),
  hobby: z.string().max(255).nullable().optional(),
  skill: z.string().max(255).nullable().optional(),
  comment: z.string().max(255).nullable().optional(),
});

export const createTargetLanguageSchema = z.object({
  languageCode: z.string().min(1),
  level: z.number().int().min(0).max(5),
});
