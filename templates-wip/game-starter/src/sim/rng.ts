// Seeded randomness for everything in sim/. Math.random() cannot be seeded, so a
// level built with it could never be replayed, compared in a test or shared by
// link. The same seed gives the same sequence on every machine.

export type Rng = () => number;

// mulberry32: 32 bits of state, fast, good enough for level layout.
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turn a ?seed= value into a 32-bit seed. Numbers are used as they are; words are
// hashed (FNV-1a), so ?seed=tuesday is a valid, shareable level.
export function parseSeed(value: string | null | undefined, fallback = 1): number {
  if (value === null || value === undefined || value.trim() === '') return fallback >>> 0;
  const text = value.trim();
  if (/^\d+$/.test(text)) return Number(text) >>> 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
