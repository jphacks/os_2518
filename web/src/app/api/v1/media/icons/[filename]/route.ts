import fs from 'node:fs/promises';
import path from 'node:path';

import { NextRequest } from 'next/server';

import { env } from '@/lib/env';

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(request: NextRequest, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;
    const storageDir = path.resolve(process.cwd(), env.ICON_STORAGE_DIR);
    const targetPath = path.resolve(storageDir, filename);

    if (!targetPath.startsWith(storageDir)) {
      return new Response('Not Found', { status: 404 });
    }

    const data = await fs.readFile(targetPath);
    const ext = filename.split('.').at(-1)?.toLowerCase() ?? 'png';
    const contentType = MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Response('Not Found', { status: 404 });
    }

    console.error('Icon serve error', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
