// Line 2 on the real map (M3-41c, D-016): the straddle monorail's two beams along the Jialing bank from the
// Linjiangmen portal west to the edge of the map, on piers every 24 m, about 9 m over the ground at a gentle
// grade; the tunnel portal where it dives under the ridge toward Jiaochangkou; the stalled two-car train on the
// outbound beam (walk through it), with maintenance ladders at both ends.
import { solid, rampSolid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import { GEO } from '../geo';
import type { Heightfield } from '../heightfield';
import type { Prop, Inter, Climbable } from '../world';
import { points, type P2, type Obb } from './shapes';

export const BEAM = { w: 0.85, depth: 1.6, over: 9 };
export const TRAIN = { cars: 2, len: 14.8, gap: 0.4, w: 2.9, at: 120 };

export interface Line2 { solids: Solid[]; decor: Solid[]; props: Prop[]; inter: Inter[]; climbables: Climbable[]; beams: { pts: P2[]; top: number[] }[]; train: { x: number; z: number; yaw: number; top: number } }

const hAt = (g: Heightfield, x: number, z: number) => g.y[Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)))];

/** The two elevated beams: the OSM monorail ways on bridges (and the short covered stretches between them),
 *  joined where one way's last node is the next one's first, cut where they leave the map. */
export function beamLines(): P2[][] {
  const runs = GEO.rails.filter(r => r[0] === 'monorail' && (r[1] & 2 || (r[1] & 4 && r[4].length < 10))).map(r => points(r[4], 0.1));
  const d = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (let joined = true; joined;) {
    joined = false;
    for (let i = 0; i < runs.length && !joined; i++) for (let j = 0; j < runs.length && !joined; j++) {
      if (i !== j && d(runs[i][runs[i].length - 1], runs[j][0]) < 0.5) { runs[i].push(...runs[j].slice(1)); runs.splice(j, 1); joined = true; }
    }
  }
  return runs.map(clip).filter(r => r.length > 1).sort((a, b) => len(b) - len(a)).slice(0, 2);
}

const len = (p: P2[]) => p.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
/** The stretch inside the map (1 m in from its edges), ended where it crosses the edge. */
function clip(p: P2[]): P2[] {
  const [W, H] = GEO.size, inside = (q: P2) => q[0] >= 1 && q[1] >= 1 && q[0] <= W - 1 && q[1] <= H - 1;
  const edge = (a: P2, b: P2): P2 => { let t = 1; for (const [v, lo, hi] of [[0, 1, W - 1], [1, 1, H - 1]] as const) { const dv = b[v] - a[v]; if (b[v] < lo) t = Math.min(t, (lo - a[v]) / dv); if (b[v] > hi) t = Math.min(t, (hi - a[v]) / dv); } return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  let best: P2[] = [], cur: P2[] = [];
  for (let i = 0; i < p.length; i++) {
    if (inside(p[i])) { if (!cur.length && i > 0) cur.push(edge(p[i], p[i - 1])); cur.push(p[i]); continue; }
    if (cur.length) { cur.push(edge(p[i - 1], p[i])); if (len(cur) > len(best)) best = cur; cur = []; }
  }
  return len(cur) > len(best) ? cur : best;
}

/** Resample a line every `step` metres. */
function resample(p: P2[], step: number): P2[] {
  const out: P2[] = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}

export function buildLine2(g: Heightfield): Line2 {
  const L: Line2 = { solids: [], decor: [], props: [], inter: [], climbables: [], beams: [], train: { x: 0, z: 0, yaw: 0, top: 0 } };
  const tun = GEO.rails.find(r => r[0] === 'monorail' && r[1] & 4 && r[4].length >= 40), portal = tun ? points(tun[4], 0.1)[0] : null;
  for (const line of beamLines()) {
    // Each beam runs from the portal end out to the map's edge.
    const raw = portal && Math.hypot(line[0][0] - portal[0], line[0][1] - portal[1]) > Math.hypot(line[line.length - 1][0] - portal[0], line[line.length - 1][1] - portal[1]) ? [...line].reverse() : line;
    const pts = resample(raw, 6), ground = pts.map(([x, z]) => hAt(g, x, z));
    // A gentle profile at least 7 m over the ground, about 9 m most of the way.
    let top = ground.map(y => y + BEAM.over);
    for (let pass = 0; pass < 30; pass++) top = top.map((y, i) => Math.max(ground[i] + 7, (top[Math.max(0, i - 1)] + y + top[Math.min(top.length - 1, i + 1)]) / 3));
    L.beams.push({ pts, top });
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], sl = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2, yaw = Math.atan2(bz - az, bx - ax);
      const lo = Math.min(top[i], top[i + 1]), hi = Math.max(top[i], top[i + 1]);
      const x0 = cx - sl / 2 - 0.02, x1 = cx + sl / 2 + 0.02, z0 = cz - BEAM.w / 2, z1 = cz + BEAM.w / 2;
      const beam = hi - lo < 0.02 ? solid(x0, lo - BEAM.depth, z0, x1, lo, z1, MAT.concrete) : rampSolid(x0, lo - BEAM.depth, z0, x1, z1, lo, hi, top[i] < top[i + 1] ? 1 : 2, MAT.concrete);
      L.solids.push(...turn([beam], yaw, cx, cz));
      // Maintenance ladders up beside the beam every 150 m.
      if (i % 25 === 12) { const nx = Math.sin(yaw), nz = -Math.cos(yaw), lx = cx - nx * 1.3, lz = cz - nz * 1.3; L.climbables.push({ kind: 'ladder', x: lx, z: lz, y0: hAt(g, lx, lz), y1: lo + 0.3, nx, nz }); }
      // T-piers every 24 m.
      if (i % 4 === 2) L.solids.push(...turn([solid(cx - 0.6, ground[i] - 1, cz - 1.1, cx + 0.6, lo - BEAM.depth - 0.6, cz + 1.1, MAT.concrete), solid(cx - 0.9, lo - BEAM.depth - 0.6, cz - 1.4, cx + 0.9, lo - BEAM.depth, cz + 1.4, MAT.concrete)], yaw, cx, cz));
    }
  }
  // The stalled train on the longer beam, TRAIN.at metres from the portal end, each car sitting on the beam where it
  // stands: along its curve, tilted with its grade (U-031). Their collision in each car's own frame.
  const b = L.beams[0];
  if (b) {
    const cum = [0];
    for (let i = 1; i < b.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(b.pts[i][0] - b.pts[i - 1][0], b.pts[i][1] - b.pts[i - 1][1]));
    /** The beam's top at s metres along it. */
    const on = (s: number) => {
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const f = Math.max(0, Math.min(1, (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1))), [ax, az] = b.pts[i - 1], [bx, bz] = b.pts[i];
      return { x: ax + (bx - ax) * f, z: az + (bz - az) * f, y: b.top[i - 1] + (b.top[i] - b.top[i - 1]) * f };
    };
    const hw = TRAIN.w / 2, H = MAT.hidden, s0 = Math.min(TRAIN.at, cum[cum.length - 1] - TRAIN.cars * (TRAIN.len + TRAIN.gap) - 8);
    const mid = { x: 0, z: 0, top: 0 };
    for (let c = 0; c < TRAIN.cars; c++) {
      const A = on(s0 + c * (TRAIN.len + TRAIN.gap)), B = on(s0 + c * (TRAIN.len + TRAIN.gap) + TRAIN.len);
      const cx = (A.x + B.x) / 2, cz = (A.z + B.z) / 2, top = (A.y + B.y) / 2, yaw = Math.atan2(B.z - A.z, B.x - A.x), x0 = cx - TRAIN.len / 2, x1 = cx + TRAIN.len / 2;
      const lo = Math.min(A.y, B.y), hi = Math.max(A.y, B.y);
      // Its floor on the grade (a ramp), the roof over the higher end; each end wall at its own end's height.
      const local: Solid[] = [hi - lo < 0.02 ? solid(x0, top + 0.25, cz - hw + 0.08, x1, top + 0.4, cz + hw - 0.08, H) : rampSolid(x0, lo + 0.25, cz - hw + 0.08, x1, cz + hw - 0.08, lo + 0.4, hi + 0.4, B.y > A.y ? 1 : 2, H), solid(x0, hi + 2.7, cz - hw, x1, hi + 2.95, cz + hw, H)];
      for (const z of [cz - hw, cz + hw - 0.08]) local.push(solid(x0, lo - 1.2, z, x1, hi + 2.95, z + 0.08, H));
      for (const [x, y] of [[x0, A.y], [x1 - 0.08, B.y]]) local.push(solid(x, y + 0.4, cz - hw + 0.08, x + 0.08, hi + 2.7, cz - 0.45, H), solid(x, y + 0.4, cz + 0.45, x + 0.08, hi + 2.7, cz + hw - 0.08, H), solid(x, y + 2.3, cz - 0.45, x + 0.08, hi + 2.7, cz + 0.45, H));
      L.solids.push(...turn(local, yaw, cx, cz));
      const [ix, iz] = rot(cx, cz, yaw, x0 + 4 + c * 5, cz + 1.0);
      L.inter.push({ id: `train${c}`, kind: 'container', x: ix, y: top + 0.9, z: iz, r: 1.0, zh: '包', en: 'Bag', data: { type: 'bag', loot: 'car' } });
      L.props.push({ kind: 'train', x: cx, y: top, z: cz, yaw: Math.PI / 2 - yaw, w: TRAIN.cars, d: c, h: Math.atan2(B.y - A.y, TRAIN.len) });
      mid.x += cx / TRAIN.cars; mid.z += cz / TRAIN.cars; mid.top += top / TRAIN.cars;
    }
    const ends = [on(s0), on(s0 + TRAIN.cars * (TRAIN.len + TRAIN.gap) - TRAIN.gap)];
    L.train = { ...mid, yaw: Math.atan2(ends[1].z - ends[0].z, ends[1].x - ends[0].x) };
    // Maintenance ladders up the piers either side of the train.
    for (const s of [s0 - 6, s0 + TRAIN.cars * (TRAIN.len + TRAIN.gap) + 6]) {
      const p = on(s), q = on(s + 1), yaw = Math.atan2(q.z - p.z, q.x - p.x), nx = Math.sin(yaw), nz = -Math.cos(yaw), lx = p.x - nx * 1.3, lz = p.z - nz * 1.3;
      L.climbables.push({ kind: 'ladder', x: lx, z: lz, y0: hAt(g, lx, lz), y1: p.y + 0.3, nx, nz });
    }
  }
  // The portal where the beams dive under the ridge toward Jiaochangkou: a cut in the hillside up to a concrete
  // frame, dark inside.
  if (tun && b) {
    const p = points(tun[4], 0.1), [px, pz] = p[0], [qx, qz] = p[1], yaw = Math.atan2(qz - pz, qx - px), y = b.top[0] - BEAM.depth - 1;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
      const dx = i * g.cell - px, dz = j * g.cell - pz, u = c * dx + s * dz, v = -s * dx + c * dz;
      if (u > -30 && u < 2 && Math.abs(v) < 6 && g.y[j * g.w + i] > y) g.y[j * g.w + i] = y;
    }
    L.solids.push(...turn([solid(px - 1, y, pz - 6, px + 1, y + 11, pz - 4.5, MAT.concrete), solid(px - 1, y, pz + 4.5, px + 1, y + 11, pz + 6, MAT.concrete), solid(px - 1, y + 9.5, pz - 6, px + 1, y + 11, pz + 6, MAT.concrete)], yaw, px, pz));
    L.decor.push(...turn([solid(px + 1.5, y, pz - 4.5, px + 2, y + 9.5, pz + 4.5, MAT.asphalt)], yaw, px, pz));
  }
  return L;
}

/** The metro's street entrances at the real stations and entrances (OSM), the underground stations themselves
 *  closed for now (M3-43 opens the way in at Jiaochangkou): a glass canopy over the stair down, shutter rolled
 *  down, set beside the nearest street and facing it. Returns where they stand, for the lots to keep clear of. */
export function stationEntrances(g: Heightfield, sts: { pts: P2[]; w: number }[], land: Uint8Array): { solids: Solid[]; props: Prop[]; keep: Obb[]; at: { name: string; x: number; z: number }[] } {
  const out = { solids: [] as Solid[], props: [] as Prop[], keep: [] as Obb[], at: [] as { name: string; x: number; z: number }[] };
  for (const [name, kind, xd, zd] of GEO.stations) {
    if (kind !== 'station' && kind !== 'subway_entrance') continue;
    const px = xd / 10, pz = zd / 10, cell = Math.round(pz / g.cell) * g.w + Math.round(px / g.cell);
    if (px < 10 || pz < 10 || px > GEO.size[0] - 10 || pz > GEO.size[1] - 10 || land[cell] !== 1 || out.at.some(a => Math.hypot(a.x - px, a.z - pz) < 40)) continue;
    // The nearest street, and the side of it the station node is on.
    let best: { d: number; x: number; z: number; ux: number; uz: number; w: number } | null = null;
    for (const s of sts) for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2));
      const x = ax + vx * t, z = az + vz * t, d = Math.hypot(px - x, pz - z), l = Math.sqrt(l2);
      if (!best || d < best.d) best = { d, x, z, ux: vx / l, uz: vz / l, w: s.w };
    }
    if (!best || best.d > 45) continue;
    const side = (px - best.x) * -best.uz + (pz - best.z) * best.ux >= 0 ? 1 : -1, nx = -best.uz * side, nz = best.ux * side;
    const cx = best.x + nx * (best.w / 2 + 4.5), cz = best.z + nz * (best.w / 2 + 4.5), y = hAt(g, cx, cz), yaw = Math.atan2(nz, nx);
    // In its own frame: x away from the street (0 at the front), z along it.
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: number) => solid(cx + x0 - 3.5, y + y0, cz + z0, cx + x1 - 3.5, y + y1, cz + z1, mat);
    out.solids.push(...turn([
      box(0, -1, -2, 7, 0.15, 2, MAT.stone), box(0.1, 0.15, -2, 7, 2.6, -1.85, MAT.glass), box(0.1, 0.15, 1.85, 7, 2.6, 2, MAT.glass),
      box(6.8, 0.15, -1.85, 7, 2.6, 1.85, MAT.concrete), box(-0.2, 2.6, -2.2, 7.2, 2.9, 2.2, MAT.metal), box(0.1, 0.15, -1.85, 0.25, 2.6, 1.85, MAT.metal),
    ], yaw, cx, cz));
    out.props.push({ kind: 'neonblade', x: cx - nx * 3.6, y: y + 2.9, z: cz - nz * 3.6, yaw: Math.PI / 2 - yaw, h: 1.2 });
    out.keep.push({ cx, cz, hw: 3.8, hd: 2.4, yaw });
    out.at.push({ name, x: cx, z: cz });
  }
  return out;
}

/** (x, z) turned by yaw about (cx, cz), as geom's turn(). */
function rot(cx: number, cz: number, yaw: number, x: number, z: number): [number, number] {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [cx + c * (x - cx) - s * (z - cz), cz + s * (x - cx) + c * (z - cz)];
}
