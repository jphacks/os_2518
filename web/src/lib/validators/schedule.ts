import { z } from 'zod';

const scheduleSlotSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  })
  .refine((slot) => slot.endTime > slot.startTime, {
    path: ['endTime'],
    message: '終了時間は開始時間より後に設定してください',
  });

export const postScheduleSchema = z
  .object({
    action: z.enum(['propose', 'confirm']),
    note: z
      .string()
      .trim()
      .max(500, 'メモは500文字以内で入力してください')
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    slots: z.array(scheduleSlotSchema).min(1, '候補を1件以上入力してください'),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'confirm' && data.slots.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '登録では候補を1件のみ指定してください',
        path: ['slots'],
      });
    }
  });

export const respondScheduleSchema = z.object({
  action: z.enum(['accept']),
});
