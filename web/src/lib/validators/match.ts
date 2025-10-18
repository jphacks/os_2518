import { z } from 'zod';

export const createMatchSchema = z.object({
  receiverId: z.number().int().positive(),
  message: z.string().max(500).optional(),
});

export const listMatchesQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
