import rateLimit from "express-rate-limit";

const windowMs = 15 * 60 * 1000; // 15 minutes

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? String(forwarded).split(",")[0].trim() : (req.ip || "unknown");
  return ip;
}

export const authLimiter = rateLimit({
  windowMs,
  max: process.env.NODE_ENV === "production" ? 5 : 1000,
  keyGenerator: (req) => `${getIp(req)}:${req.body?.userId || "anon"}:auth`,
  validate: { trustProxy: false },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: "Too many attempts. Try again in 15 minutes.",
    retryAfter: 900,
  }),
});

export const registerLimiter = rateLimit({
  windowMs,
  max: process.env.NODE_ENV === "production" ? 3 : 1000,
  keyGenerator: (req) => `${getIp(req)}:register`,
  validate: { trustProxy: false },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: "Too many registrations. Try again in 15 minutes.",
  }),
});
