// Player-box collision against the world: horizontal moves with step-up, vertical sweeps, ground probes.
import { query, overlaps, topOver, xzHit, groundBox, type Box, type Solid, type SolidIndex } from '../world/geom';
import type { Vec3 } from './types';
import { movement as M } from '../data/movement';

const HW = M.width / 2;
const EPS = 1e-4;
const ids: number[] = [], near: Solid[] = [];

/** Solids whose footprint may touch the box, plus the ground's shell under it. Reuses one array. */
function nearby(idx: SolidIndex, b: Box): Solid[] {
  near.length = 0;
  for (const i of query(idx, b.x0, b.z0, b.x1, b.z1, ids)) near.push(idx.solids[i]);
  const g = groundBox(idx, b.x0, b.z0, b.x1, b.z1);
  if (g) near.push(g);
  return near;
}

export function boxAt(x: number, y: number, z: number, h: number, hw = HW): Box {
  return { x0: x - hw, y0: y, z0: z - hw, x1: x + hw, y1: y + h, z1: z + hw };
}

export const free = (idx: SolidIndex, x: number, y: number, z: number, h: number, hw = HW) => !overlaps(idx, boxAt(x, y, z, h, hw));

/** Highest top among solids overlapping the box, or -Infinity. */
function overlapTop(idx: SolidIndex, b: Box): number {
  let top = -Infinity;
  for (const s of nearby(idx, b)) {
    if (b.x1 <= s.x0 + 1e-6 || b.x0 >= s.x1 - 1e-6 || b.z1 <= s.z0 + 1e-6 || b.z0 >= s.z1 - 1e-6) continue;
    if (s.rot && !xzHit(s, b.x0, b.z0, b.x1, b.z1)) continue;
    const t = topOver(s, b.x0, b.z0, b.x1, b.z1);
    if (b.y1 <= s.y0 + 1e-6 || b.y0 >= t - 1e-6) continue;
    if (t > top) top = t;
  }
  return top;
}

/**
 * Move the feet horizontally by (dx, dz), stepping up to `step` metres when blocked.
 * Returns which axes were blocked (bit 1 = x, bit 2 = z) so callers can kill velocity.
 */
export function moveHorizontal(idx: SolidIndex, pos: Vec3, h: number, dx: number, dz: number, step: number): number {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.1));
  const sx = dx / n, sz = dz / n;
  let blocked = 0;
  for (let i = 0; i < n; i++) {
    if (tryMove(idx, pos, h, (blocked & 1) ? 0 : sx, (blocked & 2) ? 0 : sz, step)) continue;
    // Slide along whichever axis is free; find how far the blocked axis can go.
    if (sx !== 0 && !(blocked & 1) && !tryMove(idx, pos, h, sx, 0, step)) { approach(idx, pos, h, sx, 0); blocked |= 1; }
    if (sz !== 0 && !(blocked & 2) && !tryMove(idx, pos, h, 0, sz, step)) { approach(idx, pos, h, 0, sz); blocked |= 2; }
  }
  return blocked;
}

function tryMove(idx: SolidIndex, pos: Vec3, h: number, dx: number, dz: number, step: number): boolean {
  if (dx === 0 && dz === 0) return true;
  const b = boxAt(pos.x + dx, pos.y, pos.z + dz, h);
  const top = overlapTop(idx, b);
  if (top === -Infinity) { pos.x += dx; pos.z += dz; return true; }
  const lift = top - pos.y;
  if (lift > 0 && lift <= step + EPS && free(idx, pos.x + dx, top + EPS, pos.z + dz, h)) {
    pos.x += dx; pos.z += dz; pos.y = top + EPS;
    return true;
  }
  return false;
}

/** Binary-search the largest free fraction of a blocked move so the box ends flush with the wall. */
function approach(idx: SolidIndex, pos: Vec3, h: number, dx: number, dz: number) {
  let lo = 0, hi = 1;
  for (let k = 0; k < 8; k++) {
    const m = (lo + hi) / 2;
    if (free(idx, pos.x + dx * m, pos.y, pos.z + dz * m, h)) lo = m; else hi = m;
  }
  pos.x += dx * lo; pos.z += dz * lo;
}

/** Sweep the feet vertically by dy. Returns +1 if it landed, -1 if it hit a ceiling, 0 otherwise. */
export function moveVertical(idx: SolidIndex, pos: Vec3, h: number, dy: number): number {
  const b = boxAt(pos.x, pos.y, pos.z, h);
  let d = dy, hit = 0;
  // Feet a little inside the ground (a teleport, a spawn) come back up onto it rather than sinking through.
  const g = dy <= 0 ? groundBox(idx, b.x0, b.z0, b.x1, b.z1) : null;
  if (g && b.y0 < g.y1 && b.y0 > g.y1 - 1.5) { pos.y = g.y1 + 1e-4; return 1; }
  const y0 = Math.min(b.y0, b.y0 + dy), y1 = Math.max(b.y1, b.y1 + dy);
  for (const s of nearby(idx, b)) {
    if (b.x1 <= s.x0 + 1e-6 || b.x0 >= s.x1 - 1e-6 || b.z1 <= s.z0 + 1e-6 || b.z0 >= s.z1 - 1e-6) continue;
    if (s.rot && !xzHit(s, b.x0, b.z0, b.x1, b.z1)) continue;
    const top = topOver(s, b.x0, b.z0, b.x1, b.z1);
    if (y1 <= s.y0 || y0 >= top) continue;
    if (dy < 0 && b.y0 >= top - 0.02) { const lim = top - b.y0; if (lim > d) { d = lim; hit = 1; } }
    else if (dy > 0 && b.y1 <= s.y0 + 0.02) { const lim = s.y0 - b.y1; if (lim < d) { d = Math.max(0, lim); hit = -1; } }
  }
  pos.y += d;
  return hit;
}

/** Distance from the feet down to the highest support under the footprint, up to maxDrop; Infinity if none. */
export function groundGap(idx: SolidIndex, pos: Vec3, maxDrop: number): number {
  const b = boxAt(pos.x, pos.y - maxDrop, pos.z, maxDrop);
  let best = Infinity;
  for (const s of nearby(idx, b)) {
    if (b.x1 <= s.x0 + 1e-6 || b.x0 >= s.x1 - 1e-6 || b.z1 <= s.z0 + 1e-6 || b.z0 >= s.z1 - 1e-6) continue;
    if (s.rot && !xzHit(s, b.x0, b.z0, b.x1, b.z1)) continue;
    const top = topOver(s, b.x0, b.z0, b.x1, b.z1);
    if (top > pos.y + 0.02 || s.y0 > pos.y) continue;
    const gap = pos.y - top;
    if (gap <= maxDrop && gap < best) best = gap;
  }
  return best < 0 ? 0 : best;
}
