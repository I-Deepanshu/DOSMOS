import crypto from "crypto";

const PLANET_TYPES = [
  {
    type: "Rocky",
    min: 0.00, max: 0.25,
    hueRange: [15, 45],
    satRange: [40, 80],
    lightRange: [30, 50]
  },
  {
    type: "Ocean",
    min: 0.25, max: 0.50,
    hueRange: [180, 230],
    satRange: [60, 90],
    lightRange: [40, 60]
  },
  {
    type: "Gas Giant",
    min: 0.50, max: 0.75,
    hueRange: [250, 320], // purples/pinks
    satRange: [60, 90],
    lightRange: [40, 70]
  },
  {
    type: "Ice",
    min: 0.75, max: 1.00,
    hueRange: [170, 210],
    satRange: [30, 60],
    lightRange: [75, 90]
  },
];

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

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
  const hueSeed = (colorSeed * 13) % 1;
  const satSeed = (colorSeed * 17) % 1;
  const lightSeed = (colorSeed * 23) % 1;

  let h = planetType.hueRange[0] + hueSeed * (planetType.hueRange[1] - planetType.hueRange[0]);
  const s = planetType.satRange[0] + satSeed * (planetType.satRange[1] - planetType.satRange[0]);
  const l = planetType.lightRange[0] + lightSeed * (planetType.lightRange[1] - planetType.lightRange[0]);

  // Give Gas Giants a chance to be vibrant orange/yellow
  if (planetType.type === "Gas Giant" && colorSeed > 0.6) {
    h = 20 + hueSeed * 40; 
  }

  return hslToHex(h, s, l);
}
