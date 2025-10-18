import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  displayName: z.string().optional(),
  nativeLanguageCode: z.string().optional(),
  targetLanguageCode: z.string().optional(),
  targetLevelGte: z.coerce.number().int().min(0).max(5).optional(),
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  mode: z.enum(['recommended', 'search']).optional(),
});
