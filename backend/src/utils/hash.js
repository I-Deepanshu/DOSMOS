import bcrypt from "bcryptjs";
import { normalize } from "./normalize.js";

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12");

export async function hashAnswer(rawAnswer) {
  return bcrypt.hash(normalize(rawAnswer), BCRYPT_ROUNDS);
}

export async function compareAnswer(rawAnswer, hash) {
  return bcrypt.compare(normalize(rawAnswer), hash);
}

export async function hashToken(token) {
  return bcrypt.hash(token, 10);
}

export async function compareToken(token, hash) {
  return bcrypt.compare(token, hash);
}
