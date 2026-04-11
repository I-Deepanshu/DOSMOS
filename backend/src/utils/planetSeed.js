import crypto from "crypto";

const PLANET_TYPES = [
  {
    type: "Rocky",
    min: 0.00, max: 0.25,
    colors: ["#B5651D", "#8B4513", "#CD853F", "#A0522D"],
  },
  {
    type: "Ocean",
    min: 0.25, max: 0.50,
    colors: ["#0077B6", "#00B4D8", "#4FC3F7", "#48CAE4"],
  },
  {
    type: "Gas Giant",
    min: 0.50, max: 0.75,
    colors: ["#7B2FBE", "#E8871E", "#F4A261", "#9B5DE5"],
  },
  {
    type: "Ice",
    min: 0.75, max: 1.00,
    colors: ["#CAF0F8", "#ADE8F4", "#90E0EF", "#E0FBFC"],
  },
];

/**
 * Deterministic float 0..1 from dob + name.
 * Same inputs always produce the same planet.
 */
export function generateSeed(dob, name) {
  const normalized = `${dob.trim().toLowerCase()}:${name.trim().toLowerCase()}`;
  const hash = crypto.createHash("sha256").update(normalized).digest("hex");
  return parseInt(hash.slice(0, 8), 16) / 0xFFFFFFFF;
}

export function getPlanetType(seed) {
  return PLANET_TYPES.find((p) => seed >= p.min && seed < p.max) || PLANET_TYPES[0];
}

export function getPlanetColor(seed, planetType) {
  const colorSeed = (seed * 1000) % 1;
  const idx = Math.floor(colorSeed * planetType.colors.length);
  return planetType.colors[idx];
}
