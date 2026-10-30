// The vertical city (M3-57, U-023, U-024): over the rows of buildings along the streets, what makes Chongqing
// Chongqing, in 2038. Skybridges between buildings facing each other across a road, the deck at the lower roof and
// the higher one's edge a mantle up from it; blocks built across the lanes, the lane running on under them, their
// roofs carrying on from the lower roof; streets on the roof, where a street up the hill runs past a building's
// back at its roof: a ramp across onto the roof (it is entered there and at its foot); megastructures stacked
// over runs of roofs on columns, cantilevered over the street, a screen on the front and a ladder up the back;
// billboards across the widest gaps in a row, for a wall-run along the back of the screen.
import { solid, rampSolid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand, randInt } from '../../sim/rng';
import { ENVELOPE as E } from '../../data/envelope';
import type { Heightfield } from '../heightfield';
import type { Climbable, Feature } from '../world';
import { ROAD, streetCells, type Street } from './ground';
import type { Plan } from './lots';

const FLOOR = 3, PARAPET = 0.6;
export interface Vertical { solids: Solid[]; decor: Solid[]; far: Solid[]; climbables: Climbable[]; features: Feature[] }

/** A row lot's frame: u along its street, n out of its front (its own +z). */
const frame = (p: Plan) => { const c = Math.cos(p.obb.yaw), s = Math.sin(p.obb.yaw); return { ux: c, uz: s, nx: -s, nz: c }; };
/** A world point in p's frame: [along, out]. */
const local = (p: Plan, x: number, z: number): [number, number] => { const f = frame(p), dx = x - p.obb.cx, dz = z - p.obb.cz; return [dx * f.ux + dz * f.uz, dx * f.nx + dz * f.nz]; };
/** p's frame to the map. */
const world = (p: Plan, a: number, d: number): [number, number] => { const f = frame(p); return [p.obb.cx + a * f.ux + d * f.nx, p.obb.cz + a * f.uz + d * f.nz]; };
/** A box in p's frame (along a0..a1, out d0..d1), turned into place. */
const box = (p: Plan, a0: number, a1: number, d0: number, d1: number, y0: number, y1: number, mat: number): Solid =>
  turn([solid(p.obb.cx + a0, y0, p.obb.cz + d0, p.obb.cx + a1, y1, p.obb.cz + d1, mat)], p.obb.yaw, p.obb.cx, p.obb.cz)[0];
/** Set a flexible lot's roof to the floor nearest y within its range; false if it can't come within tol of y. */
const refloor = (p: Plan, y: number, tol: number) => {
  if (!p.flex) return false;
  const n = Math.max(p.flex[0], Math.min(p.flex[1], Math.round((y - p.base) / FLOOR))), w = p.base + n * FLOOR;
  if (Math.abs(w - y) > tol) return false;
  p.wall = w;
  return true;
};
const parallel = (a: Plan, b: Plan, k: number) => Math.abs(Math.cos(a.obb.yaw - b.obb.yaw)) > k;

export function verticalCity(plans: Plan[], g: Heightfield, sts: Street[]): Vertical {
  const out: Vertical = { solids: [], decor: [], far: [], climbables: [], features: [] }, r = makeRng(hashString('vertical')), used = new Set<Plan>();
  const yAt = (x: number, z: number) => g.y[Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)))];
  const feature = (kind: string, p: Plan, a: number, d: number, y: number, group = out.features.length) => { const [x, z] = world(p, a, d), f = frame(p); out.features.push({ kind, x, y, z, group, nx: f.nx, nz: f.nz }); };
  const rows = new Map<string, Plan[]>();
  for (const p of plans) if (p.row && /^\d+:/.test(p.row) && !p.far && p.kind === 'res') { const a = rows.get(p.row); if (a) a.push(p); else rows.set(p.row, [p]); }

  // Across the street: buildings facing each other, overlapping along it.
  let bridges = 0, lanes = 0;
  for (const [key, as] of rows) {
    const [si, side] = key.split(':');
    const bs = rows.get(`${si}:-1`), st = sts[+si];
    if (side !== '1' || !bs || !st) continue;
    const road = ROAD.has(st.kind);
    if (!road && st.w > 6) continue;
    for (const a of as) for (const b of bs) {
      if (used.has(a) || used.has(b) || !parallel(a, b, 0.985)) continue;
      const [al, ad] = local(a, b.obb.cx, b.obb.cz), o0 = Math.max(-a.obb.hw, al - b.obb.hw), o1 = Math.min(a.obb.hw, al + b.obb.hw);
      const z0 = a.obb.hd, z1 = ad - b.obb.hd, m = (o0 + o1) / 2;
      if (o1 - o0 < 6 || z1 - z0 < 3 || z1 - z0 > 40) continue;
      const ground = Math.max(...[0.15, 0.5, 0.85].flatMap(t => [m - 2, m + 2].map(u => yAt(...world(a, u, z0 + (z1 - z0) * t)))));
      if (road) {
        // A skybridge, one pair in two up to 40: the deck at the lower roof, the higher roof's edge a mantle up.
        if (bridges >= 40 || rand(r) > 0.5) continue;
        if (Math.abs(a.wall - b.wall) > 1.6 && !refloor(b, a.wall, 1.6) && !refloor(a, b.wall, 1.6)) continue;
        const y = Math.min(a.wall, b.wall);
        if (y < ground + 9) continue;
        out.solids.push(box(a, m - 1.7, m + 1.7, z0 - 0.35, z1 + 0.35, y - 0.45, y, MAT.concrete));
        for (const k of [-1, 1]) out.solids.push(box(a, m + k * 1.65 - 0.05, m + k * 1.65 + 0.05, z0 - 0.35, z1 + 0.35, y, y + 1.1, MAT.glass));
        // Ribs of a canopy over it, a strip light along their crowns.
        for (let z = z0 + 1; z < z1 - 0.5; z += 3) {
          for (const k of [-1, 1]) out.decor.push(box(a, m + k * 1.65 - 0.06, m + k * 1.65 + 0.06, z - 0.06, z + 0.06, y + 1.1, y + 2.9, MAT.metal));
          out.decor.push(box(a, m - 1.71, m + 1.71, z - 0.06, z + 0.06, y + 2.9, y + 3.02, MAT.metal));
        }
        out.decor.push(box(a, m - 0.05, m + 0.05, z0, z1, y + 2.86, y + 2.9, MAT.lamp));
        // Its two ends, where it meets each building.
        feature('skybridge', a, m, z0, y);
        feature('skybridge', a, m, z1, y, out.features.length - 1);
        bridges++;
      } else {
        // A block across the lane, one pair in two up to 40: up from a storey over it to the lower roof.
        if (lanes >= 40 || rand(r) > 0.5) continue;
        const y0 = ground + 4.5, y1 = Math.min(a.wall, b.wall), w = Math.min(o1 - o0 - 1, 6 + rand(r) * 6);
        if (y1 - y0 < 3) continue;
        out.solids.push(box(a, m - w / 2, m + w / 2, z0 - 0.2, z1 + 0.2, y0, y1, MAT.facade));
        out.far.push(out.solids[out.solids.length - 1]);
        feature('overLane', a, m, (z0 + z1) / 2, y0);
        lanes++;
      }
      used.add(a); used.add(b);
    }
  }

  // Streets on the roof: a street up the hill passing a building's back within 6 m, two floors or more over its
  // foot. Its roof comes to the street's level (to the floor nearest) and a ramp crosses to it.
  for (const p of plans) {
    if (used.has(p) || !p.flex || p.far || p.kind !== 'res' || !p.row || !/^\d+:/.test(p.row)) continue;
    let H = 0, d = 0;
    for (let k = 1; k <= 6 && !d; k++) {
      const [x, z] = world(p, 0, -p.obb.hd - k), c = Math.round(z / g.cell) * g.w + Math.round(x / g.cell);
      if (streetCells[c] && streetCells[c] !== 2 && g.y[c] >= p.base + 2 * FLOOR) { H = g.y[c]; d = k; }
    }
    if (!d || !refloor(p, H - PARAPET, 1.5)) continue;
    const top = p.wall + PARAPET, z0 = -p.obb.hd - d - 0.5, z1 = -p.obb.hd + 0.3;
    // The ramp rises toward its higher end: the street (-z, 4) or the roof (+z, 3).
    out.solids.push(turn([rampSolid(p.obb.cx - 1.6, Math.min(H, top) - 0.4, p.obb.cz + z0, p.obb.cx + 1.6, p.obb.cz + z1, Math.min(H, top), Math.max(H, top), H > top ? 4 : 3, MAT.concrete)], p.obb.yaw, p.obb.cx, p.obb.cz)[0]);
    for (const k of [-1, 1]) out.decor.push(box(p, k * 1.6 - 0.08, k * 1.6 + 0.08, z0 + 0.1, z0 + 0.26, Math.min(H, top), Math.max(H, top) + 1, MAT.metal));
    feature('roofStreet', p, 0, -p.obb.hd, top);
    used.add(p);
  }

  // Megastructures over runs of three or more roofs side by side (one run in three, up to 20): 4 to 8 floors
  // stacked on columns 4 m over the highest roof, out 3 m over the street.
  let megas = 0;
  for (const row of rows.values()) {
    for (let i = 0; i < row.length && megas < 20; ) {
      let j = i;
      const ok = (p: Plan) => !used.has(p) && p.wall - p.base >= 6;
      while (j + 1 < row.length && ok(row[j]) && ok(row[j + 1]) && parallel(row[i], row[j + 1], 0.995)) {
        const [al] = local(row[j], row[j + 1].obb.cx, row[j + 1].obb.cz);
        if (Math.abs(al) - row[j].obb.hw - row[j + 1].obb.hw > 3.5) break;
        j++;
      }
      const run = row.slice(i, j + 1);
      i = j + 1;
      if (run.length < 3 || rand(r) > 0.35) continue;
      const M = run[run.length >> 1], spans = run.map(p => { const [a] = local(M, p.obb.cx, p.obb.cz); return [a - p.obb.hw, a + p.obb.hw]; });
      const s0 = Math.min(...spans.map(s => s[0])), s1 = Math.max(...spans.map(s => s[1])), D = Math.min(18, ...run.map(p => 2 * p.obb.hd));
      if (s1 - s0 < 30 || s1 - s0 > 90) continue;
      const front = M.obb.hd, y0 = Math.max(...run.map(p => p.wall)) + PARAPET + 4.2, y1 = y0 + (4 + randInt(r, 5)) * 3.5;
      const mat = rand(r) < 0.6 ? MAT.facadeBand : MAT.facade;
      out.solids.push(box(M, s0, s1, front - D, front + 3, y0, y1, mat));
      out.far.push(out.solids[out.solids.length - 1]);
      for (const [a0, a1, d0, d1] of [[s0, s1, front - D, front - D + 0.3], [s0, s1, front + 2.7, front + 3], [s0, s0 + 0.3, front - D, front + 3], [s1 - 0.3, s1, front - D, front + 3]]) out.solids.push(box(M, a0, a1, d0, d1, y1, y1 + 1, MAT.concrete));
      // A screen across the front; columns down onto each roof; a ladder up the back from the middle roof.
      const sw = Math.min(16, s1 - s0 - 4), sm = (s0 + s1) / 2;
      out.decor.push(box(M, sm - sw / 2, sm + sw / 2, front + 3, front + 3.04, y0 + 1.5, y0 + 1.5 + Math.min(7, y1 - y0 - 3), MAT.screen));
      for (const p of run) {
        const [a] = local(M, p.obb.cx, p.obb.cz);
        for (const u of [a - p.obb.hw + 1.2, a + p.obb.hw - 1.2]) for (const d of [front - 1.2, front - D + 1.2]) out.solids.push(box(M, u - 0.45, u + 0.45, d - 0.45, d + 0.45, p.wall, y0, MAT.concrete));
        used.add(p);
      }
      const [lx, lz] = world(M, 0.8, front - D), f = frame(M);
      out.solids.push(box(M, 0.4, 1.2, front - D + 0.05, front - D + 0.65, M.wall, y0, MAT.concrete));
      out.climbables.push({ kind: 'ladder', x: lx, z: lz, y0: M.wall, y1: y1 + 1, nx: -f.nx, nz: -f.nz });
      feature('mega', M, sm, front - D / 2, y0);
      megas++;
    }
  }

  // Billboards across the widest gaps along a row, the roofs either side within 2 m: a wall-run along the back.
  for (const row of rows.values()) for (let i = 0; i + 1 < row.length; i++) {
    const a = row[i], b = row[i + 1];
    if (!parallel(a, b, 0.99) || Math.abs(a.wall - b.wall) > 2 || a.wall - a.base < 6 || b.wall - b.base < 6) continue;
    const [al] = local(a, b.obb.cx, b.obb.cz), gap = Math.abs(al) - a.obb.hw - b.obb.hw, k = Math.sign(al);
    if (gap <= E.runningJump.max || gap > E.wallRun.comfortable) continue;
    const e0 = k * (a.obb.hw - 1.5), e1 = al - k * (b.obb.hw - 1.5), lo = Math.min(a.wall, b.wall) - 2, hi = Math.max(a.wall, b.wall) + 4.5, z = a.obb.hd;
    out.solids.push(box(a, Math.min(e0, e1), Math.max(e0, e1), z + 0.05, z + 0.35, lo, hi, MAT.metal));
    out.decor.push(box(a, Math.min(e0, e1) + 0.3, Math.max(e0, e1) - 0.3, z + 0.35, z + 0.38, lo + 0.4, hi - 0.4, MAT.screen));
    feature('billboard', a, (e0 + e1) / 2, z, Math.min(a.wall, b.wall));
  }
  return out;
}
