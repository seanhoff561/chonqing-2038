// Li Wei's construction site (M3-41c) on the real plot under construction at Jiaochangkou (重庆日月光中心四期):
// the plot dug out to its lowest ground behind shoring walls topped with hoarding, a gate where the street outside
// is lowest; the half-built tower's concrete frame (columns and slabs, a switchback stair up its core, a ladder
// up one corner, the top floors bare columns with rebar); the tower crane beside it with a ladder up the mast
// to the cab and the jib; site containers. Laid out square to the plot's fitted rectangle, then turned.
import { solid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import { GEO } from '../geo';
import type { Heightfield } from '../heightfield';
import type { Climbable, Prop } from '../world';
import { stair } from '../steps';
import { minRect, points, rasterPoly, inside, type Obb, type P2 } from './shapes';

export interface Site {
  solids: Solid[]; decor: Solid[]; climbables: Climbable[]; props: Prop[]; plot: Obb; poly: P2[]; base: number; frame: { x: number; z: number; top: number }; crane: { x: number; z: number; top: number };
  /** a walk from the ground up the stair core to the top slab, for tests and pursuers */
  route: { x: number; y: number; z: number }[];
}

const hAt = (g: Heightfield, x: number, z: number) => g.y[Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)))];
/** The tower: 6 x 4 bays of 6 m, 14 floors of 3.6 m cast, 4 of bare columns above; the stair core in its north-east corner. */
const BAYS = [5, 4], BAY = 6, FLOORS = 14, BARE = 4, F = 3.6, CORE = 4;

export const sitePoly = (): P2[] | null => {
  const a = GEO.areas.find(x => x[0] === 'construction' && x[1].includes('日月光'));
  return a ? points(a[2], 0.1) : null;
};

export function buildSite(g: Heightfield): Site | null {
  const poly = sitePoly();
  if (!poly) return null;
  const o = minRect(poly), c = Math.cos(o.yaw), s = Math.sin(o.yaw);
  /** Local (unturned about the rectangle's middle) to the map and back. */
  const P = (x: number, z: number): P2 => [o.cx + c * (x - o.cx) - s * (z - o.cz), o.cz + s * (x - o.cx) + c * (z - o.cz)];
  const local = poly.map(([x, z]): P2 => [o.cx + c * (x - o.cx) + s * (z - o.cz), o.cz - s * (x - o.cx) + c * (z - o.cz)]);
  const solids: Solid[] = [], decor: Solid[] = [], props: Prop[] = [], climb: Climbable[] = [], mapSolids: Solid[] = [];
  // Dug out to the lowest ground on the plot.
  let base = Infinity;
  rasterPoly(poly, 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) base = Math.min(base, g.y[k]); });
  rasterPoly(poly, 0, 0, g.cell, g.w, g.h, (i0, i1, j) => g.y.fill(base, j * g.w + i0, j * g.w + i1 + 1));
  // Shoring up to the ground outside each 8 m of edge, hoarding 2.4 m over that; a gate where outside is lowest.
  const pieces: { cx: number; cz: number; len: number; yaw: number; lo: number; hi: number }[] = [];
  for (let k = 0; k < poly.length; k++) {
    const [ax, az] = poly[k], [bx, bz] = poly[(k + 1) % poly.length], len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 8);
    if (len < 0.5) continue;
    let nx = (bz - az) / len, nz = -(bx - ax) / len;
    if (inside(poly, (ax + bx) / 2 + nx, (az + bz) / 2 + nz)) { nx = -nx; nz = -nz; }
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
      const out = [[x0, z0], [x1, z1], [(x0 + x1) / 2, (z0 + z1) / 2]].map(([x, z]) => hAt(g, x + nx * 2.5, z + nz * 2.5));
      pieces.push({ cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, len: len / n, yaw: Math.atan2(bz - az, bx - ax), lo: Math.min(...out), hi: Math.max(...out) });
    }
  }
  const gate = pieces.filter(p => p.len >= 5).reduce((a, p) => (p.lo < a.lo ? p : a));
  for (const p of pieces) {
    const x0 = p.cx - p.len / 2 - 0.15, x1 = p.cx + p.len / 2 + 0.15, shore = Math.max(base, p.lo), cap = Math.max(base, p.hi) + 2.4;
    if (p === gate) {
      for (const x of [x0, x1 - 0.3]) mapSolids.push(...turn([solid(x, base, p.cz - 0.15, x + 0.3, cap + 0.6, p.cz + 0.15, MAT.metal)], p.yaw, p.cx, p.cz));
      continue;
    }
    mapSolids.push(...turn([solid(x0, base - 0.5, p.cz - 0.15, x1, shore, p.cz + 0.15, MAT.concrete), solid(x0, shore, p.cz - 0.12, x1, cap, p.cz + 0.12, MAT.metal)], p.yaw, p.cx, p.cz));
  }

  // The tower where its footprint and the crane beside it fit inside the plot, nearest the plot's middle.
  const W = BAYS[0] * BAY, D = BAYS[1] * BAY, fits = (x0: number, z0: number, x1: number, z1: number) => [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].every(([x, z]) => inside(local, x, z));
  let best: P2 | null = null, bd = Infinity;
  for (let x = o.cx - o.hw; x < o.cx + o.hw; x += 2) for (let z = o.cz - o.hd; z < o.cz + o.hd; z += 2) {
    if (!fits(x - 3, z - 3, x + W + 12, z + D + 3)) continue;
    const d = Math.hypot(x + W / 2 - o.cx, z + D / 2 - o.cz);
    if (d < bd) { bd = d; best = [x, z]; }
  }
  if (!best) return null;
  const [tx0, tz0] = best, tx1 = tx0 + W, tz1 = tz0 + D, roof = base + FLOORS * F, cx0 = tx1 - CORE;
  for (let f = 1; f <= FLOORS; f++) {
    const y = base + f * F;
    solids.push(solid(tx0, y - 0.25, tz0, cx0, y, tz1, MAT.concrete), solid(cx0, y - 0.25, tz0 + CORE, tx1, y, tz1, MAT.concrete));
  }
  for (let i = 0; i <= BAYS[0]; i++) for (let j = 0; j <= BAYS[1]; j++) {
    const x = tx0 + i * BAY, z = tz0 + j * BAY;
    solids.push(solid(x - 0.3, base, z - 0.3, x + 0.3, roof + BARE * F, z + 0.3, MAT.concrete));
    decor.push(solid(x - 0.05, roof + BARE * F, z - 0.05, x + 0.05, roof + BARE * F + 1.5, z + 0.05, MAT.metal));
  }
  // The stair core: two flights a floor, a landing between, open to the slabs. Each flight is laid in three
  // pieces so its underside steps up with it, leaving headroom on the flight below.
  const flight = (z0: number, z1: number, low: number, up: boolean) => {
    for (let i = 0; i < 3; i++) {
      const a = cx0 + i, lo = low + (F / 6) * (up ? i : 2 - i);
      stair(a, z0, a + 1, z1, lo, lo + F / 6, up ? 1 : 2, solids, decor);
    }
  };
  for (let f = 0; f < FLOORS; f++) {
    const y = base + f * F;
    flight(tz0, tz0 + 1.8, y, true);
    solids.push(solid(cx0 + 3, y + F / 2 - 0.25, tz0, tx1, y + F / 2, tz0 + CORE, MAT.concrete));
    flight(tz0 + 2.2, tz0 + CORE, y + F / 2, false);
  }
  const route: { x: number; y: number; z: number }[] = [{ x: cx0 - 2, y: base, z: tz0 + 0.9 }];
  for (let f = 0; f < FLOORS; f++) {
    const y = base + f * F;
    route.push({ x: cx0 + 3.4, y: y + F / 2, z: tz0 + 0.9 }, { x: cx0 + 3.4, y: y + F / 2, z: tz0 + 3.1 }, { x: cx0 - 1, y: y + F, z: tz0 + 3.1 }, { x: cx0 - 1, y: y + F, z: tz0 + 0.9 });
  }
  // A ladder lashed up the south-west corner: the quick way, not the safe one.
  climb.push({ kind: 'ladder', x: tx0 + 1.5, z: tz1 + 0.35, y0: base, y1: roof, nx: 0, nz: 1 });
  // The tower crane east of the frame: mast with a ladder up its face, cab, jib over the frame, counter-jib.
  const mx = tx1 + 7, mz = (tz0 + tz1) / 2, top = roof + BARE * F + 18;
  solids.push(solid(mx - 1, base, mz - 1, mx + 1, top, mz + 1, MAT.metal));
  climb.push({ kind: 'ladder', x: mx - 1.05, z: mz, y0: base, y1: top + 2, nx: -1, nz: 0 });
  solids.push(solid(mx - 1.5, top, mz - 1.5, mx + 1.5, top + 2.5, mz + 1.5, MAT.metal));
  solids.push(solid(mx - 50, top + 2.5, mz - 0.6, mx + 14, top + 3.6, mz + 0.6, MAT.metal), solid(mx + 6, top + 3.6, mz - 1.4, mx + 13, top + 6, mz + 1.4, MAT.concrete));
  decor.push(solid(mx - 0.3, top + 3.6, mz - 0.3, mx + 0.3, top + 9, mz + 0.3, MAT.metal));
  // The hook hangs where the work stopped, over the frame, a skip of rebar on it.
  decor.push(solid(mx - 30.05, roof + BARE * F + 3, mz - 0.05, mx - 29.95, top + 2.5, mz + 0.05, MAT.metal));
  solids.push(solid(mx - 31.2, roof + BARE * F + 1.8, mz - 0.9, mx - 28.8, roof + BARE * F + 3, mz + 0.9, MAT.metal));
  // Site containers south of the frame, where they fit, and the mess round them.
  for (let i = 0; i < 3; i++) {
    const x0 = tx0 + i * 6.4, z0 = tz1 + 5;
    if (fits(x0, z0, x0 + 6, z0 + 2.4)) solids.push(solid(x0, base, z0, x0 + 6, base + 2.6, z0 + 2.4, MAT.metal));
  }
  props.push({ kind: 'boxes', x: tx1 + 2, y: base, z: tz1 + 2, yaw: 0.3 }, { kind: 'debris', x: tx0 + 3, y: base, z: tz1 + 3, yaw: 1 },
    { kind: 'rubblepile', x: tx0 - 2, y: base, z: tz0 + 4, yaw: 0, w: 3 }, { kind: 'sandbags', x: tx0 + 9, y: base, z: tz1 + 2, yaw: 0 });
  const [fx, fz] = P((tx0 + tx1) / 2, (tz0 + tz1) / 2), [kx, kz] = P(mx, mz);
  return {
    solids: turn(solids, o.yaw, o.cx, o.cz).concat(mapSolids), decor: turn(decor, o.yaw, o.cx, o.cz), plot: o, poly, base,
    frame: { x: fx, z: fz, top: roof }, crane: { x: kx, z: kz, top }, route: route.map(q => { const [x, z] = P(q.x, q.z); return { ...q, x, z }; }),
    climbables: climb.map(q => { const [x, z] = P(q.x, q.z); return { ...q, x, z, nx: c * q.nx - s * q.nz, nz: s * q.nx + c * q.nz }; }),
    props: props.map(q => { const [x, z] = P(q.x, q.z); return { ...q, x, z, yaw: q.yaw - o.yaw }; }),
  };
}
