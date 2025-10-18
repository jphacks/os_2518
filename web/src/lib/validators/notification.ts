import { z } from 'zod';

export const notificationsQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});
