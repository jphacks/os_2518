type Connection = {
  send: (message: string) => void;
};

declare global {
  var __connectionRegistry: Map<number, Set<Connection>> | undefined;
}

function getRegistry() {
  if (!globalThis.__connectionRegistry) {
    globalThis.__connectionRegistry = new Map<number, Set<Connection>>();
  }
  return globalThis.__connectionRegistry;
}

function registerConnection(userId: number, connection: Connection) {
  const registry = getRegistry();
  const connections = registry.get(userId) ?? new Set<Connection>();
  connections.add(connection);
  registry.set(userId, connections);

  return () => {
    connections.delete(connection);
    if (connections.size === 0) {
      registry.delete(userId);
    }
  };
}

export function registerWebSocketConnection(userId: number, socket: WebSocket) {
  const remove = registerConnection(userId, {
    send: (message) => {
      try {
        socket.send(message);
      } catch {
        remove();
      }
    },
  });

  const cleanup = () => remove();
  socket.addEventListener('close', cleanup, { once: true });
  socket.addEventListener('error', cleanup, { once: true });
}

export function registerSSEConnection(userId: number, controller: ReadableStreamDefaultController<Uint8Array>, signal: AbortSignal) {
  const encoder = new TextEncoder();

  const remove = registerConnection(userId, {
    send: (message) => {
      try {
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      } catch {
        remove();
      }
    },
  });

  signal.addEventListener(
    'abort',
    () => {
      remove();
      controller.close();
    },
    { once: true },
  );
}

export function broadcastToUser(userId: number, payload: unknown) {
  const registry = getRegistry();
  const connections = registry.get(userId);
  if (!connections || connections.size === 0) {
    return;
  }

  const message = JSON.stringify(payload);
  for (const connection of connections) {
    try {
      connection.send(message);
    } catch {
      connections.delete(connection);
    }
  }

  if (connections.size === 0) {
    registry.delete(userId);
  }
}
