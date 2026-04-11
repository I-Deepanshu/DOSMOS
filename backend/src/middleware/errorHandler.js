export function errorHandler(err, _req, res, _next) {
  const status  = err.status || 500;
  const message = err.message || "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(`[${status}] ${message}`, err.stack);
  }

  res.status(status).json({
    error: message,
    ...(err.retryAfter  && { retryAfter: err.retryAfter }),
    ...(err.attemptsLeft !== undefined && { attemptsLeft: err.attemptsLeft }),
    ...(err.canRegister !== undefined  && { canRegister: err.canRegister }),
  });
}
