// What the open ground should become (M3-56a, U-029, U-030), for M3-56 to fill: on a 4 m grid, every patch of
// land off the streets, the buildings and the set pieces, sorted by the ground and the real map. Rough ground
// (steep or broken: the embankments and slopes between lots and streets) near the buildings is where the city's
// war left its debris: ruins. Land away from the buildings (river banks, hillsides) has gone back to woods and
// grass. The real map's parks, grass, woods and scrub are parks. What's left is flat open ground among the
// buildings, to fill with what belongs there.
import { GEO } from '../geo';
import type { Heightfield } from '../heightfield';
import type { Plot } from '../world';
import { points, rasterPoly } from './shapes';
import { streetCells } from './ground';

export const MARK_CELL = 4;
export const MARK = { ruin: 1, wood: 2, park: 3, open: 4 } as const;
export interface Marks { cell: number; w: number; h: number; m: Uint8Array }

/** How near a building ground counts as the city's (beyond, it's gone wild), and how steep or broken is rough. */
const RUIN_REACH = 24, STEEP = 0.7, BUMP = 0.6;

/** land: 1 on the peninsula; block: the set pieces' ground cells. */
export function findMarks(g: Heightfield, land: Uint8Array, plots: Plot[], block: Uint8Array): Marks {
  const f = MARK_CELL / g.cell, w = Math.floor((g.w - 1) / f), h = Math.floor((g.h - 1) / f), m = new Uint8Array(w * h);
  const ground = (mask: Uint8Array, poly: [number, number][]) => rasterPoly(poly, 0, 0, g.cell, g.w, g.h, (i0, i1, j) => mask.fill(1, j * g.w + i0, j * g.w + i1 + 1));
  const foot = new Uint8Array(g.y.length), park = new Uint8Array(g.y.length);
  for (const p of plots) if (!p.far) ground(foot, p.corners);
  for (const [kind, , pts] of GEO.areas) if (kind === 'park' || kind === 'pitch') ground(park, points(pts, 0.1));
  // Mark cells with a building in them, grown by RUIN_REACH (a max filter along rows, then columns).
  const built = new Uint8Array(w * h), n = Math.ceil(RUIN_REACH / MARK_CELL);
  /** Whether fn holds at a ground sample in mark cell (i, j), or within pad samples round it. */
  const cellOf = (fn: (k: number) => boolean | number, i: number, j: number, pad = 0) => {
    for (let b = -pad; b <= f + pad; b++) for (let a = -pad; a <= f + pad; a++) {
      const x = i * f + a, z = j * f + b;
      if (x >= 0 && z >= 0 && x < g.w && z < g.h && fn(z * g.w + x)) return true;
    }
    return false;
  };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) built[j * w + i] = cellOf(k => foot[k], i, j) ? 1 : 0;
  const rows = built.slice();
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (built[j * w + i]) for (let a = Math.max(0, i - n); a <= Math.min(w - 1, i + n); a++) rows[j * w + a] = 1;
  const near = rows.slice();
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (rows[j * w + i]) for (let b = Math.max(0, j - n); b <= Math.min(h - 1, j + n); b++) near[b * w + i] = 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k0 = j * f * g.w + i * f;
    if (land[k0] !== 1 || cellOf(k => foot[k] || block[k], i, j) || cellOf(k => streetCells[k], i, j, 1)) continue;
    // Steepest step between neighbouring samples, and how far the middle stands off its ring.
    let steep = 0, ring = 0;
    for (let b = 0; b <= f; b++) for (let a = 0; a <= f; a++) {
      const k = (j * f + b) * g.w + i * f + a;
      if (a < f) steep = Math.max(steep, Math.abs(g.y[k + 1] - g.y[k]) / g.cell);
      if (b < f) steep = Math.max(steep, Math.abs(g.y[k + g.w] - g.y[k]) / g.cell);
      if (a !== 1 || b !== 1) ring += g.y[k] / 8;
    }
    const bump = Math.abs(g.y[k0 + g.w + 1] - ring);
    m[j * w + i] = cellOf(k => park[k], i, j) ? MARK.park : !near[j * w + i] ? MARK.wood : steep > STEEP || bump > BUMP ? MARK.ruin : MARK.open;
  }
  return { cell: MARK_CELL, w, h, m };
}

/** The mark at (x, z), 0 off the grid. */
export const markAt = (mk: Marks, x: number, z: number) => {
  const i = Math.floor(x / mk.cell), j = Math.floor(z / mk.cell);
  return i < 0 || j < 0 || i >= mk.w || j >= mk.h ? 0 : mk.m[j * mk.w + i];
};

/** Whether grass grows at (x, z) (M3-56b): all over the parks and the woods, in patches on the open ground. */
export function grassAt(mk: Marks, x: number, z: number): boolean {
  const m = markAt(mk, x, z);
  return m === MARK.park || m === MARK.wood || (m === MARK.open && Math.sin(x * 0.083 + z * 0.051) * Math.sin(x * 0.047 - z * 0.069) + 0.3 * Math.sin(x * 0.31 + z * 0.27) > -0.1);
}
