// Phoneme tables for deterministic, pronounceable planet name generation
const ONSETS  = ["Zy", "Ve", "Ae", "Ny", "Th", "Kh", "Or", "El", "Ar", "Sy", "Ph", "Ix"];
const NUCLEI  = ["pha", "lar", "tho", "xar", "ori", "era", "yna", "ela", "ira", "ova"];
const CODAS   = ["ra", "ris", "ron", "nx", "rix", "lis", "vel", "nar", "zon", "rax"];

/**
 * Generate a pronounceable fantasy planet name from a 0..1 seed.
 * Examples: "Zyphora", "Velarix", "Aetheron", "Nyxara"
 */
export function generatePlanetName(seed) {
  const i1 = Math.floor(seed * ONSETS.length) % ONSETS.length;
  const i2 = Math.floor((seed * 37.3 % 1) * NUCLEI.length) % NUCLEI.length;
  const i3 = Math.floor((seed * 73.7 % 1) * CODAS.length)  % CODAS.length;
  return `${ONSETS[i1]}${NUCLEI[i2]}${CODAS[i3]}`;
}
