import { z } from 'zod';

export const postMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const messagesQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
