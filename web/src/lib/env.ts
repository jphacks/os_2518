import { z } from 'zod';

const envSchema = z.object({
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN_MINUTES: z.coerce.number().int().positive(),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive(),
  ICON_STORAGE_DIR: z.string().min(1),
  NEXT_PUBLIC_APP_BASE_URL: z.string().min(1),
});

export const env = envSchema.parse({
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN_MINUTES: process.env.ACCESS_TOKEN_EXPIRES_IN_MINUTES,
  REFRESH_TOKEN_EXPIRES_IN_DAYS: process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  ICON_STORAGE_DIR: process.env.ICON_STORAGE_DIR ?? './storage/icons',
  NEXT_PUBLIC_APP_BASE_URL: process.env.NEXT_PUBLIC_APP_BASE_URL ?? 'http://localhost:3000',
});

export type AppEnv = typeof env;
