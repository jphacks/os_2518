import crypto from 'node:crypto';
import { addDays, addMinutes } from 'date-fns';
import jwt from 'jsonwebtoken';

import type { Prisma } from '@prisma/client';

import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

type DbUser = Prisma.User;
type DbRefreshToken = Prisma.RefreshToken;

type AccessTokenPayload = {
  sub: number;
  email: string;
};

type TokenMetadata = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateAccessToken(user: DbUser) {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
  };

  const expiresAt = addMinutes(new Date(), env.ACCESS_TOKEN_EXPIRES_IN_MINUTES);
  const token = jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_EXPIRES_IN_MINUTES}m`,
  });

  return { token, expiresAt };
}

export async function generateRefreshToken(user: DbUser, metadata: TokenMetadata) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = hashRefreshToken(rawToken);
  const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_EXPIRES_IN_DAYS);

  await prisma.refreshToken.create({
    data: {
      token: hashed,
      userId: user.id,
      expiresAt,
      userAgent: metadata.userAgent ?? null,
      ipAddress: metadata.ipAddress ?? null,
    },
  });

  return { token: rawToken, expiresAt };
}

export async function revokeRefreshToken(rawToken: string) {
  const hashed = hashRefreshToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { token: hashed },
  });

  if (!existing) {
    return null;
  }

  return prisma.refreshToken.update({
    where: { token: hashed },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokens(userId: number) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function verifyRefreshToken(rawToken: string): Promise<DbRefreshToken & { user: DbUser } | null> {
  const hashed = hashRefreshToken(rawToken);

  const token = await prisma.refreshToken.findUnique({
    where: { token: hashed },
    include: {
      user: true,
    },
  });

  if (!token || token.revokedAt) {
    return null;
  }

  if (token.expiresAt < new Date()) {
    return null;
  }

  return token;
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET);
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'sub' in payload &&
      'email' in payload
    ) {
      const subValue = (payload as { sub: unknown }).sub;
      const emailValue = (payload as { email: unknown }).email;
      const isValidSub =
        typeof subValue === 'number' ||
        (typeof subValue === 'string' && subValue.trim().length > 0 && !Number.isNaN(Number(subValue)));
      if (isValidSub && typeof emailValue === 'string') {
        return {
          sub: typeof subValue === 'number' ? subValue : Number(subValue),
          email: emailValue,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}
