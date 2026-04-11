import jwt from "jsonwebtoken";
import crypto from "crypto";

// ── Token signing ──────────────────────────────────────────────────────────

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

/**
 * Step token — short-lived (2 min), signed with separate secret.
 * Embeds: userId, step, attemptsLeft, tokenId (nonce).
 */
export function signStepToken(payload) {
  return jwt.sign(payload, process.env.JWT_STEP_SECRET, { expiresIn: "2m" });
}

// ── Token verification ─────────────────────────────────────────────────────

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

export function verifyStepToken(token) {
  return jwt.verify(token, process.env.JWT_STEP_SECRET);
}

// ── Nonce generation ───────────────────────────────────────────────────────

export function generateTokenId() {
  return crypto.randomUUID();
}
