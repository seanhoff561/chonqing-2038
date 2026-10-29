// Yuzhong at 1:1 (M3-41b, D-016): the real ground, streets, stairs, bridges and buildings of the eastern
// peninsula from the geo data. Each lot is built by the city's lot code in its own unturned frame, then turned
// into place.
import { solid, rampSolid, turn, type Solid } from '../geom';
import { makeWorld, type World, type Teleport, type Prop, type Inter, type Climbable, type HideSpot, type Site, type Plot } from '../world';
import { MAT } from '../mats';
import { makeRng, hashString, rand, randInt, type Rng } from '../../sim/rng';
import { buildLot, PARAPET, type Fabric, type Lot } from '../city/buildings';
import { stepsFor } from '../city/terrain';
import { GEO } from '../geo';
import type { Heightfield } from '../heightfield';
import { buildGround, streets, onGround, WATER_Y, type Street } from './ground';
import { planLots, levelLots, markEnterable, type Plan } from './lots';
import { corners, rasterPoly } from './shapes';

const empty = (): Fabric => ({ solids: [], decor: [], props: [], lots: [], inter: [], climbables: [], hides: [], features: [], sites: [], far: [] });

export function buildYuzhong(): World {
  const g = buildGround(), land = landMask(g), sts = streets();
  const plans = planLots(g, sts, land);
  levelLots(g, plans);
  markEnterable(g, plans);
  const out = empty(), plots: Plot[] = [];
  plans.forEach((p, n) => plots.push(buildPlan(p, n, out, g)));
  const decor: Solid[] = [];
  // Streets are painted on the ground itself (its surf); stairs get their steps; bridges their decks.
  for (const s of sts) if (onGround(s) && s.steps) surface(s, g, decor); else if (s.bridge && s.layer > 0) bridge(s, g, out.solids);
  const [W, H] = GEO.size;
  const L = GEO.landmarks, at = (k: string, yaw = 0): Teleport => ({ name: k, x: L[k].x, y: hAt(g, L[k].x, L[k].z) + 1.5, z: L[k].z, yaw });
  const teleports = ['jiefangbei', 'shibati', 'jiaochangkou', 'hongyadong', 'xiaoshizi', 'chaotianmen', 'cablewayNorth', 'grandTunnel'].map(k => at(k));
  return makeWorld({
    name: 'yuzhong', solids: out.solids, decor: decor.concat(out.decor), props: out.props, inter: out.inter, climbables: out.climbables, hides: out.hides, sites: out.sites,
    far: out.far, ground: g, plots, water: [{ x0: 0, y0: WATER_Y - 40, z0: 0, x1: W, y1: WATER_Y, z1: H }],
    teleports, spawn: { ...at('shibati'), yaw: 0 },
  });
}

const MAIN_ROADS = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service']);
const hAt = (g: Heightfield, x: number, z: number) => g.y[Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)))];

/** 1 where the ground is reachable on foot from Jiefangbei above the water, 2 on the far banks, 0 water. */
function landMask(g: Heightfield): Uint8Array {
  const m = new Uint8Array(g.y.length), dry = (k: number) => g.y[k] > WATER_Y + 0.5;
  const L = GEO.landmarks.jiefangbei, start = Math.round(L.z / g.cell) * g.w + Math.round(L.x / g.cell), q = [start];
  m[start] = 1;
  while (q.length) {
    const k = q.pop()!, i = k % g.w;
    for (const n of [i > 0 ? k - 1 : -1, i < g.w - 1 ? k + 1 : -1, k - g.w, k + g.w]) if (n >= 0 && n < m.length && !m[n] && dry(n)) { m[n] = 1; q.push(n); }
  }
  for (let k = 0; k < m.length; k++) if (!m[k] && dry(k)) m[k] = 2;
  return m;
}

/** Build one lot in its own frame and turn everything it made into place. */
function buildPlan(p: Plan, n: number, out: Fabric, g: Heightfield): Plot {
  const o = p.obb, l: Lot = { id: n, x0: o.cx - o.hw, z0: o.cz - o.hd, x1: o.cx + o.hw, z1: o.cz + o.hd, base: p.base, wall: p.wall, top: p.wall, kind: p.kind, mat: p.mat, street: p.street, across: p.across, noEnter: p.noEnter };
  const f = empty(), r = makeRng(hashString(p.seed));
  if (p.far) {
    // The far banks: one painted block each, to see across the river.
    const look = p.kind === 'tower' ? MAT.glass : MAT.facade;
    f.solids.push(solid(l.x0, l.base, l.z0, l.x1, l.wall, l.z1, look));
    f.far.push(solid(l.x0, l.base, l.z0, l.x1, l.wall + PARAPET, l.z1, look));
  } else {
    buildLot(l, r, f);
    if (p.cyber) cyber(l, p, r, f);
  }
  // A foundation down to the lowest ground round it: where a neighbour's lower base dips the ground at a shared
  // wall, or the slope falls away, no gap shows under the walls.
  let low = l.base;
  rasterPoly(corners({ ...o, hw: o.hw + 4.5, hd: o.hd + 4.5 }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) low = Math.min(low, g.y[k]); });
  f.solids.push(solid(l.x0, low - 1, l.z0, l.x1, l.base, l.z1, MAT.concrete));
  const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
  const pt = (x: number, z: number): [number, number] => [o.cx + c * (x - o.cx) - s * (z - o.cz), o.cz + s * (x - o.cx) + c * (z - o.cz)];
  out.solids.push(...turn(f.solids, o.yaw, o.cx, o.cz));
  out.decor.push(...turn(f.decor, o.yaw, o.cx, o.cz));
  out.far.push(...turn(f.far, o.yaw, o.cx, o.cz));
  out.props.push(...f.props.map((q): Prop => { const [x, z] = pt(q.x, q.z); return { ...q, x, z, yaw: q.yaw - o.yaw }; }));
  out.inter.push(...f.inter.map((q): Inter => { const [x, z] = pt(q.x, q.z); return { ...q, id: `${p.seed}-${q.id}`, x, z }; }));
  out.climbables.push(...f.climbables.map((q): Climbable => { const [x, z] = pt(q.x, q.z); return { ...q, x, z, nx: c * q.nx - s * q.nz, nz: s * q.nx + c * q.nz }; }));
  out.hides.push(...f.hides.map((h): HideSpot => {
    const [x0, z0] = pt(h.inner.x0, h.inner.z0), [x1, z1] = pt(h.inner.x1, h.inner.z1);
    return { ...h, id: out.hides.length, inner: { ...h.inner, x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) } };
  }));
  out.sites.push(...f.sites.map((q): Site => { const [x, z] = pt(q.x, q.z); return { ...q, id: `${p.seed}-${q.id}`, x, z, bed: q.bed && `${p.seed}-${q.bed}`, table: q.table && `${p.seed}-${q.table}`, containers: q.containers.map(id => `${p.seed}-${id}`) }; }));
  if (l.route) l.route = l.route.map(q => { const [x, z] = pt(q.x, q.z); return { ...q, x, z }; });
  out.lots.push(l);
  return { corners: corners(o), base: p.base, wall: p.wall, found: low - 1, route: l.route, far: p.far, osm: p.osm };
}

/** The crowded centres gone cyberpunk (U-011, U-020): LED screens on the street faces of towers, malls and
 *  offices; blade signs on the shop fronts below everything else. Props in the lot's own frame. */
function cyber(l: Lot, p: Plan, r: Rng, f: Fabric) {
  const faces = [
    { on: p.street[0], c: (l.x0 + l.x1) / 2, f: l.z0, len: l.x1 - l.x0, yaw: Math.PI, at: (u: number, d: number) => [u, l.z0 - d] },
    { on: p.street[1], c: (l.x0 + l.x1) / 2, f: l.z1, len: l.x1 - l.x0, yaw: 0, at: (u: number, d: number) => [u, l.z1 + d] },
    { on: p.street[2], c: (l.z0 + l.z1) / 2, f: l.x0, len: l.z1 - l.z0, yaw: -Math.PI / 2, at: (u: number, d: number) => [l.x0 - d, u] },
    { on: p.street[3], c: (l.z0 + l.z1) / 2, f: l.x1, len: l.z1 - l.z0, yaw: Math.PI / 2, at: (u: number, d: number) => [l.x1 + d, u] },
  ].filter(x => x.on && x.len > 6);
  const big = l.kind === 'tower' || l.mat === MAT.facadeBand;
  for (const fc of faces) {
    if (big && rand(r) < 0.8) {
      const w = Math.min(fc.len * 0.6, 8 + rand(r) * 12), h = 4 + rand(r) * 8, y = l.base + Math.min((l.podium ?? l.wall) - l.base - h - 1, 6 + rand(r) * 10);
      const [x, z] = fc.at(fc.c + (rand(r) - 0.5) * (fc.len - w) * 0.5, 0.2);
      if (y > l.base + 3) f.props.push({ kind: 'ledscreen', x, y, z, yaw: fc.yaw, w, h });
    }
    for (let i = 0, n = big ? 1 : 1 + randInt(r, 3); i < n; i++) {
      const [x, z] = fc.at(fc.c + (rand(r) - 0.5) * (fc.len - 2), 0.05);
      f.props.push({ kind: 'neonblade', x, y: l.base + 3.2 + rand(r) * 3, z, yaw: fc.yaw, h: 2 + rand(r) * 2.5 });
    }
  }
}

/** A street's surface over the levelled ground: a thin ramp per segment in asphalt or paving; stair streets
 *  get their steps. */
function surface(s: Street, g: Heightfield, decor: Solid[]) {
  const mat = s.steps || s.kind === 'footway' || s.kind === 'pedestrian' || s.kind === 'path' ? MAT.stone : MAT.asphalt;
  for (let k = 0; k + 1 < s.pts.length; k++) {
    const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], len = Math.hypot(bx - ax, bz - az);
    if (len < 0.5) continue;
    const ya = hAt(g, ax, az), yb = hAt(g, bx, bz), cx = (ax + bx) / 2, cz = (az + bz) / 2, yaw = Math.atan2(bz - az, bx - ax);
    const lo = Math.min(ya, yb), hi = Math.max(ya, yb), x0 = cx - len / 2 - 0.3, x1 = cx + len / 2 + 0.3, z0 = cz - s.w / 2, z1 = cz + s.w / 2;
    const r = hi - lo < 0.05 ? solid(x0, lo - 0.25, z0, x1, lo + 0.04, z1, mat) : rampSolid(x0, lo - 0.25, z0, x1, z1, lo + 0.04, hi + 0.04, ya < yb ? 1 : 2, mat);
    if (s.steps && hi - lo > 0.6) { const steps: Solid[] = []; stepsFor(r, steps, MAT.stone); decor.push(...turn(steps, yaw, cx, cz)); }
    else decor.push(...turn([r], yaw, cx, cz));
  }
}

/** A bridge deck from the ground at its ends, rising to clear what it crosses (5.5 m over the ground once 20 m out
 *  from either end), with railings. */
function bridge(s: Street, g: Heightfield, solids: Solid[]) {
  // Pieces of at most 8 m, so the deck can arch over what it crosses.
  const pts: [number, number][] = [s.pts[0]];
  for (let k = 1; k < s.pts.length; k++) {
    const [ax, az] = s.pts[k - 1], [bx, bz] = s.pts[k], m = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 8));
    for (let i = 1; i <= m; i++) pts.push([ax + ((bx - ax) * i) / m, az + ((bz - az) * i) / m]);
  }
  const along = [0];
  for (let k = 1; k < pts.length; k++) along.push(along[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const total = along[along.length - 1] || 1, n = pts.length - 1;
  const y0 = hAt(g, pts[0][0], pts[0][1]), y1 = hAt(g, pts[n][0], pts[n][1]);
  // Footbridges climb steeply (stairs at their ends); road bridges ramp over 20 m.
  const foot = !MAIN_ROADS.has(s.kind), ramp = foot ? 6 : 20, thick = foot ? 0.6 : 1.5;
  const deckY = pts.map(([x, z], k) => Math.max(y0 + ((y1 - y0) * along[k]) / total, hAt(g, x, z) + 5.2 * Math.min(1, Math.min(along[k], total - along[k]) / ramp)));
  for (let k = 0; k < n; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az);
    if (len < 0.5) continue;
    const ya = deckY[k], yb = deckY[k + 1];
    const cx = (ax + bx) / 2, cz = (az + bz) / 2, yaw = Math.atan2(bz - az, bx - ax), lo = Math.min(ya, yb), hi = Math.max(ya, yb);
    const x0 = cx - len / 2 - 0.2, x1 = cx + len / 2 + 0.2, z0 = cz - s.w / 2, z1 = cz + s.w / 2;
    const deck = hi - lo < 0.05 ? solid(x0, lo - thick, z0, x1, lo, z1, MAT.concrete) : rampSolid(x0, lo - thick, z0, x1, z1, lo, hi, ya < yb ? 1 : 2, MAT.concrete);
    solids.push(...turn([deck, solid(x0, lo, z0 - 0.25, x1, hi + 1.1, z0, MAT.metal), solid(x0, lo, z1, x1, hi + 1.1, z1 + 0.25, MAT.metal)], yaw, cx, cz));
  }
}
