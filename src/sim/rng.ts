// Seeded RNG (mulberry32). The state lives in the sim state object so saves and replays stay exact.
export interface Rng { s: number }

export function makeRng(seed: number): Rng {
  return { s: (seed >>> 0) || 1 };
}

export function rand(r: Rng): number {
  let t = (r.s = (r.s + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const randRange = (r: Rng, a: number, b: number) => a + (b - a) * rand(r);
export const randInt = (r: Rng, n: number) => Math.floor(rand(r) * n);
export const chance = (r: Rng, p: number) => rand(r) < p;

/** FNV-1a hash of a string, for state hashes and deriving sub-seeds. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
