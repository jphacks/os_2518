import { apiFetch } from '@/lib/api/client';
import { User } from '@/types/domain';
import { SessionTokens } from '@/types/session';

type AuthResponse = {
  user: User;
  tokens: SessionTokens;
};

export async function registerUser(payload: {
  displayName: string;
  email: string;
  password: string;
  nativeLanguageCode: string;
  targetLanguages: Array<{ languageCode: string; level: number }>;
  hobby?: string;
  skill?: string;
  comment?: string;
}) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function refreshSession(payload: { refreshToken: string }) {
  return apiFetch<{ tokens: SessionTokens }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout(payload: { refreshToken?: string; allDevices?: boolean } = {}) {
  await apiFetch<unknown>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser() {
  return apiFetch<{ user: User }>('/me');
}
