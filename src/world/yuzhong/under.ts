// The underground city (M3-58, U-023, U-024): a network on several levels under the peninsula. Off the wartime
// Grand Tunnel (tunnels.ts) a junction room; from it an air-raid tunnel north, then up a flight east to the
// underground city under Jiefangbei: a cavern on two levels, the upper deck's street of shops and screens over the
// lower concourse, stairs, a ladder shaft and two open voids between them (a drop onto rubbish bags); on east and
// north a tunnel to Xiaoshizi. Ways in: stairways down from the streets, grates over ladder shafts beside the
// pavements, storm culverts opening on the hillsides (some up a wall, a climb) and crawl-high drains (a squeeze),
// the stations' stairs. Everything square to the map (x and z), so every bore carves every lining it meets.
import { solid, carve, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { GEO } from '../geo';
import { makeRng, hashString, rand } from '../../sim/rng';
import type { Heightfield } from '../heightfield';
import type { Climbable, Feature, Prop, Zone } from '../world';
import { stair } from '../steps';
import { streetCells } from './ground';
import { districtAt } from './lots';
import type { Obb, P2 } from './shapes';

type V3 = { x: number; y: number; z: number };
export interface Under {
  solids: Solid[]; decor: Solid[]; props: Prop[]; climbables: Climbable[]; zones: Zone[]; features: Feature[];
  /** what the lots keep clear of: the open cuts of stairways and culverts, the grates */
  keep: Obb[];
  /** a walk from the Grand Tunnel under Jiaochangkou through both levels of the city to Xiaoshizi */
  route: V3[];
  at: Record<string, V3>;
}

const T35 = Math.tan(0.61), HEAD = 3.2, LINE = 0.8;
/** The network's level (the city's lower concourse) and the city's upper deck. */
const LB = 89, LA = 96;
/** The cavern round Jiefangbei: half its size along x and z, its ceiling. */
const HX = 70, HZ = 50, CEIL = 104.8;
/** Tunnel width and height. */
const TW = 3.6, TH = 3.4;

/** gt: the Grand Tunnel's floor, the end of its passage north (the junction), its ways in, and a walk along it
 *  from under Jiaochangkou into the passage. */
export function buildUnder(g: Heightfield, gt: { floor: number; junction: V3; ways: V3[]; walk: V3[] }): Under {
  const u: Under = { solids: [], decor: [], props: [], climbables: [], zones: [], features: [], keep: [], route: [], at: {} };
  const lining: Solid[] = [], bores: Box[] = [], kept: Solid[] = [], r = makeRng(hashString('under'));
  const k = (x: number, z: number) => Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)));
  const gy = (x: number, z: number) => g.y[k(x, z)], street = (x: number, z: number) => streetCells[k(x, z)] !== 0;
  const way = (kind: string, x: number, y: number, z: number, nx = 0, nz = 0) => u.features.push({ kind: `way:${kind}`, x, y, z, group: u.features.length, nx, nz });
  for (const q of gt.ways) way('tunnel', q.x, q.y, q.z);

  /** A space: its bore lined with floor, roof and walls (other spaces' bores cut the walls where they meet). */
  /** (open: no roof, a shaft up to the light; lit: the city's own lights.) */
  const space = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, mat: number = MAT.concrete, open = false, lit = false) => {
    bores.push({ x0, y0, z0, x1, y1, z1 });
    const t = LINE;
    lining.push(solid(x0 - t, y0 - t, z0 - t, x1 + t, y0, z1 + t, mat), solid(x0 - t, y0, z0 - t, x0, y1, z1 + t, mat), solid(x1, y0, z0 - t, x1 + t, y1, z1 + t, mat), solid(x0, y0, z0 - t, x1, y1, z0, mat), solid(x0, y0, z1, x1, y1, z1 + t, mat));
    if (!open) lining.push(solid(x0 - t, y1, z0 - t, x1 + t, y1 + t, z1 + t, mat));
    u.zones.push({ kind: 'under', box: { x0: x0 - 0.3, y0: y0 - 0.5, z0: z0 - 0.3, x1: x1 + 0.3, y1, z1: z1 + 0.3 }, lit });
  };
  /** A level tunnel square to the map from a to b (each end run on half its width), lamps along its crown. */
  const tunnel = (a: P2, b: P2, y: number, w = TW, h = TH) => {
    const hw = w / 2, x0 = Math.min(a[0], b[0]) - hw, x1 = Math.max(a[0], b[0]) + hw, z0 = Math.min(a[1], b[1]) - hw, z1 = Math.max(a[1], b[1]) + hw;
    space(x0, z0, x1, z1, y, y + h);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let t = 6; t < len - 2 && w > 2; t += 16) { const x = a[0] + ((b[0] - a[0]) * t) / len, z = a[1] + ((b[1] - a[1]) * t) / len; u.decor.push(solid(x - 0.3, y + h - 0.1, z - 0.3, x + 0.3, y + h, z + 0.3, MAT.lamp)); }
  };
  const holeRect = (x0: number, z0: number, x1: number, z1: number) => {
    for (let j = Math.floor(z0 / g.cell); j <= Math.floor(z1 / g.cell); j++) for (let i = Math.floor(x0 / g.cell); i <= Math.floor(x1 / g.cell); i++) if (i >= 0 && j >= 0 && i < g.w - 1 && j < g.h - 1) g.hole[j * (g.w - 1) + i] = 1;
  };
  const keep = (x0: number, z0: number, x1: number, z1: number) => u.keep.push({ cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, hw: (x1 - x0) / 2 + 3, hd: (z1 - z0) / 2 + 3, yaw: 0 });
  /** The ground over a strip square to the map stays clear of the streets (their meshes would cover a hole), and out
   *  of Shibati's old terraces (the Grand Tunnel and the hideout's grate are its ways down). */
  const clearOf = (x0: number, z0: number, x1: number, z1: number) => {
    if (districtAt((x0 + x1) / 2, (z0 + z1) / 2).district === 'shibati') return false;
    for (let x = x0; x <= x1; x += 1) for (let z = z0; z <= z1; z += 1) if (street(x, z)) return false;
    return true;
  };

  /** A stairway from the ground at (mx, mz) down along (dx, dz) (one of x or z) to y: open to the sky between
   *  retaining walls while the ground's shell would reach into it, roofed in 2 m steps after that. Its foot. */
  const stairway = (mx: number, mz: number, dx: number, dz: number, y: number, dry = false): V3 | null => {
    const top = gy(mx, mz), len = (top - y) / T35, at = (a: number): P2 => [mx + dx * a, mz + dz * a], ya = (a: number) => top - a * T35;
    if (len < 4) return null;
    let open = 0;
    while (open < len && ya(open) + HEAD > gy(...at(open)) - g.thick - 0.3) open += 0.5;
    // In its own frame: a along it, b across; to the map.
    const rect = (a0: number, a1: number, b0: number, b1: number): [number, number, number, number] => {
      const [p, q] = [at(a0), at(a1)], ox = dz !== 0 ? 1 : 0, oz = dx !== 0 ? 1 : 0;
      return [Math.min(p[0], q[0]) + ox * b0, Math.min(p[1], q[1]) + oz * b0, Math.max(p[0], q[0]) + ox * b1, Math.max(p[1], q[1]) + oz * b1];
    };
    const [ox0, oz0, ox1, oz1] = rect(-3, open + 3, -4.4, 4.4);
    if (dry && !clearOf(ox0, oz0, ox1, oz1)) return null;
    const [sx0, sz0, sx1, sz1] = rect(0, len, -1.5, 1.5);
    stair(sx0, sz0, sx1, sz1, y, top, dx > 0 ? 2 : dx < 0 ? 1 : dz > 0 ? 4 : 3, kept, u.decor);
    for (const [b0, b1] of [[-4.4, -1.5], [1.5, 4.4]]) kept.push(solid(...wall(rect(0, open, b0, b1), y - 1, top + 0.9)));
    kept.push(solid(...wall(rect(-2.9, 0, -4.4, 4.4), top - 0.6, top)));
    for (let a = open; a < len; a += 2) { const [x0, z0, x1, z1] = rect(a, Math.min(len, a + 2), -1.5, 1.5); space(x0, z0, x1, z1, ya(Math.min(len, a + 2)), ya(a) + HEAD); }
    if (open < len) kept.push(solid(...wall(rect(open, open + 0.8, -4.4, 4.4), ya(open) + HEAD, Math.max(top + 0.9, gy(...at(open + 0.8)) + 0.3))));
    const [hx0, hz0, hx1, hz1] = rect(0, open, -1.5, 1.5);
    holeRect(hx0, hz0, hx1, hz1);
    keep(ox0, oz0, ox1, oz1);
    const [fx, fz] = at(len);
    return { x: fx, y, z: fz };
  };
  /** A stairway whose foot comes 1 m past (px, pz) along (dx, dz): its mouth found by stepping back up the hill. */
  const stairTo = (px: number, pz: number, dx: number, dz: number, y: number, kind: string) => {
    let mx = px, mz = pz;
    for (let i = 0; i < 5; i++) { const len = (gy(mx, mz) - y) / T35; mx = px + dx * (1 - len); mz = pz + dz * (1 - len); }
    if (!stairway(mx, mz, dx, dz, y, true)) return false;
    way(kind, mx, gy(mx, mz), mz);
    return true;
  };
  const wall = ([x0, z0, x1, z1]: [number, number, number, number], y0: number, y1: number): [number, number, number, number, number, number, number] => [x0, y0, z0, x1, y1, z1, MAT.concrete];

  /** A grate beside the pavement over a ladder shaft down to a tunnel's floor at y: the shaft lined, the ground holed
   *  over it and paved round the opening. */
  const grate = (x: number, z: number, y: number) => {
    const top = gy(x, z), h = 0.8;
    space(x - h, z - h, x + h, z + h, y, top - 0.5, MAT.concrete, true);
    u.climbables.push({ kind: 'ladder', x, z: z - h, y0: y, y1: top + 0.3, nx: 0, nz: 1 });
    holeRect(x - 2, z - 2, x + 2, z + 2);
    for (const [x0, z0, x1, z1] of [[x - 3, z - 3, x + 3, z - h], [x - 3, z + h, x + 3, z + 3], [x - 3, z - h, x - h, z + h], [x + h, z - h, x + 3, z + h]]) kept.push(solid(x0, top - 0.5, z0, x1, top + 0.03, z1, MAT.metal));
    keep(x - 3, z - 3, x + 3, z + 3);
    way('grate', x, top, z);
  };

  /** From (x, z) on a tunnel at y out along (dx, dz) until the hillside falls away: covered while the ground's
   *  shell clears it, then an open cut between walls to the mouth. A storm culvert, or a drain to crawl; a high
   *  one runs on until its mouth stands 2.5 m up a wall over the slope below (a climb to get in). */
  const culvert = (x: number, z: number, dx: number, dz: number, y: number, drain: boolean, high: boolean) => {
    const w = drain ? 1.0 : 3, h = drain ? 0.9 : 3, at = (d: number): P2 => [x + dx * d, z + dz * d];
    let cut = 0, end = 0;
    for (let d = 4; d < 360 && !end; d += 2) {
      const ground = gy(...at(d));
      if (!cut && ground < y + h + LINE + g.thick + 0.3) cut = d;
      if (cut && ground < (high ? y - 2.5 : y + 0.3)) end = d;
    }
    if (!cut || !end || end - cut > (high ? 80 : 60)) return false;
    const box = (d0: number, d1: number, b: number): [number, number, number, number] => { const p = at(d0), q = at(d1); return [Math.min(p[0], q[0]) - (dz ? b : 0), Math.min(p[1], q[1]) - (dx ? b : 0), Math.max(p[0], q[0]) + (dz ? b : 0), Math.max(p[1], q[1]) + (dx ? b : 0)]; };
    const [ox0, oz0, ox1, oz1] = box(cut - 2, end + 2, w / 2 + 1.5);
    if (!clearOf(ox0, oz0, ox1, oz1)) return false;
    tunnel(at(0), at(cut), y, w, h);
    // The open cut: a channel between walls up to the ground, its floor a step down at the mouth.
    for (let d = cut; d < end; d += 2) {
      const [x0, z0, x1, z1] = box(d, Math.min(end, d + 2), w / 2), wallTop = Math.max(gy(...at(d)), gy(...at(d + 2))) + 0.6;
      bores.push({ x0, y0: y, z0, x1, y1: wallTop + 1, z1 });
      // Its floor and walls stand on the ground where it has fallen away below them.
      const foot = Math.min(y - 1, Math.min(gy(...at(d)), gy(...at(d + 2))) - 1);
      lining.push(solid(Math.min(x0, x1) - (dz ? 1 : 0), foot, Math.min(z0, z1) - (dx ? 1 : 0), Math.max(x0, x1) + (dz ? 1 : 0), y, Math.max(z0, z1) + (dx ? 1 : 0), MAT.concrete));
      for (const s of [-1, 1]) { const [a0, b0, a1, b1] = box(d, Math.min(end, d + 2), w / 2 + 0.8), [c0, e0, c1, e1] = box(d, Math.min(end, d + 2), w / 2); kept.push(dz ? solid(s < 0 ? a0 : c1, foot, b0, s < 0 ? c0 : a1, wallTop, b1, MAT.concrete) : solid(a0, foot, s < 0 ? b0 : e1, a1, wallTop, s < 0 ? e0 : b1, MAT.concrete)); }
    }
    const [hx0, hz0, hx1, hz1] = box(cut, end, w / 2 + 0.8);
    holeRect(hx0, hz0, hx1, hz1);
    keep(ox0, oz0, ox1, oz1);
    const [mx, mz] = at(end);
    way(drain ? 'drain' : 'culvert', mx, y, mz, dx, dz);
    return true;
  };

  // The junction room off the Grand Tunnel's passage, then north under the city at its depth.
  const J = gt.junction, F = gt.floor, C = GEO.landmarks.jiefangbei;
  space(J.x - 4, J.z - 4, J.x + 4, J.z + 4, F, F + TH);
  // Where the passage comes in from the south-west, through the room's south wall.
  bores.push({ x0: J.x - 4, y0: F, z0: J.z + 3.5, x1: J.x + 0.3, y1: F + 3.2, z1: J.z + 5.5 });
  tunnel([J.x, J.z], [J.x, C.z], F);
  // Up a flight to the network's level, east to the city's lower concourse.
  const fx0 = J.x + 1.5, fx1 = fx0 + (LB - F) / T35;
  space(fx0, C.z - 1.6, fx1, C.z + 1.6, F, LB + TH);
  stair(fx0, C.z - 1.6, fx1, C.z + 1.6, F, LB, 1, kept, u.decor);
  const X0 = C.x - HX, X1 = C.x + HX, Z0 = C.z - HZ, Z1 = C.z + HZ;
  tunnel([fx1, C.z], [X0, C.z], LB);

  // The city: a cavern from the concourse to the ceiling, the deck at LA across it but for two voids and two
  // stair wells and a ladder hole.
  space(X0, Z0, X1, Z1, LB, CEIL, MAT.stone, false, true);
  const voids: Box[] = [-1, 1].map(s => ({ x0: C.x + s * 29 - 7, y0: LA - 0.7, z0: C.z - 7, x1: C.x + s * 29 + 7, y1: LA + 0.1, z1: C.z + 7 }));
  // The stair wells in the cross street (along z through the middle): the west one rises south, the east one north.
  const wells: Box[] = [{ x0: C.x - 4.6, y0: LA - 0.7, z0: C.z + 8, x1: C.x - 1.4, y1: LA + 0.1, z1: C.z + 18 }, { x0: C.x + 1.4, y0: LA - 0.7, z0: C.z - 18, x1: C.x + 4.6, y1: LA + 0.1, z1: C.z - 8 }];
  const ladderAt = { x: C.x + 52, z: C.z + 32 };
  let deck: Solid[] = [solid(X0, LA - 0.6, Z0, X1, LA, Z1, MAT.concrete)];
  for (const b of [...voids, ...wells, { x0: ladderAt.x - 0.9, y0: LA - 0.7, z0: ladderAt.z - 0.9, x1: ladderAt.x + 0.9, y1: LA + 0.1, z1: ladderAt.z + 0.9 }]) deck = carve(deck, b);
  kept.push(...deck);
  stair(wells[0].x0, wells[0].z0, wells[0].x1, wells[0].z1, LB, LA, 3, kept, u.decor);
  stair(wells[1].x0, wells[1].z0, wells[1].x1, wells[1].z1, LB, LA, 4, kept, u.decor);
  u.climbables.push({ kind: 'ladder', x: ladderAt.x, z: ladderAt.z - 0.9, y0: LB, y1: LA + 1, nx: 0, nz: 1 });
  // Rails round the voids, open on the street side: a 7 m drop onto bags piled below.
  for (const v of voids) {
    for (const [x0, z0, x1, z1] of [[v.x0, v.z0, v.x1, v.z0 + 0.1], [v.x0, v.z0, v.x0 + 0.1, v.z1], [v.x1 - 0.1, v.z0, v.x1, v.z1], [v.x0, v.z1 - 0.1, v.x0 + 4, v.z1], [v.x1 - 4, v.z1 - 0.1, v.x1, v.z1]]) kept.push(solid(x0, LA, z0, x1, LA + 1.1, z1, MAT.metal));
    for (let x = v.x0 + 5; x < v.x1 - 4; x += 1.4) u.props.push({ kind: 'bags', x, y: LB, z: v.z1 - 2 - rand(r) * 2, yaw: rand(r) * 6.28 });
  }
  // Columns under the deck on a 16 m grid, clear of the concourse's streets.
  for (let x = X0 + 8; x < X1 - 4; x += 16) for (let z = Z0 + 8; z < Z1 - 4; z += 16) {
    if (Math.abs(z - C.z) < 6 || Math.abs(x - C.x) < 6 || [...voids, ...wells].some(b => x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 - 1 && z < b.z1 + 1)) continue;
    kept.push(solid(x - 0.6, LB, z - 0.6, x + 0.6, LA - 0.6, z + 0.6, MAT.concrete));
  }
  // Shops in rows along both levels' streets (the deck's along x, the concourse's along z), screens over their
  // fronts and a strip light under each; one in three open, a room inside its front.
  const shop = (x0: number, z0: number, x1: number, z1: number, y: number, h: number, face: 'x0' | 'x1' | 'z0' | 'z1') => {
    let s: Solid[] = [solid(x0, y, z0, x1, y + h, z1, MAT.facadeBand)];
    const fz = face === 'z0' ? z0 : face === 'z1' ? z1 : 0, fx = face === 'x0' ? x0 : face === 'x1' ? x1 : 0, out = face.endsWith('1') ? 1 : -1;
    const sign = (a0: number, a1: number, b: number, y0: number, y1: number, mat: number) => (fz ? solid(a0, y0, Math.min(b, b + out * 0.05), a1, y1, Math.max(b, b + out * 0.05), mat) : solid(Math.min(b, b + out * 0.05), y0, a0, Math.max(b, b + out * 0.05), y1, a1, mat));
    const [a0, a1] = fz ? [x0, x1] : [z0, z1], m = (a0 + a1) / 2;
    u.decor.push(sign(a0 + 0.4, a1 - 0.4, fz || fx, y + h - 1.6, y + h - 0.4, MAT.screen), sign(a0 + 0.4, a1 - 0.4, fz || fx, y + h - 1.75, y + h - 1.65, MAT.lamp));
    if (rand(r) < 0.34) s = carve(s, fz ? { x0: m - 1.6, y0: y, z0: fz - (out > 0 ? 3 : 0), x1: m + 1.6, y1: y + 2.6, z1: fz + (out > 0 ? 0 : 3) } : { x0: fx - (out > 0 ? 3 : 0), y0: y, z0: m - 1.6, x1: fx + (out > 0 ? 0 : 3), y1: y + 2.6, z1: m + 1.6 });
    kept.push(...s);
  };
  const free = (x0: number, z0: number, x1: number, z1: number) => ![...voids, ...wells].some(b => x1 > b.x0 - 2 && x0 < b.x1 + 2 && z1 > b.z0 - 2 && z0 < b.z1 + 2) && !(x1 > ladderAt.x - 3 && x0 < ladderAt.x + 3 && z1 > ladderAt.z - 3 && z0 < ladderAt.z + 3);
  for (const s of [-1, 1]) for (let x = X0 + 4; x < X1 - 12;) {
    const w = 8 + rand(r) * 6, [z0, z1] = s < 0 ? [C.z - 18, C.z - 6] : [C.z + 6, C.z + 18];
    // Where one won't fit, try 2 m on.
    if (Math.abs(x + w / 2 - C.x) > w / 2 + 5 && free(x, z0, x + w, z1)) { shop(x, z0, x + w, z1, LA, 4.5 + rand(r) * 2.5, s < 0 ? 'z1' : 'z0'); x += w + 2 + rand(r) * 2; } else x += 2;
  }
  for (const s of [-1, 1]) for (let z = Z0 + 4; z < Z1 - 10;) {
    const w = 7 + rand(r) * 5, [x0, x1] = s < 0 ? [C.x - 16, C.x - 6] : [C.x + 6, C.x + 16];
    if (Math.abs(z + w / 2 - C.z) > w / 2 + 5 && free(x0, z, x1, z + w)) { shop(x0, z, x1, z + w, LB, 3.4 + rand(r) * 1.2, s < 0 ? 'x1' : 'x0'); z += w + 2 + rand(r) * 2; } else z += 2;
  }
  // Light strips along the cavern's ceiling and under the deck.
  for (let x = X0 + 6; x < X1 - 6; x += 12) u.decor.push(solid(x - 3, CEIL - 0.08, C.z - 0.15, x + 3, CEIL, C.z + 0.15, MAT.glare), solid(C.x - 0.15, LA - 0.68, Z0 + 4, C.x + 0.15, LA - 0.6, Z1 - 4, MAT.glare));

  // On east to Xiaoshizi at the network's level, its end under the station.
  const XS = GEO.landmarks.xiaoshizi, xe = XS.x, ze = XS.z + 18;
  tunnel([X1, C.z], [xe, C.z], LB);
  tunnel([xe, C.z], [xe, ze], LB);

  // Ways in. Stairways down to the deck from each side of the cavern, the first spot on each side clear of streets.
  const sides: [number, number, (t: number) => P2][] = [[0, 1, t => [C.x + t, Z0]], [0, -1, t => [C.x + t, Z1]], [1, 0, t => [X0, C.z + t]], [-1, 0, t => [X1, C.z + t]]];
  for (const [dx, dz, edge] of sides) for (const t of [-40, -25, -12, 12, 25, 40]) if (stairTo(...edge(t), dx, dz, LA, 'stairs')) break;
  // The stations' stairs: Xiaoshizi's down to the tunnel's end; Linjiangmen's by a spur off the tunnel west.
  for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (stairTo(xe, ze, dx, dz, LB, 'metro')) break;
  const LJ = GEO.stations.find(s => s[0] === '临江门');
  if (LJ) {
    const lx = LJ[2] / 10;
    // The spur north from the tunnel as far as the first spot by the station a stair can come down.
    for (const lz of [LJ[3] / 10 + 30, LJ[3] / 10 + 50, LJ[3] / 10 + 15, LJ[3] / 10 + 65]) {
      if (![[0, 1], [1, 0], [-1, 0]].some(([dx, dz]) => stairTo(lx, lz, dx, dz, LB, 'metro'))) continue;
      tunnel([lx, C.z], [lx, lz], LB);
      break;
    }
  }
  // Grates beside the pavements over the tunnels, 50 m apart or more.
  const legs: [P2, P2, number][] = [[[J.x, J.z - 10], [J.x, C.z + 10], F], [[fx1 + 6, C.z], [X0 - 6, C.z], LB], [[X1 + 6, C.z], [xe, C.z], LB], [[xe, C.z], [xe, ze + 8], LB]];
  const grates: P2[] = [];
  for (const [a, b, y] of legs) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let t = 10; t < len - 10; t += 4) {
      const x = a[0] + ((b[0] - a[0]) * t) / len, z = a[1] + ((b[1] - a[1]) * t) / len;
      if (grates.some(q => Math.hypot(q[0] - x, q[1] - z) < 40) || !clearOf(x - 2.5, z - 2.5, x + 2.5, z + 2.5)) continue;
      if (![4, 5, 6].some(d => [[-d, 0], [d, 0], [0, -d], [0, d]].some(([ox, oz]) => street(x + ox, z + oz)))) continue;
      if (gy(x, z) - y < 8) continue;
      grate(x, z, y);
      grates.push([x, z]);
    }
  }
  // Grates over the cavern, a ladder from the deck up through its ceiling: one a quarter, the first spot clear.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (const t of [0, 8, 16]) {
    const x = C.x + sx * (40 + t), z = C.z + sz * (24 + t / 2);
    if (!clearOf(x - 2.5, z - 2.5, x + 2.5, z + 2.5) || !free(x - 3, z - 3, x + 3, z + 3)) continue;
    grate(x, z, LA);
    break;
  }
  // Cellar steps up into the yards behind the buildings along the tunnels, 120 m apart or more.
  const cellars: P2[] = [];
  for (const [a, b, y] of legs) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    for (let t = 30; t < len - 30; t += 20) {
      const x = a[0] + ux * t, z = a[1] + uz * t;
      if (cellars.some(q => Math.hypot(q[0] - x, q[1] - z) < 120) || grates.some(q => Math.hypot(q[0] - x, q[1] - z) < 12)) continue;
      // Its foot at the tunnel's wall, coming in from the side.
      if ([-1, 1].some(sd => stairTo(x - uz * sd * (TW / 2 + 1), z + ux * sd * (TW / 2 + 1), uz * sd, -ux * sd, y, 'cellar'))) cellars.push([x, z]);
    }
  }
  // Culverts and drains out to the hillsides off the tunnels, square to them, every 30 m tried.
  // Each spot tries the kind most wanted next (a culvert, a drain, a high one, in turn), then the others.
  let culverts = 0;
  const kinds: [boolean, boolean][] = [[false, false], [true, false], [false, true]];
  for (const [a, b, y] of legs) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    for (let t = 20; t < len - 20 && culverts < 9; t += 30) for (const s of [-1, 1]) {
      const x = a[0] + ux * t, z = a[1] + uz * t, order = [0, 1, 2].map(i => kinds[(culverts + i) % 3]);
      if (order.some(([drain, high]) => culvert(x, z, -uz * s, ux * s, y, drain, high))) { culverts++; break; }
    }
  }

  // The route: along the Grand Tunnel from under Jiaochangkou to the junction, north, up the flight, east into the
  // concourse, up the west well onto the deck, along it, down the east well, on east and north to Xiaoshizi.
  const pt = (x: number, y: number, z: number): V3 => ({ x, y, z });
  u.route = [
    ...gt.walk, J, pt(J.x, F, C.z), pt(fx1 + 2, LB, C.z), pt(C.x - 3, LB, C.z), pt(C.x - 3, LB, wells[0].z0 - 1.5), pt(C.x - 3, LA, wells[0].z1 + 1.5), pt(C.x, LA, wells[0].z1 + 1.5),
    pt(C.x, LA, wells[1].z0 - 1.5), pt(C.x + 3, LA, wells[1].z0 - 1.5), pt(C.x + 3, LB, wells[1].z1 + 1.5), pt(C.x + 3, LB, C.z), pt(xe, LB, C.z), pt(xe, LB, ze),
  ];
  u.at = { deck: { x: C.x, y: LA, z: C.z }, concourse: { x: C.x, y: LB, z: C.z + 30 }, xiaoshizi: { x: xe, y: LB, z: ze } };

  let all = lining;
  for (const b of bores) all = carve(all, b);
  u.solids.push(...all, ...kept);
  return u;
}
