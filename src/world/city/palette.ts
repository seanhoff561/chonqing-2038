// Building colours (M3-46, U-020), after the reference photos: Chongqing is mostly grey, cream and white render
// and ceramic tile, pale yellow and blue-grey walk-ups, brown-grey brick in the old quarters, curtain walls in
// blue, teal, silver, bronze and smoke on the towers. Faded salmon tile exists but is rare. All of it muted to near
// monotone (M3-79, U-043): years of grime and sun leave a fifth of each colour, so the city's colour is its light
// (neon, screens, lamps, the machines).
import { MAT } from '../mats';
import { rand, type Rng } from '../../sim/rng';

/** How much of a colour's own hue is left. */
const KEEP = 0.2;
const mute = (c: number) => {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, y = 0.3 * r + 0.59 * g + 0.11 * b, m = (v: number) => Math.round(y + (v - y) * KEEP);
  return (m(r) << 16) | (m(g) << 8) | m(b);
};

const RENDER = [0xd8d4cc, 0xcfcac0, 0xe4e0d6, 0xc4c0b8, 0xd8cdb4, 0xcfc6a8, 0xc8cfcf, 0xbfc6c2, 0xb8b4ac, 0xd0d4c8, 0xe0d8c0].map(mute);
const TILE = [0xeeeeea, 0xe6e2da, 0xdcd8d0, 0xd6dce0, 0xe8dcc8, 0xe2e4dc, 0xd8d0c0, 0xe0e6e8].map(mute);
const SALMON = mute(0xe8c8b8);
const BRICK = [0xb8a890, 0xa89880, 0x9a8c7c, 0xb0a494, 0x8c8478, 0xa49484].map(mute);
export const GLASS = [0x7a9ab8, 0x6a8a8a, 0xa8b4bc, 0x9a8468, 0x5a6470, 0x7a9a88, 0xb8c4cc, 0x8090a8, 0x4a5058].map(mute);
const STONE = [0xd8d4ca, 0xc8c0b0, 0xb0aca4, 0xe0dcd2, 0xcac6bc].map(mute);

export const pick = <T>(a: T[], r: Rng) => a[Math.floor(rand(r) * a.length)];

/** Materials a building's colour applies to (its walls, slabs, parapets and glass, not its fittings). */
export const PAINTED = new Set<number>([MAT.facade, MAT.facadeTile, MAT.facadeBrick, MAT.facadeOpen, MAT.facadeBand, MAT.plaster, MAT.tile, MAT.concrete, MAT.brick, MAT.glass, MAT.block]);

/** A colour for a building of material mat. */
export function tintFor(mat: number, r: Rng): number {
  if (mat === MAT.glass) return pick(GLASS, r);
  if (mat === MAT.brick || mat === MAT.facadeBrick) return pick(BRICK, r);
  if (mat === MAT.tile || mat === MAT.facadeTile) return rand(r) < 0.06 ? SALMON : pick(TILE, r);
  if (mat === MAT.facadeBand) return pick(STONE, r);
  return pick(RENDER, r);
}
