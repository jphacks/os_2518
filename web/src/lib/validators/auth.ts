import { z } from 'zod';

const targetLanguageInput = z.object({
  languageCode: z.string().min(1),
  level: z.number().int().min(0).max(5),
});

export const registerSchema = z.object({
  displayName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(64),
  nativeLanguageCode: z.string().min(1),
  targetLanguages: z.array(targetLanguageInput).min(1),
  hobby: z.string().max(255).optional(),
  skill: z.string().max(255).optional(),
  comment: z.string().max(255).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
  allDevices: z.boolean().optional(),
});
