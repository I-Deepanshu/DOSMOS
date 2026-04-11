import { io, Socket } from "socket.io-client";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket) {
    socket = io(BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect_error", (err) => {
      console.error("[socket] connect error:", err.message);
    });
  }
  return socket;
}

/**
 * Called after token refresh — forces socket to reconnect with new token.
 */
export function refreshSocketAuth(newToken: string) {
  if (socket) {
    socket.auth = { token: newToken };
    socket.disconnect().connect();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
