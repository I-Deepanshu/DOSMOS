import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import { maskName } from "../utils/mask.js";
import { hashAnswer, compareAnswer, hashToken, compareToken } from "../utils/hash.js";
import { signAccessToken, signRefreshToken, signStepToken, generateTokenId } from "../utils/token.js";
import { generateSeed, getPlanetType, getPlanetColor } from "../utils/planetSeed.js";
import { generatePlanetName } from "../utils/planetNameGen.js";
import planetService from "./planetService.js";
import chatService from "./chatService.js";
import { normalize } from "../utils/normalize.js";

class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

// ── DOB Probe ────────────────────────────────────────────────────────────────

export async function checkDob(dob) {
  const user = await User.findOne({ dob: new Date(dob), is_active: true });

  if (!user) {
    return { redirect: "register", message: "No presence found in this cosmos." };
  }

  const tokenId = generateTokenId();
  const stepToken = signStepToken({
    userId: user._id.toString(),
    step: "dob_verified",
    tokenId,
  });

  await User.updateOne({ _id: user._id }, { active_step_token_id: tokenId });

  return {
    maskedName: maskName(user.name),
    stepToken,
  };
}

// ── Name Verify ──────────────────────────────────────────────────────────────

export async function verifyName(stepToken, inputName) {
  const payload = await _validateStepToken(stepToken, "dob_verified");
  const user = await User.findById(payload.userId);

  if (!user || !user.is_active) throw new AuthError("Invalid credentials");

  const normInput = normalize(inputName);
  const aliases = [user.normalized_name, ...(user.allowed_aliases || []).map(normalize)];

  if (!aliases.includes(normInput)) {
    throw new AuthError("Identity mismatch. But a new presence can still exist.", 401);
  }

  const tokenId = generateTokenId();
  const newStepToken = signStepToken({
    userId: payload.userId,
    step: "name_verified",
    tokenId,
  });
  await User.updateOne({ _id: payload.userId }, { active_step_token_id: tokenId });

  return { success: true, question: user.security_question, stepToken: newStepToken };
}

// ── Answer Verify ─────────────────────────────────────────────────────────────

export async function verifyAnswer(stepToken, answer) {
  const payload = await _validateStepToken(stepToken, "name_verified");
  const user = await User.findById(payload.userId);

  if (!user || !user.is_active) throw new AuthError("Invalid credentials");

  await _checkAccountLock(user);

  if (user.status === "pending") {
    throw new AuthError("Account pending activation by admin.");
  }

  const correct = await compareAnswer(answer, user.security_answer_hash);

  if (!correct) {
    const attempts = user.failed_attempts + 1;
    let message = "Identity could not be verified.";
    let redirect = null;

    if (attempts === 1) message = "Signal mismatch. Try again.";
    else if (attempts === 2) message = "Still not aligned. One final attempt.";
    else {
      message = "Identity could not be verified.";
      redirect = "register";
    }

    const updates = { 
      failed_attempts: attempts, 
      last_failed_attempt_at: new Date() 
    };

    if (attempts >= 3) {
      updates.lock_until = new Date(Date.now() + 30 * 1000); // 30s cooldown
    }

    await User.updateOne({ _id: user._id }, updates);

    return redirect ? { redirect, message } : { error: message, attemptsLeft: Math.max(0, 3 - attempts) };
  }

  // Success 
  await User.updateOne(
    { _id: user._id },
    { failed_attempts: 0, lock_until: null, active_step_token_id: null }
  );

  return { ...(await _issueTokens(user)), user };
}

// ── Registration ──────────────────────────────────────────────────────────────

export async function register(name, dob, security_question, security_answer, ip) {
  const safeName = name.trim();
  const normName = normalize(safeName);

  // Deepanshu admin protection
  const admin = await User.findOne({ role: "admin" }).select("dob normalized_name");
  if (
    admin &&
    admin.dob.toDateString() === new Date(dob).toDateString() &&
    admin.normalized_name === normName
  ) {
    throw new AuthError("Forbidden", 403);
  }

  // Enforced validation on composite
  const existing = await User.findOne({ dob: new Date(dob), normalized_name: normName });
  if (existing) {
    throw new AuthError("Identity already exists in this timeline.", 409);
  }

  const hash = await hashAnswer(security_answer);
  const seed = generateSeed(dob, safeName);
  const typeData = getPlanetType(seed);
  const color = getPlanetColor(seed, typeData);
  const rawName = generatePlanetName(seed);
  const orbitIdx = await planetService.getNextOrbitIndex();

  const planetData = {
    name: rawName,
    type: typeData.type,
    color,
    orbitIndex: orbitIdx,
    size: 40,
    metadata: { seed, version: 2 },
    createdAt: new Date(),
  };

  const userData = {
    name: safeName,
    normalized_name: normName,
    dob: new Date(dob),
    security_question,
    security_answer_hash: hash,
    role: "user",
    status: "pending",
    is_active: true,
    failed_attempts: 0,
    created_at: new Date(),
  };

  const user = await planetService.createUserWithUniquePlanet(userData, planetData);
  await chatService.createChat(user._id, admin._id);

  return { ...(await _issueTokens(user)), user };
}

// ── Token Refresh ─────────────────────────────────────────────────────────────

export async function refreshTokens(oldRefreshToken, ip, userAgent) {
  const { verifyRefreshToken } = await import("../utils/token.js");
  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    throw new AuthError("Invalid refresh token");
  }

  const stored = await RefreshToken.findOne({ userId: payload.userId });
  if (!stored) throw new AuthError("Session expired. Please log in again.");

  const valid = await compareToken(oldRefreshToken, stored.tokenHash);
  if (!valid || stored.refreshTokenVersion !== payload.version) {
    throw new AuthError("Session expired. Please log in again.");
  }

  const user = await User.findById(payload.userId);
  if (!user || (!user.is_active && user.status !== "pending")) throw new AuthError("Account unavailable.");

  await RefreshToken.deleteOne({ _id: stored._id });
  return _issueTokens(user, ip, userAgent);
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(userId) {
  await RefreshToken.deleteMany({ userId });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _validateStepToken(token, expectedStep) {
  const { verifyStepToken } = await import("../utils/token.js");
  let payload;
  try {
    payload = verifyStepToken(token);
  } catch {
    throw new AuthError("Step token expired or invalid. Please start over.");
  }

  if (payload.step !== expectedStep) throw new AuthError("Invalid auth step.");

  const user = await User.findById(payload.userId).select("active_step_token_id lock_until");
  if (!user || user.active_step_token_id !== payload.tokenId) {
    throw new AuthError("Step token already used. Please start over.");
  }
  await _checkAccountLock(user);

  return payload;
}

async function _checkAccountLock(user) {
  if (user.lock_until && user.lock_until > new Date()) {
    const retryAfterMs = user.lock_until - new Date();
    const err = new AuthError("Account temporarily locked.");
    err.retryAfter = Math.ceil(retryAfterMs / 1000);
    throw err;
  }
  if (user.lock_until && user.lock_until <= new Date()) {
    await User.updateOne({ _id: user._id }, { lock_until: null });
  }
}

async function _issueTokens(user, ip = "", userAgent = "") {
  const version = Date.now();
  const accessToken = signAccessToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id, version });

  const tokenHash = await hashToken(refreshToken);

  await RefreshToken.deleteMany({ userId: user._id });
  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    refreshTokenVersion: version,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: ip,
    userAgent,
  });

  return { accessToken, refreshToken };
}

export default { checkDob, verifyName, verifyAnswer, register, refreshTokens, logout };
