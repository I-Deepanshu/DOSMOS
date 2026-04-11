import { verifyAccessToken } from "../utils/token.js";

/**
 * Socket.io JWT authentication middleware.
 * Token must be passed via handshake.auth.token
 * All socket handlers access socket.user for the authenticated user.
 */
export function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Unauthorized: no token"));

  try {
    socket.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error("Unauthorized: invalid token"));
  }
}
