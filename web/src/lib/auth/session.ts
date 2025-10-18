import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

import { User } from '@prisma/client';

import { AppError } from '@/lib/errors';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '@/lib/auth/token';

export type SessionTokens = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

export async function issueSessionTokens(user: User, metadata?: { userAgent?: string | null; ipAddress?: string | null }) {
  const { token: accessToken, expiresAt: accessTokenExpiresAt } = generateAccessToken(user);
  const { token: refreshToken, expiresAt: refreshTokenExpiresAt } = await generateRefreshToken(user, metadata ?? {});

  return {
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenExpiresAt,
  } satisfies SessionTokens;
}

export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const cookieToken = request.cookies.get('accessToken')?.value ?? null;
  const accessToken = tokenFromHeader ?? cookieToken;

  if (!accessToken) {
    return null;
  }

  const payload = verifyAccessToken(accessToken);
  if (!payload) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: payload.sub },
  });
}

export async function requireUser(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'Authentication required', 401);
  }
  return user;
}

export async function setAuthCookies(tokens: SessionTokens) {
  const cookieStore = await cookies();

  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  cookieStore.set('accessToken', tokens.accessToken, {
    ...options,
    maxAge: env.ACCESS_TOKEN_EXPIRES_IN_MINUTES * 60,
  });

  cookieStore.set('refreshToken', tokens.refreshToken, {
    ...options,
    maxAge: env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60,
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
}
