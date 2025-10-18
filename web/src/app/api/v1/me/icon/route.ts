import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';
import { prisma } from '@/lib/prisma';
import { serializeUser } from '@/lib/serializers/user';
import { env } from '@/lib/env';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return error('FILE_REQUIRED', 'Icon image is required', 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return error('UNSUPPORTED_FILE_TYPE', 'Unsupported file type', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extension = file.type.split('/')[1] ?? 'png';
    const fileName = `${user.id}-${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const storageDir = path.resolve(process.cwd(), env.ICON_STORAGE_DIR);
    await fs.mkdir(storageDir, { recursive: true });

    const filePath = path.join(storageDir, fileName);
    await fs.writeFile(filePath, buffer);

    if (user.iconPath) {
      const existingPath = path.resolve(storageDir, path.basename(user.iconPath));
      fs.unlink(existingPath).catch(() => undefined);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        iconPath: fileName,
      },
      include: {
        nativeLanguage: true,
        targets: { include: { language: true } },
      },
    });

    return ok({
      user: serializeUser(updated),
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('Upload icon error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
