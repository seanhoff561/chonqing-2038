// Basements (M3-73a, U-038): under some blocks with a stairwell, a cellar the size of the block less 3 m all round
// (store rooms, a boiler, junk), a hatch from the lobby floor and an iron ladder down into it, and in its floor at the
// far end a manhole down to the sewers (yuzhong/sewers.ts digs the shaft and the maze from its 'sewer' feature).
// Lined in concrete; the caller cuts the foundation for it and holes the ground's shell over it.
import type { Solid } from '../geom';
import { MAT } from '../mats';
import { rand, type Rng } from '../../sim/rng';
import { FLOOR, furnish, type Floor, type Rect } from './rooms';
import type { Lot, Fabric } from './buildings';

/** How far in from the outer walls it stops (the ground's shell is holed over it in 2 m cells, which must stay under
 *  the building); its slabs' and walls' thickness. */
const INSET = 3, T = 0.3;

interface Frame { U: number; V: number; base: number; alongZ: boolean; B: Floor['B']; at: Floor['at']; nid: Floor['nid']; decay: number; lobby: Rect }

export function basement(l: Lot, r: Rng, out: Fabric, f: Frame) {
  const { U, V, base, B } = f, u0 = INSET, u1 = U - INSET, v0 = INSET, v1 = V - INSET;
  // The hatch: in the lobby, over the basement.
  const hv = Math.min(f.lobby[3], v1) - 0.7, hu = u0 + 0.8;
  if (u1 - u0 < 4 || v1 - v0 < 2.4 || hv - 0.5 < Math.max(f.lobby[1], v0)) return;
  const y0 = base - FLOOR - 0.2, y1 = base - T;
  const [ax, az] = f.at(u0, v0), [bx, bz] = f.at(u1, v1);
  l.basement = { x0: Math.min(ax, bx), z0: Math.min(az, bz), x1: Math.max(ax, bx), z1: Math.max(az, bz), y0, y1 };
  const hatch: Rect = [hu - 0.5, hv - 0.5, hu + 0.5, hv + 0.5], hole: Rect = [u1 - 2, (v0 + v1) / 2 - 0.7, u1 - 0.6, (v0 + v1) / 2 + 0.7];
  /** A slab over the basement's footprint less an opening. */
  const slab = (ya: number, yb: number, gap: Rect): Solid[] => [
    B(u0 - T, ya, v0 - T, gap[0], yb, v1 + T, MAT.concrete), B(gap[2], ya, v0 - T, u1 + T, yb, v1 + T, MAT.concrete),
    B(gap[0], ya, v0 - T, gap[2], yb, gap[1], MAT.concrete), B(gap[0], ya, gap[3], gap[2], yb, v1 + T, MAT.concrete),
  ];
  out.solids.push(...slab(y1, base, hatch), ...slab(y0 - T, y0, hole),
    B(u0 - T, y0, v0 - T, u0, y1, v1 + T, MAT.concrete), B(u1, y0, v0 - T, u1 + T, y1, v1 + T, MAT.concrete),
    B(u0, y0, v0 - T, u1, y1, v0, MAT.concrete), B(u0, y0, v1, u1, y1, v1 + T, MAT.concrete));
  // The ladder up through the hatch, against its side away from the stairwell; a rim round the manhole.
  const [lx, lz] = f.at(hu - 0.5, hv), [nx, nz] = f.alongZ ? [0, 1] : [1, 0];
  out.climbables.push({ kind: 'ladder', x: lx, z: lz, y0, y1: base + 1, nx, nz });
  for (const q of [[hole[0] - 0.1, hole[1] - 0.1, hole[2] + 0.1, hole[1]], [hole[0] - 0.1, hole[3], hole[2] + 0.1, hole[3] + 0.1]] as Rect[]) out.decor.push(B(q[0], y0, q[1], q[2], y0 + 0.08, q[3], MAT.metal));
  // Over the manhole a grate: bolted from below in half of them (up from the sewers it's pried open, from here it
  // won't lift), loose in the rest.
  const [mx, mz] = f.at((hole[0] + hole[2]) / 2, (hole[1] + hole[3]) / 2), id = f.nid('mh');
  out.solids.push({ ...B(hole[0], y0 - 0.08, hole[1], hole[2], y0, hole[3], MAT.hidden), part: id });
  out.props.push({ kind: 'grate', x: mx, y: y0 - 0.04, z: mz, yaw: f.alongZ ? Math.PI / 2 : 0, w: hole[2] - hole[0], text: id });
  out.inter.push({ id, kind: 'grate', x: mx, y: y0 - 0.04, z: mz, r: 1, zh: '下水道铁栅', en: 'Drain grate', data: { part: id, manhole: true, ...(rand(r) < 0.5 ? { loose: true } : {}) } });
  out.features.push({ kind: 'sewer', x: mx, y: y0, z: mz, group: out.features.length });
  furnish({ l, y: y0, k: -1, alongZ: f.alongZ, B, at: f.at, decay: f.decay, nid: f.nid }, [u0, v0, u1, v1], 'store', [[hu - 1.2, hv - 1.2, hu + 1.2, hv + 1.2], [hole[0] - 1, hole[1] - 1, u1, hole[3] + 1]], false, r, out,
    { id: '', kind: 'flat', x: 0, y: 0, z: 0, bed: null, table: null, containers: [], exits: 1, windows: 0, streetSides: 0 });
}
