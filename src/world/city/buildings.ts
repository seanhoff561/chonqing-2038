// The ordinary city fabric: one lot's building by kind (walk-ups, slabs, towers, Shibati's traditional houses),
// parapets, pitched roofs, roof clutter, facade climbing and interiors.
import { solid, carve, rampSolid, type Solid } from '../geom';
import { MAT } from '../mats';
import { makeRng, rand, randInt, hashString, type Rng } from '../../sim/rng';
import type { Prop, Inter, Climbable, HideSpot, Site, Feature } from '../world';
import { canEnter, hollow } from './interiors';
import { facades } from './climb';
import { details } from './details';
import { fronts } from './fronts';
import { tower } from './towers';
import { tintFor, PAINTED } from './palette';
import { ENVELOPE as E } from '../../data/envelope';

export type LotKind = 'res' | 'tower';
export interface Lot {
  id: number; x0: number; z0: number; x1: number; z1: number; base: number; top: number; wall: number; kind: LotKind; mat: number;
  /** facing a street on its north, south, west and east sides */
  street: [boolean, boolean, boolean, boolean];
  /** per side, how far across the street the next building stands (0: none), for cables strung over it */
  across: [number, number, number, number];
  /** never hollowed: the ground round it rises above its floor (Yuzhong lots against a higher street) */
  noEnter?: boolean;
  /** a cache reached only with a tool (M3-37, U-037): no holds, fronts or details on its walls */
  sheer?: boolean;
  /** a cache's neighbour (M3-37): no holds on its walls, none beside the cache */
  holdless?: boolean;
  /** its colour (M3-46): set by the caller or chosen from the palette by its material */
  tint?: number;
  /** a tower's podium top, if it has one */
  podium?: number;
  /** enterable buildings: a walking route from outside the door up the stairs and out onto the roof */
  route?: { x: number; y: number; z: number }[];
  /** a tower's skyline: the highest roof round it (U-036); over it its walls hold more */
  sky?: number;
  /** its walls run straight up to its roof (a connection meets them): no setback at the top, no tower's shaft set
   *  back from its podium (M3-81) */
  edge?: boolean;
  /** its roof kept clear (a rooftop route runs over it): no clutter */
  bare?: boolean;
  /** an old house's pitched roof of grey tile, its ridge along x (Shibati, M3-35), in place of a parapet */
  pitched?: boolean;
  /** the ground height at a point of its own frame (Yuzhong, where the ground round a lot may rise over its base) */
  ground?: (x: number, z: number) => number;
  /** its basement (M3-73a), in its own frame: the space under the ground floor (the foundation is cut for it and the
   *  ground's shell holed over it by the caller) */
  basement?: { x0: number; z0: number; x1: number; z1: number; y0: number; y1: number };
}
export interface Fabric { solids: Solid[]; decor: Solid[]; props: Prop[]; lots: Lot[]; inter: Inter[]; climbables: Climbable[]; hides: HideSpot[]; features: Feature[]; sites: Site[]; far: Solid[] }

const FLOOR = 3;
/** Roof parapets: a lip to grab, cover when crouched, low enough to jump over (U-014). */
export const PARAPET = 0.6;
/** Build one lot (its mass, roof and facade climbing) into out. Its
 *  walls, slabs and glass take its colour (M3-46), from a stream of its own so the layout never shifts. */
export function buildLot(l: Lot, r: Rng, out: Fabric) {
  const s0 = out.solids.length, f0 = out.far.length, c0 = out.climbables.length;
  l.tint ??= tintFor(l.mat, makeRng(hashString(`tint:${l.x0}:${l.z0}`)));
  if (l.kind === 'tower') tower(l, r, out); else { mass(l, r, out); if (!l.sheer && !l.holdless) facades(l, r, out); }
  // A vine from the foot of a wall (M3-62) stops a mantle short of the first hold over it on that wall, or of the
  // roof where the ground's high beside it: up to a sill, not on up the building (U-036).
  for (let i = out.climbables.length - 1; i >= c0; i--) {
    const c = out.climbables[i];
    if (c.kind !== 'pipe' || c.y0 > (l.ground?.(c.x + c.nx * 0.6, c.z + c.nz * 0.6) ?? l.base) + 1.5) continue;
    // (Anything on its walls: what's not the block itself, well inside them.)
    const near = (x: number, z: number) => Math.hypot(x - c.x, z - c.z) < 2.6, body = (x: number, z: number) => x > l.x0 + 0.35 && x < l.x1 - 0.35 && z > l.z0 + 0.35 && z < l.z1 - 0.35;
    const over = out.solids.slice(s0).filter(s => s.y1 > c.y0 + 1 && s.y1 < l.wall + 0.3 && near((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2) && !body((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2)).map(s => s.y1)
      .concat(out.climbables.slice(c0).filter(o => o !== c && near(o.x, o.z)).map(o => o.y0), [l.wall]);
    c.y1 = Math.min(c.y1, Math.min(...over) - E.mantleJump.max - 0.1);
    if (c.y1 < c.y0 + 2) out.climbables.splice(i, 1);
  }
  for (const list of [out.solids.slice(s0), out.far.slice(f0)]) for (const s of list) if (s.tint === undefined && PAINTED.has(s.mat)) s.tint = l.tint;
}

/** Solid blocks wear painted facades with window grids; hollow ones show their real openings. */
function paint(l: Lot, r: Rng): number {
  if (l.kind !== 'res' || l.mat === MAT.facadeBand) return l.mat;
  if (l.wall - l.base <= 12 && rand(r) < 0.5) return MAT.facadeBrick;
  return l.mat === MAT.tile ? MAT.facadeTile : MAT.facade;
}

/** Nooks in a solid block's ground floor (M3-71, U-038): a recess a body wide in a wall on a street or a yard, to
 *  press into out of a passing patrol's sight; one or two a block, three blocks in five, clear of its corners. */
function nooks(l: Lot, m0: number, r: Rng, out: Fabric) {
  if (rand(r) > 0.6 || l.wall - l.base < 4) return;
  for (const s of out.solids.slice(m0)) s.orig ??= { x0: s.x0, y0: s.y0, z0: s.z0, x1: s.x1, z1: s.z1 };
  const sideOf = [[l.x0, l.x1, l.z0, 0, -1], [l.x0, l.x1, l.z1, 0, 1], [l.z0, l.z1, l.x0, -1, 0], [l.z0, l.z1, l.x1, 1, 0]] as const;
  for (let k = 0, n = 1 + randInt(r, 2); k < n; k++) {
    const [a, b, f, nx, nz] = sideOf[randInt(r, 4)], len = b - a;
    if (len < 4) continue;
    const c = a + 1.2 + rand(r) * (len - 2.4), y = l.ground?.(nx ? f + nx : c, nz ? f + nz : c) ?? l.base;
    if (y < l.base - 0.1 || y > l.base + 0.4) continue;
    // 1.0 wide, 0.95 deep into the wall, 1.9 high.
    const nook = nz ? solid(c - 0.5, y, nz < 0 ? f : f - 0.95, c + 0.5, y + 1.9, nz < 0 ? f + 0.95 : f, 0) : solid(nx < 0 ? f : f - 0.95, y, c - 0.5, nx < 0 ? f + 0.95 : f, y + 1.9, c + 0.5, 0);
    out.solids.splice(m0, out.solids.length - m0, ...carve(out.solids.slice(m0), nook));
    out.hides.push({ id: out.hides.length, kind: 'nook', inner: { x0: nook.x0 + 0.05, y0: y, z0: nook.z0 + 0.05, x1: nook.x1 - 0.05, y1: y + 1.85, z1: nook.z1 - 0.05 }, yaw: Math.atan2(-nx, -nz) });
    out.features.push({ kind: 'nook', x: (nook.x0 + nook.x1) / 2, y, z: (nook.z0 + nook.z1) / 2, group: out.features.length, nx, nz });
  }
}

function mass(l: Lot, r: Rng, out: Fabric) {
  const { x0, z0, x1, z1, base, wall } = l;
  // Nine in ten blocks that fit a stair core can be entered (U-022, U-023, M3-55: more of the city opens up; by
  // 2038 most doors have been forced).
  const open = canEnter(l) && rand(r) < 0.9;
  const look = open ? (l.mat === MAT.tile ? MAT.facadeTile : MAT.facade) : paint(l, r);
  // Some tall solid blocks step their top two floors back from the edge.
  const step = !open && !l.edge && l.kind === 'res' && wall - base >= 24 && rand(r) < 0.25 ? 1.6 : 0;
  const m0 = out.solids.length;
  if (open) hollow(l, r, out, look);
  else if (step) out.solids.push(solid(x0, base, z0, x1, wall - 2 * FLOOR, z1, look), solid(x0 + step, wall - 2 * FLOOR, z0 + step, x1 - step, wall, z1 - step, look));
  else out.solids.push(solid(x0, base, z0, x1, wall, z1, look));
  if (!open && !l.sheer) nooks(l, m0, r, out);
  // The far view's stand-in: the whole block in its painted facade, parapet included.
  out.far.push(solid(x0, base, z0, x1, wall + PARAPET, z1, look));
  // Parapet: a lip to grab from the facade and a low wall on the roof (round the top part of a stepped block).
  const p = PARAPET, w = 0.2;
  if (step) {
    out.solids.push(solid(x0, wall - 2 * FLOOR, z0, x1, wall - 2 * FLOOR + 0.3, z0 + w, MAT.concrete), solid(x0, wall - 2 * FLOOR, z1 - w, x1, wall - 2 * FLOOR + 0.3, z1, MAT.concrete));
  }
  if (!open && !l.sheer) details(l, r, out, wall - (step ? 2 * FLOOR : 0));
  if (!l.sheer) fronts(l, look, open, step > 0, out);
  const px0 = x0 + step, pz0 = z0 + step, px1 = x1 - step, pz1 = z1 - step;
  // (An enterable one keeps a flat roof: its stairs and hatches come out on it.)
  if (l.pitched && !open) {
    // Two slopes of grey tile at 25 degrees meeting at a ridge along its length, the eaves out over the walls.
    const zm = (z0 + z1) / 2, h = (zm - z0) * 0.47;
    out.solids.push(rampSolid(x0 - 0.3, wall, z0 - 0.4, x1 + 0.3, zm, wall + 0.12, wall + h, 3, MAT.roofTile), rampSolid(x0 - 0.3, wall, zm, x1 + 0.3, z1 + 0.4, wall + 0.12, wall + h, 4, MAT.roofTile));
    out.far.push(solid(x0, wall, z0, x1, wall + h * 0.6, z1, MAT.roofTile));
    l.top = wall + h;
    return;
  }
  out.solids.push(
    solid(px0, wall, pz0, px1, wall + p, pz0 + w, MAT.concrete), solid(px0, wall, pz1 - w, px1, wall + p, pz1, MAT.concrete),
    solid(px0, wall, pz0 + w, px0 + w, wall + p, pz1 - w, MAT.concrete), solid(px1 - w, wall, pz0 + w, px1, wall + p, pz1 - w, MAT.concrete),
  );
  l.top = wall + p;
  roofClutter(l, open, wall, [px0, pz0, px1, pz1], r, out);
}

/** Roof clutter (U-044: urban, never green; U-049: sparse, and laid out as it would be): on four roofs in ten
 *  nothing; on the rest one arrangement, now and then two, each set square to the roof's edges: a water tank on stilts
 *  in a corner with blue drums by it (both room to hide in, M3-47); a row of AC condensers along an edge; solar water
 *  heaters side by side along an edge; a corrugated shed in a corner, open at one end (a corner to crouch in), crates
 *  stacked at its mouth; on a big roof a stairwell hut. None on a roof a route keeps bare, nor round an enterable
 *  block's roof hut and stair (its corner). */
function roofClutter(l: Lot, open: boolean, wall: number, [px0, pz0, px1, pz1]: [number, number, number, number], r: Rng, out: Fabric) {
  const roll = rand(r), n = l.bare ? 0 : roll < 0.4 ? 0 : roll < 0.85 ? 1 : 2, W = px1 - px0, D = pz1 - pz0;
  if (W < 4 || D < 4) return;
  const used: [number, number, number, number][] = [];
  const free = (x0: number, z0: number, x1: number, z1: number) => x0 >= px0 + 0.3 && z0 >= pz0 + 0.3 && x1 <= px1 - 0.3 && z1 <= pz1 - 0.3 &&
    !(open && x0 < l.x0 + 9 && z0 < l.z0 + 9) && !used.some(([a, b, c, d]) => x0 < c + 1 && a < x1 + 1 && z0 < d + 1 && b < z1 + 1);
  const box = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, mat: number) => solid(x0, wall + y0, z0, x1, wall + y1, z1, mat);
  // Each arrangement: its footprint along and across from a corner, and how it's built there (sx, sz: which way it
  // runs from the corner).
  const m = 3 + randInt(r, 2);
  const make: [number, number, (cx: number, cz: number, sx: number, sz: number) => void][] = [
    [5.4, 2.6, (cx, cz, sx, sz) => {
      // Water: the tank on stilts in the corner, two drums along the edge from it.
      const t = (x: number, z: number) => [cx + sx * x, cz + sz * z] as const, [tx, tz] = t(1.3, 1.3);
      out.solids.push(box(tx - 1, tz - 1, tx + 1, tz + 1, 0.6, 2.2, MAT.metal)); out.props.push({ kind: 'stilts', x: tx, y: wall, z: tz, yaw: 0, w: 2, h: 0.6 });
      out.hides.push({ id: out.hides.length, kind: 'tank', inner: { x0: tx - 0.9, y0: wall + 0.7, z0: tz - 0.9, x1: tx + 0.9, y1: wall + 2.1, z1: tz + 0.9 } });
      for (let k = 0; k < 2; k++) { const [dx, dz] = t(3 + k * 1.2, 0.8); out.solids.push(box(dx - 0.5, dz - 0.5, dx + 0.5, dz + 0.5, 0, 1.25, MAT.hidden)); out.props.push({ kind: 'drum', x: dx, y: wall, z: dz, yaw: k * 0.7 }); }
    }],
    [1.3 * m + 0.6, 1.4, (cx, cz, sx, sz) => {
      // Cooling: three or four condensers in a row along the edge, a hand apart.
      for (let k = 0; k < m; k++) { const x = cx + sx * (0.9 + k * 1.3), z = cz + sz * 0.7; out.solids.push(box(x - 0.5, z - 0.35, x + 0.5, z + 0.35, 0, 0.75, MAT.metal)); }
    }],
    [4.8, 1.8, (cx, cz, sx, sz) => {
      // Solar water heaters, two side by side along the edge, tubes tilted the same way.
      for (let k = 0; k < 2; k++) {
        const x = cx + sx * (1.2 + k * 2.3), z = cz + sz * 0.9;
        out.solids.push(box(x - 1, z - 0.6, x + 1, z + 0.6, 0, 0.3, MAT.metal));
        out.decor.push(box(x - 1, z - 0.6, x + 1, z - 0.5, 0.3, 0.9, MAT.glass), box(x - 1.05, z + 0.2, x + 1.05, z + 0.55, 1.0, 1.35, MAT.metal));
      }
    }],
    [4.2, 2.2, (cx, cz, sx, sz) => {
      // Storage: a corrugated shed in the corner, its open end facing along the edge, crates stacked at its mouth.
      const x = cx + sx * 1.3, z = cz + sz * 1.0;
      out.solids.push(box(x - 1.2, z - 0.9, x + 1.2, z - 0.85, 0, 2.1, MAT.metal), box(x - 1.2, z + 0.85, x + 1.2, z + 0.9, 0, 2.1, MAT.metal),
        box(x - sx * 1.25 - 0.025, z - 0.9, x - sx * 1.25 + 0.025, z + 0.9, 0, 2.1, MAT.metal), box(x - 1.3, z - 0.95, x + 1.3, z + 0.95, 2.1, 2.2, MAT.metal));
      out.hides.push({ id: out.hides.length, kind: 'nook', inner: { x0: Math.min(x - sx * 1.15, x - sx * 0.25), y0: wall, z0: z - 0.8, x1: Math.max(x - sx * 1.15, x - sx * 0.25), y1: wall + 1.9, z1: z + 0.8 } });
      for (let k = 0; k < 3; k++) { const s = 0.7, cxk = x + sx * (2.0 + (k % 2) * 0.75), y = k === 2 ? 0.7 : 0; out.solids.push(box(cxk - s / 2, z - s / 2 + sz * 0.1, cxk + s / 2, z + s / 2 + sz * 0.1, y, y + s, MAT.crate)); }
    }],
    // A stairwell hut on a big roof (not an enterable block's: it has its own), an aerial on it.
    [W >= 9 && D >= 9 && !open ? 3.2 : 99, 3.2, (cx, cz, sx, sz) => {
      const x = cx + sx * 1.6, z = cz + sz * 1.6;
      out.solids.push(box(x - 1.3, z - 1.3, x + 1.3, z + 1.3, 0, 2.6, MAT.concrete));
      out.props.push({ kind: 'antenna', x, y: wall + 2.6, z, yaw: 0 });
    }],
  ];
  for (let i = 0, tries = 0; i < n && tries < 8; tries++) {
    const [along, across, build] = make[randInt(r, make.length)], sx = rand(r) < 0.5 ? 1 : -1, sz = rand(r) < 0.5 ? 1 : -1, cx = sx > 0 ? px0 + 0.3 : px1 - 0.3, cz = sz > 0 ? pz0 + 0.3 : pz1 - 0.3;
    const x0 = Math.min(cx, cx + sx * along), x1 = Math.max(cx, cx + sx * along), z0 = Math.min(cz, cz + sz * across), z1 = Math.max(cz, cz + sz * across);
    if (!free(x0, z0, x1, z1)) continue;
    build(cx, cz, sx, sz);
    used.push([x0, z0, x1, z1]);
    i++;
  }
}
