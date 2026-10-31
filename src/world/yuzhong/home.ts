// The friends' hideout (M3-72, U-038, U-047, U-048): their old air-raid chamber, 10 m under a real alley between two
// of the city's own buildings, its vent shaft rising to a grate in the alley's floor under a heap of rubbish bags.
// The alley is the one at the heart of the district's routes, nearest the middle of its other key points (Jiaochangkou,
// the top of Shibati's stair, the riverfront); a drainpipe goes up the taller wall beside it onto the roofs. The
// chamber is sealed: no tunnel joins it to the Grand Tunnel or the underground, and no stairway mouth or way down is
// within 60 m of the grate.
import { solid, carve, turn, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { hideoutParts, HIDEOUT } from '../sets/hideout';
import type { Heightfield } from '../heightfield';
import { heightAt } from '../heightfield';
import type { Plan } from './lots';
import type { Prop, Inter, Climbable, Zone, Site, Feature } from '../world';

type V3 = { x: number; y: number; z: number };
/** How deep the chamber's floor is under the alley; the alley's least and most width (wall to wall) and least length;
 *  how far from any way down the grate must be; how far the collapsed side passage runs; how high over the alley the
 *  roof the drainpipe climbs to may be. */
export const HOME = { depth: 10, gap: 2, wide: 6, length: 8, clear: 60, side: 4, roof: [4, 20], shaft: 0.7 };

export interface Home {
  /** the two buildings either side (their plans' indices), and the chamber's turn on the map */
  pair: [number, number]; yaw: number;
  at: Record<string, V3>;
  solids: Solid[]; props: Prop[]; inter: Inter[]; climbables: Climbable[]; zones: Zone[]; sites: Site[]; features: Feature[];
}

/** An alley between neighbours in a row: its middle, its length's way on the map, its width and length, and the walls
 *  either side (each lot's face on the alley, as an x along the alley's across-way from its middle). */
function alleysOf(plans: Plan[]) {
  const out: { n: number; x: number; z: number; ax: number; az: number; gap: number; len: number }[] = [];
  for (let n = 0; n + 1 < plans.length; n++) {
    const a = plans[n], b = plans[n + 1];
    if (!a.row || a.row !== b.row || a.far || b.far || a.sheer || b.sheer || Math.abs(Math.sin(a.obb.yaw - b.obb.yaw)) > 0.06) continue;
    const o = a.obb, c = Math.cos(o.yaw), s = Math.sin(o.yaw), dx = b.obb.cx - o.cx, dz = b.obb.cz - o.cz;
    const lx = c * dx + s * dz, lz = -s * dx + c * dz, gap = Math.abs(lx) - o.hw - b.obb.hw;
    const z0 = Math.max(-o.hd, lz - b.obb.hd), z1 = Math.min(o.hd, lz + b.obb.hd), len = z1 - z0;
    if (gap < HOME.gap || gap > HOME.wide || len < HOME.length) continue;
    const x = Math.sign(lx) * (o.hw + gap / 2), z = (z0 + z1) / 2;
    out.push({ n, x: o.cx + c * x - s * z, z: o.cz + s * x + c * z, ax: -s, az: c, gap, len });
  }
  return out;
}

/** The chamber's room underground, on the map: its box (with a margin) for a chamber whose shaft is at (px, pz). */
function chamberBox(px: number, pz: number, yaw: number, floor: number): Box {
  const x0 = px - HIDEOUT.shaftX - 1, x1 = px - HIDEOUT.shaftX + HIDEOUT.length + 7, z0 = pz - HOME.side - 1, z1 = pz + 3;
  const c = Math.cos(yaw), s = Math.sin(yaw), cs = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z]) => [px + c * (x - px) - s * (z - pz), pz + s * (x - px) + c * (z - pz)]);
  return { x0: Math.min(...cs.map(q => q[0])) - 2, y0: floor - 2, z0: Math.min(...cs.map(q => q[1])) - 2, x1: Math.max(...cs.map(q => q[0])) + 2, y1: floor + 6, z1: Math.max(...cs.map(q => q[1])) + 2 };
}
/** The neighbour whose roof a drainpipe from the alley reaches (4 to 20 m up), the lower if both do. */
function climbTo(plans: Plan[], q: { n: number }, gy: number): Plan | null {
  const [lo, hi] = HOME.roof, ok = [plans[q.n], plans[q.n + 1]].filter(p => p.wall - gy >= lo && p.wall - gy <= hi);
  return ok.sort((a, b) => a.wall - b.wall)[0] ?? null;
}
const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1 && a.z0 < b.z1 && b.z0 < a.z1;

/** The alley for it: nearest `heart` of those wide and long enough, clear of every way down by 60 m and of every
 *  dug space by its chamber. */
export function chooseAlley(g: Heightfield, plans: Plan[], heart: V3, avoid: { points: V3[]; boxes: Box[] }) {
  let best: ReturnType<typeof alleysOf>[number] | null = null, bd = Infinity;
  for (const q of alleysOf(plans)) {
    const d = Math.hypot(q.x - heart.x, q.z - heart.z);
    if (d >= bd || avoid.points.some(p => Math.hypot(p.x - q.x, p.z - q.z) < HOME.clear)) continue;
    const gy = heightAt(g, q.x, q.z);
    if (gy === null || !climbTo(plans, q, gy)) continue;
    const box = chamberBox(q.x, q.z, Math.atan2(q.az, q.ax), gy - HOME.depth);
    if (avoid.boxes.some(b => overlap(b, box))) continue;
    best = q; bd = d;
  }
  return best;
}

/** The hideout dug under the chosen alley; the ground holed over its shaft. */
export function buildHome(g: Heightfield, plans: Plan[], q: NonNullable<ReturnType<typeof chooseAlley>>): Home {
  const px = q.x, pz = q.z, yaw = Math.atan2(q.az, q.ax), gy = heightAt(g, px, pz)!, floor = gy - HOME.depth, hs = HOME.shaft;
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (x: number, z: number): [number, number] => [px + c * (x - px) - s * (z - pz), pz + s * (x - px) + c * (z - pz)];
  const ox = px - HIDEOUT.shaftX, oz = pz;
  const h = hideoutParts(ox, floor, oz, { shaftTop: gy - floor, kit: 'start', prefix: 'airraid-', side: HOME.side + 2, shaftHalf: hs });
  // The rock it's dug from: round the chamber, its stub and side passage; round the shaft up to the paving; a ring of
  // paving round the grate over the ground's cut edges.
  const t = hs + 0.3, r = hs + 1.3, sh = gy - 0.4;
  let rock: Solid[] = [solid(ox - 1, floor - 1, oz - HOME.side - 3, ox + HIDEOUT.length + 7, floor + 3.6, oz + 3, MAT.stone),
    solid(px - t, floor + 3, pz - t, px + t, sh, pz - hs, MAT.stone), solid(px - t, floor + 3, pz + hs, px + t, sh, pz + t, MAT.stone),
    solid(px - t, floor + 3, pz - hs, px - hs, sh, pz + hs, MAT.stone), solid(px + hs, floor + 3, pz - hs, px + t, sh, pz + hs, MAT.stone),
    solid(px - r, gy - 0.4, pz - r, px + r, gy + 0.02, pz - hs, MAT.concrete), solid(px - r, gy - 0.4, pz + hs, px + r, gy + 0.02, pz + r, MAT.concrete),
    solid(px - r, gy - 0.4, pz - hs, px - hs, gy + 0.02, pz + hs, MAT.concrete), solid(px + hs, gy - 0.4, pz - hs, px + r, gy + 0.02, pz + hs, MAT.concrete)];
  for (const b of h.cuts) rock = carve(rock, b);
  for (let x = px - hs; x <= px + hs + 1e-6; x += 0.25) for (let z = pz - hs; z <= pz + hs + 1e-6; z += 0.25) {
    const [mx, mz] = P(Math.min(x, px + hs), Math.min(z, pz + hs)), i = Math.floor(mx / g.cell), j = Math.floor(mz / g.cell);
    if (i >= 0 && j >= 0 && i < g.w - 1 && j < g.h - 1) g.hole[j * (g.w - 1) + i] = 1;
  }
  const out: Home = { pair: [q.n, q.n + 1], yaw, at: {}, solids: turn(rock.concat(h.solids), yaw, px, pz), props: [], inter: [], climbables: [], zones: [], sites: [], features: [] };
  out.props.push(...h.props.map(p => { const [x, z] = P(p.x, p.z); return { ...p, x, z, yaw: p.yaw - yaw }; }));
  out.inter.push(...h.inter.map(i => { const [x, z] = P(i.x, i.z); return { ...i, x, z }; }));
  out.climbables.push(...h.climbables.map(cl => { const [x, z] = P(cl.x, cl.z), [ax, az] = P(cl.x + cl.nx, cl.z + cl.nz); return { ...cl, x, z, nx: ax - x, nz: az - z }; }));
  out.zones.push(...h.zones.map(zn => {
    const cs = [P(zn.box.x0, zn.box.z0), P(zn.box.x1, zn.box.z0), P(zn.box.x0, zn.box.z1), P(zn.box.x1, zn.box.z1)], xs = cs.map(v => v[0]), zs = cs.map(v => v[1]);
    return { ...zn, box: { ...zn.box, x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) } };
  }));
  for (const [k, v] of Object.entries(h.at)) { const [x, z] = P(v.x, v.z); out.at[k] = { x, y: v.y, z }; }
  out.at.grate = { x: px, y: gy, z: pz };
  out.sites.push({ id: 'airraid', kind: 'cellar', x: out.at.mattress.x, y: floor, z: out.at.mattress.z, bed: 'airraid-mattress', table: null, containers: ['airraid-stash'], exits: 1, windows: 0, streetSides: 0 });
  // The alley's dressing: neon over the grate on both walls, a bin by it.
  const ux = -q.az, uz = q.ax, half = q.gap / 2;
  for (const k of [-1, 1]) out.props.push({ kind: 'neon', x: px + ux * k * (half - 0.1) + q.ax * 2, y: gy + 3.2, z: pz + uz * k * (half - 0.1) + q.az * 2, yaw: Math.atan2(-ux * k, -uz * k), w: 1.2 });
  out.props.push({ kind: 'trash', x: px + ux * (half - 0.5) - q.ax * 2.5, y: gy, z: pz + uz * (half - 0.5) - q.az * 2.5, yaw: yaw });
  // The way up: a drainpipe on a wall, 4 m along from the grate, from the alley to its roof.
  const tall = climbTo(plans, q, gy)!;
  const side = Math.sign((tall.obb.cx - px) * ux + (tall.obb.cz - pz) * uz), wx = px + ux * side * (half - 0.12) + q.ax * 4, wz = pz + uz * side * (half - 0.12) + q.az * 4;
  out.climbables.push({ kind: 'pipe', x: wx, z: wz, y0: gy, y1: tall.wall + 0.2, nx: -ux * side, nz: -uz * side });
  out.solids.push(solid(wx - 0.06, gy, wz - 0.06, wx + 0.06, tall.wall + 0.2, wz + 0.06, MAT.metal));
  out.features.push({ kind: 'climbUp', x: wx - ux * side * 0.4, y: gy, z: wz - uz * side * 0.4, group: 0 }, { kind: 'climbUp', x: wx + ux * side * 1.2, y: tall.wall, z: wz + uz * side * 1.2, group: 0 });
  out.at.pipe = { x: wx, y: gy, z: wz };
  return out;
}
