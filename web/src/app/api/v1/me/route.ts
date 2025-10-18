import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { serializeUser } from '@/lib/serializers/user';
import { getUserProfile, updateUserProfile } from '@/lib/services/user-service';
import { updateProfileSchema } from '@/lib/validators/profile';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return error('USER_NOT_FOUND', 'User not found', 404);
    }
    return ok({ user: serializeUser(profile) });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('Get profile error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const payload = updateProfileSchema.parse(body);
    const sanitized = {
      ...payload,
      hobby: payload.hobby ?? undefined,
      skill: payload.skill ?? undefined,
      comment: payload.comment ?? undefined,
    };

    const updated = await updateUserProfile(user.id, sanitized);

    return ok({ user: serializeUser(updated) });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    if (err instanceof SyntaxError) {
      return error('INVALID_JSON', 'Invalid JSON payload', 400);
    }
    console.error('Update profile error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
