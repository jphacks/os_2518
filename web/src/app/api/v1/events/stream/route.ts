import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error } from '@/lib/http/responses';
import { registerSSEConnection } from '@/lib/websocket/registry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        registerSSEConnection(user.id, controller, request.signal);
        controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode(':keep-alive\n\n'));
        }, 25000);

        request.signal.addEventListener(
          'abort',
          () => {
            clearInterval(keepAlive);
          },
          { once: true },
        );
      },
      cancel() {
        // Handled by the abort signal cleanup above
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('SSE stream error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
