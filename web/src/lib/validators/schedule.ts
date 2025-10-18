import { z } from 'zod';

export const postScheduleSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    note: z
      .string()
      .trim()
      .max(500, 'メモは500文字以内で入力してください')
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    action: z.enum(['propose', 'confirm']),
  })
  .refine((data) => data.endTime > data.startTime, {
    path: ['endTime'],
    message: '終了時間は開始時間より後に設定してください',
  });

export const respondScheduleSchema = z.object({
  action: z.enum(['accept']),
});
