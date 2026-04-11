import mongoose from "mongoose";
import Counter from "../models/Counter.js";
import User from "../models/User.js";

// ── Atomic orbitIndex (no race condition) ─────────────────────────────────────

export async function getNextOrbitIndex() {
  const counter = await Counter.findOneAndUpdate(
    { name: "orbitIndex" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
}

// ── Generate planet slug ───────────────────────────────────────────────────────

export function generateSlug(name, userId) {
  const short = userId.toString().slice(-8);
  return `${name.toLowerCase().replace(/\s+/g, "-")}-${short}`;
}

// ── Create user with unique planet name (try-insert on collision) ──────────────

export async function createUserWithUniquePlanet(userData, planetData, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const planetName = attempt === 0
      ? planetData.name
      : `${planetData.name}-${attempt + 1}`;

    // Pre-generate _id so we can derive the slug from it
    const tempId = new mongoose.Types.ObjectId();
    const slug   = generateSlug(planetName, tempId);

    try {
      const user = await User.create({
        ...userData,
        _id: tempId,
        planet: { ...planetData, name: planetName, slug },
      });
      return user;
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.["planet.name"]) {
        continue; // Name collision — try next suffix
      }
      throw err;
    }
  }
  throw new Error("Could not generate unique planet name. Please try again.");
}

// ── Rename planet (with 24hr cooldown) ────────────────────────────────────────

export async function renamePlanet(userId, newName) {
  const user = await User.findById(userId).select("last_renamed_at planet");

  if (user.last_renamed_at) {
    const hoursSince = (Date.now() - user.last_renamed_at) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      const hoursLeft = Math.ceil(24 - hoursSince);
      const err = new Error(`You can rename your planet in ${hoursLeft} hour(s).`);
      err.status = 429;
      throw err;
    }
  }

  const newSlug = generateSlug(newName, userId);

  try {
    return await User.findByIdAndUpdate(
      userId,
      { "planet.name": newName, "planet.slug": newSlug, last_renamed_at: new Date() },
      { new: true, runValidators: true }
    ).select("planet last_renamed_at");
  } catch (err) {
    if (err.code === 11000) {
      const conflict = new Error("Planet name already taken.");
      conflict.status = 409;
      throw conflict;
    }
    throw err;
  }
}

export default { getNextOrbitIndex, generateSlug, createUserWithUniquePlanet, renamePlanet };
