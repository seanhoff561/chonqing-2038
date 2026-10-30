// The connections (M3-37a, U-034, U-035): the streets are where the city stops for parkour, so that's where the
// crossings are. Between buildings facing each other across a street, makeshift ones: a plank laid parapet to
// parapet, a steel I-beam (sloped where the roofs differ), or over the wide ones a thick cable bundle to walk or
// hang from. Between buildings standing close, everywhere: bundles of electrical cable sagging from wall to wall,
// thick enough to walk (a balance walk along their curve), hung with junk (cables, rags, shoes, a lamp, a sign);
// bars across the narrow gaps at height; now and then a steel walkway roof to roof. And once the buildings stand,
// a plank out of an open window to a window or a roof across the way.
import { solid, rampSolid, turn, raycast, type Solid, type SolidIndex } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand, randInt, type Rng } from '../../sim/rng';
import type { Heightfield } from '../heightfield';
import type { Feature } from '../world';
import type { Street } from './ground';
import { BARE } from '../city/climb';
import { local, world, refloor, parallel, type Vertical } from './vertical';
import { obbOverlap } from './shapes';
import type { Plan } from './lots';

const PARAPET = 0.6;
type V3 = [number, number, number];

/** A straight member from a to b (plank, beam, bar): w wide, t thick, its top on the line a-b (sloped if they
 *  differ); in its own frame along +x, turned into place. */
export function member(a: V3, b: V3, w: number, t: number, mat: number): Solid {
  const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx), lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]);
  const s = Math.abs(hi - lo) < 0.02 ? solid(a[0], lo - t, a[2] - w / 2, a[0] + len, lo, a[2] + w / 2, mat)
    : rampSolid(a[0], lo - t, a[2] - w / 2, a[0] + len, a[2] + w / 2, lo, hi, b[1] > a[1] ? 1 : 2, mat);
  return turn([s], yaw, a[0], a[2])[0];
}

/** A cable bundle from a to b sagging `sag` in the middle: walkable segments a metre or so long (their tops on the
 *  curve), two more cables beside it, and junk hung along it. */
export function cord(a: V3, b: V3, sag: number, r: Rng, out: Vertical, junk: boolean) {
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(2, Math.round(len)), at = (t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4 * sag * t * (1 - t), a[2] + (b[2] - a[2]) * t];
  const ux = (b[0] - a[0]) / len, uz = (b[2] - a[2]) / len;
  for (let i = 0; i < n; i++) {
    const p = at(i / n), q = at((i + 1) / n);
    out.solids.push(member(p, q, 0.14, 0.12, MAT.cable));
    // Two more beside it, a hand apart, drawn only.
    for (const o of [-0.09, 0.09]) out.decor.push(member([p[0] - uz * o, p[1] - 0.03, p[2] + ux * o], [q[0] - uz * o, q[1] - 0.03, q[2] + ux * o], 0.05, 0.05, MAT.cable));
  }
  if (!junk) return;
  // Junk hung off it (U-035): loops of loose cable, rags, a pair of shoes by their laces, a lamp, a sign.
  for (let t = 0.15 + rand(r) * 0.2; t < 0.9; t += 0.12 + rand(r) * 0.25) {
    const [x, y, z] = at(t), q = rand(r), drop = 0.3 + rand(r) * 1.4, hang = (w: number, h: number, mat: number) => out.decor.push(solid(x - w / 2, y - 0.12 - drop - h, z - w / 2, x + w / 2, y - 0.12 - drop, z + w / 2, mat));
    out.decor.push(solid(x - 0.006, y - 0.12 - drop, z - 0.006, x + 0.006, y - 0.12, z + 0.006, MAT.metal));
    if (q < 0.3) out.decor.push(solid(x - 0.015, y - 0.12 - drop - 0.6, z - 0.015, x + 0.015, y - 0.12 - drop, z + 0.015, MAT.metal));
    else if (q < 0.55) hang(0.25 + rand(r) * 0.3, 0.3 + rand(r) * 0.5, MAT.cloth);
    else if (q < 0.7) { hang(0.1, 0.28, MAT.rubble); out.decor.push(solid(x + 0.06, y - 0.4 - drop, z - 0.05, x + 0.16, y - 0.12 - drop - 0.05, z + 0.05, MAT.rubble)); }
    else if (q < 0.85) hang(0.16, 0.22, MAT.lamp);
    else hang(0.5, 0.35, MAT.tealMetal);
  }
}

/** A connection's end `e` fitted to its building once that stands (M3-81, U-044): from a metre out along it (away
 *  from its other end `o`), in toward the building just under its top, to the wall it meets. An end at or in the
 *  wall stays; where the wall stands back from where the end was laid (a tower's shaft over its podium, a stepped
 *  top) it runs on to 0.3 m past that face, `ext` at most; with no wall there, null. */
export function fitEnd(index: SolidIndex, e: V3, o: V3, ext = 6): V3 | null {
  const l = Math.hypot(e[0] - o[0], e[2] - o[2]), dx = (e[0] - o[0]) / l, dz = (e[2] - o[2]) / l, px = e[0] - dx, pz = e[2] - dz;
  let t = Infinity;
  for (const dy of [0.05, 0.25, 0.45]) { const h = raycast(index, px, e[1] - dy, pz, dx, 0, dz, 1 + ext); if (h) t = Math.min(t, h.t); }
  if (t <= 1.02) return e;
  return t < Infinity ? [px + dx * (t + 0.3), e[1], pz + dz * (t + 0.3)] : null;
}

/** A connection laid out before the buildings stand: its two ends, and how it's built between two. */
export interface Link { a: V3; b: V3; make: (a: V3, b: V3) => void; /** b hangs free (a beam out over a gap): only a meets a wall, b moved with it */ free?: boolean }

/** Build the connections now the buildings stand (M3-81, U-044): each end fitted to the wall it meets, run on to
 *  it where the building stands back above (a tower's shaft, a stepped top), left out where there's no wall. */
export function layLinks(out: Vertical, index: SolidIndex) {
  for (const l of out.links ?? []) {
    const a = fitEnd(index, l.a, l.b), b = a && (l.free ? ([l.b[0] + a[0] - l.a[0], l.b[1], l.b[2] + a[2] - l.a[2]] as V3) : fitEnd(index, l.b, l.a));
    if (a && b) l.make(a, b);
  }
  out.links = [];
}

/** The connections before the lots are built (roofs may still be set to meet), laid out for layLinks. */
export function crossings(plans: Plan[], g: Heightfield, sts: Street[], used: Set<Plan>): Vertical {
  const out: Vertical = { solids: [], decor: [], far: [], climbables: [], features: [] }, r = makeRng(hashString('crossings'));
  const yAt = (x: number, z: number) => g.y[Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)))];
  const feat = (kind: string, a: V3, b: V3, group = out.features.length) => {
    const l = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
    out.features.push({ kind, x: a[0], y: a[1], z: a[2], group, nx: (b[0] - a[0]) / l, nz: (b[2] - a[2]) / l }, { kind, x: b[0], y: b[1], z: b[2], group, nx: (a[0] - b[0]) / l, nz: (a[2] - b[2]) / l });
  };
  const live = plans.filter(p => !p.far && !p.sheer && (p.kind === 'res' || p.kind === 'tower'));
  // (Built once the buildings stand, layLinks: each end on the wall it meets.)
  const links: Link[] = out.links = [], link = (a: V3, b: V3, make: Link['make']) => links.push({ a, b, make });

  // Across the streets: each street's rows, facing each other, a crossing one pair in three.
  const rows = new Map<string, Plan[]>();
  for (const p of live) if (p.row && /^\d+:/.test(p.row)) (rows.get(p.row) ?? rows.set(p.row, []).get(p.row)!).push(p);
  for (const [key, as] of rows) {
    const [si, side] = key.split(':'), bs = rows.get(`${si}:-1`), st = sts[+si];
    if (side !== '1' || !bs || !st) continue;
    for (const a of as) for (const b of bs) {
      if (used.has(a) || used.has(b) || !parallel(a, b, 0.985) || rand(r) > 0.35) continue;
      const [al, ad] = local(a, b.obb.cx, b.obb.cz), o0 = Math.max(-a.obb.hw, al - b.obb.hw), o1 = Math.min(a.obb.hw, al + b.obb.hw);
      const z0 = a.obb.hd, z1 = ad - b.obb.hd, gap = z1 - z0, m = o0 + 1 + rand(r) * Math.max(0, o1 - o0 - 2);
      if (o1 - o0 < 3 || gap < 3 || gap > 30) continue;
      const ground = Math.max(...[0.1, 0.3, 0.5, 0.7, 0.9].map(t => yAt(...world(a, m, z0 + gap * t))));
      // (Parapet to parapet; the roofs set to meet where they can, a slope where they can't.)
      if (Math.abs(a.wall - b.wall) > 1.6) refloor(b, a.wall, 1.6) || refloor(a, b.wall, 1.6);
      const ya = a.wall + PARAPET, yb = b.wall + PARAPET;
      if (Math.min(ya, yb) < ground + BARE + 2 + (gap > 14 ? 0.25 + gap * 0.02 : 0) || Math.abs(ya - yb) > gap * 0.6) continue;
      const [ax, az] = world(a, m, z0 - 0.4), [bx, bz] = world(a, m, z1 + 0.4), A: V3 = [ax, ya, az], Bp: V3 = [bx, yb, bz];
      if (gap <= 7) link(A, Bp, (A, Bp) => { out.solids.push(member(A, Bp, 0.7, 0.08, MAT.wood)); feat('crossPlank', A, Bp); });
      else if (gap <= 14) link(A, Bp, (A, Bp) => {
        // An I-beam: its top flange to walk, its web and foot below.
        out.solids.push(member(A, Bp, 0.3, 0.04, MAT.metal));
        out.decor.push(member([A[0], A[1] - 0.04, A[2]], [Bp[0], Bp[1] - 0.04, Bp[2]], 0.04, 0.28, MAT.metal), member([A[0], A[1] - 0.32, A[2]], [Bp[0], Bp[1] - 0.32, Bp[2]], 0.3, 0.04, MAT.metal));
        feat('crossBeam', A, Bp);
      });
      else { const junk = rand(r) < 0.5; link(A, Bp, (A, Bp) => { cord(A, Bp, 0.25 + gap * 0.02, r, out, junk); feat('crossCord', A, Bp); }); }
      used.add(a); used.add(b);
      // (Both built straight up to their roofs: no stepped top, no tower's shaft set back, M3-81.)
      a.edge = b.edge = true;
    }
  }

  // Close buildings, wherever they stand: pairs facing each other 1.2-12 m apart, overlapping 3 m or more.
  const cells = new Map<string, Plan[]>(), cell = (x: number, z: number) => `${Math.floor(x / 32)},${Math.floor(z / 32)}`;
  for (const p of live) (cells.get(cell(p.obb.cx, p.obb.cz)) ?? cells.set(cell(p.obb.cx, p.obb.cz), []).get(cell(p.obb.cx, p.obb.cz))!).push(p);
  const seen = new Set<string>();
  for (const a of live) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const b of cells.get(`${Math.floor(a.obb.cx / 32) + i},${Math.floor(a.obb.cz / 32) + j}`) ?? []) {
    const id = a.seed < b.seed ? `${a.seed}|${b.seed}` : `${b.seed}|${a.seed}`;
    if (a === b || seen.has(id) || !parallel(a, b, 0.985) || !obbOverlap(a.obb, b.obb, 6) || obbOverlap(a.obb, b.obb, 0.6)) continue;
    seen.add(id);
    // b in a's frame: across a's sides (along u or out of its front/back), its face a gap away, overlapping.
    const [bl, bd] = local(a, b.obb.cx, b.obb.cz), sideways = Math.abs(bl) - a.obb.hw - b.obb.hw > Math.abs(bd) - a.obb.hd - b.obb.hd;
    const [ah, bh, c, e] = sideways ? [a.obb.hw, b.obb.hw, bl, bd] : [a.obb.hd, b.obb.hd, bd, bl], [ao, bo] = sideways ? [a.obb.hd, b.obb.hd] : [a.obb.hw, b.obb.hw];
    const gap = Math.abs(c) - ah - bh, k = Math.sign(c), o0 = Math.max(-ao, e - bo), o1 = Math.min(ao, e + bo);
    if (gap < 1.2 || gap > 12 || o1 - o0 < 3) continue;
    const pt = (along: number, across: number): [number, number] => (sideways ? world(a, across, along) : world(a, along, across));
    const lo = Math.min(a.wall, b.wall), at = (o: number, d: number, y: number): V3 => { const [x, z] = pt(o, d); return [x, y, z]; };
    const ground = Math.max(...[0.1, 0.3, 0.5, 0.7, 0.9].flatMap(t => [o0, (o0 + o1) / 2, o1].map(o => yAt(...pt(o, k * (ah + gap * t))))));
    if (lo - ground < BARE + 3) continue;
    const x0 = k * ah, x1 = k * (ah + gap), n0 = links.length;
    // Bars across the narrow gaps (U-035), one or two, out of reach of the ground.
    if (gap <= 4 && rand(r) < 0.6) for (let n = 1 + randInt(r, 2); n > 0; n--) {
      const o = o0 + 0.8 + rand(r) * Math.max(0, o1 - o0 - 1.6), y = ground + BARE + 0.5 + rand(r) * Math.max(0, lo - ground - BARE - 2);
      const A = at(o, x0 - k * 0.15, y), Bp = at(o, x1 + k * 0.15, y);
      link(A, Bp, (A, Bp) => { out.solids.push(member(A, Bp, 0.06, 0.06, MAT.metal)); feat('gapBar', A, Bp); });
    }
    // Cable bundles wall to wall, common (U-034): one, now and then two, between 7 m up and the lower roof.
    if (gap >= 3 && rand(r) < 0.4) for (let n = rand(r) < 0.3 ? 2 : 1; n > 0; n--) {
      // (Its sag's low point out of reach of the ground too.)
      const sag = 0.15 + gap * 0.04, floor = ground + BARE + 0.5 + sag, o = o0 + 0.6 + rand(r) * Math.max(0, o1 - o0 - 1.2), y0 = floor + rand(r) * Math.max(0, lo - floor - 1), y1 = Math.max(floor, Math.min(lo - 0.5, y0 + (rand(r) - 0.5) * 2));
      if (y0 > lo - 0.5) continue;
      const A = at(o, x0, y0), Bp = at(o + (rand(r) - 0.5) * 1.5, x1, y1);
      const junk = rand(r) < 0.7;
      link(A, Bp, (A, Bp) => { cord(A, Bp, sag, r, out, junk); feat('cord', A, Bp); });
    }
    // A steel walkway roof to roof, railed, where the roofs meet (or can).
    if (gap >= 2 && gap <= 8 && rand(r) < 0.12 && (Math.abs(a.wall - b.wall) <= 1.2 || (!used.has(b) && refloor(b, a.wall, 1.2)))) {
      const o = o0 + 1 + rand(r) * Math.max(0, o1 - o0 - 2), y = Math.min(a.wall, b.wall) + PARAPET;
      link(at(o, x0 - k * 0.3, y), at(o, x1 + k * 0.3, y), (A, Bp) => {
        out.solids.push(member(A, Bp, 1.2, 0.1, MAT.metal));
        // Its rails, a hand in from its edges, between the walls.
        const l = Math.hypot(Bp[0] - A[0], Bp[2] - A[2]), ux = (Bp[0] - A[0]) / l, uz = (Bp[2] - A[2]) / l;
        for (const s of [-0.58, 0.58]) {
          const sa: V3 = [A[0] + ux * 0.3 - uz * s, y + 1.0, A[2] + uz * 0.3 + ux * s], sb: V3 = [Bp[0] - ux * 0.3 - uz * s, y + 1.0, Bp[2] - uz * 0.3 + ux * s];
          out.decor.push(member(sa, sb, 0.04, 0.04, MAT.metal), member([sa[0], sa[1] - 0.5, sa[2]], [sb[0], sb[1] - 0.5, sb[2]], 0.03, 0.03, MAT.metal));
        }
        feat('walkway', A, Bp);
      });
    }
    // (Whatever joins them, both built straight up to their roofs, M3-81.)
    if (links.length > n0) a.edge = b.edge = true;
  }
  return out;
}

/** Once the buildings stand: out of some windows (not barred) a plank to a window or a roof edge across the way,
 *  1.2-9 m off. `wins` are the windows' features (kind 'win:<state>', at the sill outside, n out). */
export function windowBridges(wins: Feature[], index: SolidIndex, out: Vertical) {
  const r = makeRng(hashString('windowBridges'));
  // The windows in 4 m cells, to find one across without scanning them all (there are tens of thousands, M3-77).
  const cells = new Map<number, Feature[]>(), key = (x: number, z: number) => Math.floor(x / 4) * 100003 + Math.floor(z / 4);
  for (const q of wins) { const k = key(q.x, q.z), a = cells.get(k); if (a) a.push(q); else cells.set(k, [q]); }
  const near = (x: number, z: number) => [-4, 0, 4].flatMap(dx => [-4, 0, 4].flatMap(dz => cells.get(key(x + dx, z + dz)) ?? []));
  for (const w of wins) {
    if (w.kind === 'win:barred' || rand(r) > 0.6) continue;
    const nx = w.nx!, nz = w.nz!, y = w.y, h = raycast(index, w.x + nx * 0.3, y + 0.3, w.z + nz * 0.3, nx, 0, nz, 9);
    if (!h || h.t < 1.2) continue;
    const t = h.t + 0.3, hx = w.x + nx * t, hz = w.z + nz * t;
    // A window across within a metre and a half, near the sill's height: sill to sill.
    const other = near(hx, hz).find(q => q !== w && Math.hypot(q.x - hx, q.z - hz) < 1.5 && Math.abs(q.y - y) < 0.8 && q.nx! * nx + q.nz! * nz < -0.9);
    // Or a roof edge across, a step down to a mantle up.
    let top = NaN;
    if (!other) { const g = raycast(index, hx + nx * 0.5, y + 0.8, hz + nz * 0.5, 0, -1, 0, 3.2); if (g) top = y + 0.8 - g.t; }
    const end: V3 | null = other ? [other.x - nx * 0.1, other.y, other.z - nz * 0.1] : Number.isFinite(top) && top < y + 0.6 && top > y - 2.2 ? [hx + nx * 0.6, top, hz + nz * 0.6] : null;
    const A: V3 = [w.x - nx * 0.15, y, w.z - nz * 0.15];
    // (Both ends on a wall: under the sills, the roof's edge, M3-81.)
    if (!end || !fitEnd(index, A, end, 0.8) || !fitEnd(index, end, A, 0.8)) continue;
    out.solids.push(member(A, end, 0.35, 0.06, MAT.wood));
    out.features.push({ kind: 'winPlank', x: A[0], y, z: A[2], group: out.features.length, nx, nz }, { kind: 'winPlank', x: end[0], y: end[1], z: end[2], group: out.features.length, nx: -nx, nz: -nz });
  }
}
