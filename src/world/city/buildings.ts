// The ordinary city fabric: one lot's building by kind (walk-ups, slabs, towers, Shibati's traditional houses),
// parapets, pitched roofs, roof clutter, facade climbing and interiors.
import { solid, rampSolid, type Solid } from '../geom';
import { MAT } from '../mats';
import { makeRng, rand, randInt, hashString, type Rng } from '../../sim/rng';
import type { Prop, Inter, Climbable, HideSpot, Site, Feature } from '../world';
import { canEnter, hollow } from './interiors';
import { facades } from './climb';
import { climbLine } from './routes';
import { details } from './details';
import { fronts, shopHouse } from './fronts';
import { tower } from './towers';
import { tintFor, PAINTED } from './palette';

export type LotKind = 'res' | 'tower' | 'trad';
export interface Lot {
  id: number; x0: number; z0: number; x1: number; z1: number; base: number; top: number; wall: number; kind: LotKind; mat: number;
  /** facing a street on its north, south, west and east sides */
  street: [boolean, boolean, boolean, boolean];
  /** per side, how far across the street the next building stands (0: none), for cables strung over it */
  across: [number, number, number, number];
  /** never hollowed: the ground round it rises above its floor (Yuzhong lots against a higher street) */
  noEnter?: boolean;
  /** its colour (M3-46): set by the caller or chosen from the palette by its material */
  tint?: number;
  /** a tower's podium top, if it has one */
  podium?: number;
  /** enterable buildings: a walking route from outside the door up the stairs and out onto the roof */
  route?: { x: number; y: number; z: number }[];
  /** a climbing line up one side (north, south, west, east) at `at` along it, from a neighbour's roof at y0 (U-032) */
  climb?: { face: number; at: number; y0: number };
  /** a tower's skyline: the highest roof round it (U-036); over it its walls hold more */
  sky?: number;
  /** its roof runs out to its walls (a plank or a bridge meets its edge): no setback at the top */
  edge?: boolean;
  /** the ground height at a point of its own frame (Yuzhong, where the ground round a lot may rise over its base) */
  ground?: (x: number, z: number) => number;
}
export interface Fabric { solids: Solid[]; decor: Solid[]; props: Prop[]; lots: Lot[]; inter: Inter[]; climbables: Climbable[]; hides: HideSpot[]; features: Feature[]; sites: Site[]; far: Solid[] }

const FLOOR = 3;
/** Roof parapets: a lip to grab, cover when crouched, low enough to jump over (U-014). */
export const PARAPET = 0.6;
/** Build one lot (its mass, roof and facade climbing) into out. Its
 *  walls, slabs and glass take its colour (M3-46), from a stream of its own so the layout never shifts. */
export function buildLot(l: Lot, r: Rng, out: Fabric) {
  const s0 = out.solids.length, f0 = out.far.length;
  l.tint ??= tintFor(l.mat, makeRng(hashString(`tint:${l.x0}:${l.z0}`)));
  if (l.kind === 'tower') tower(l, r, out); else { mass(l, r, out); facades(l, r, out); }
  if (l.climb && l.kind !== 'tower') climbLine(l, [{ x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1, y0: l.climb.y0, y1: l.wall, top: l.top }], l.climb.face, l.climb.at, r, out);
  for (const list of [out.solids.slice(s0), out.far.slice(f0)]) for (const s of list) if (s.tint === undefined && PAINTED.has(s.mat)) s.tint = l.tint;
}

/** Solid blocks wear painted facades with window grids; hollow ones show their real openings. */
function paint(l: Lot, r: Rng): number {
  if (l.kind !== 'res' || l.mat === MAT.facadeBand) return l.mat;
  if (l.wall - l.base <= 12 && rand(r) < 0.5) return MAT.facadeBrick;
  return l.mat === MAT.tile ? MAT.facadeTile : MAT.facade;
}

function mass(l: Lot, r: Rng, out: Fabric) {
  const { x0, z0, x1, z1, base, wall } = l;
  // Nine in ten blocks that fit a stair core can be entered (U-022, U-023, M3-55: more of the city opens up; by
  // 2038 most doors have been forced).
  const open = canEnter(l) && rand(r) < 0.9;
  const look = open ? (l.mat === MAT.tile ? MAT.facadeTile : MAT.facade) : paint(l, r);
  // Some tall solid blocks step their top two floors back from the edge.
  const step = !open && !l.climb && !l.edge && l.kind === 'res' && wall - base >= 24 && rand(r) < 0.25 ? 1.6 : 0;
  // Half of Shibati's shop houses on flat ground stand open (M3-55).
  const shop = l.kind === 'trad' && !l.noEnter && wall - base >= 5 && Math.min(x1 - x0, z1 - z0) >= 3.5 && rand(r) < 0.5 ? l.street.findIndex(Boolean) : -1;
  if (open) hollow(l, r, out);
  else if (shop >= 0) shopHouse(l, shop, look, out);
  else if (step) out.solids.push(solid(x0, base, z0, x1, wall - 2 * FLOOR, z1, look), solid(x0 + step, wall - 2 * FLOOR, z0 + step, x1 - step, wall, z1 - step, look));
  else out.solids.push(solid(x0, base, z0, x1, wall, z1, look));
  // The far view's stand-in: the whole block in its painted facade, parapet included.
  if (l.kind !== 'trad') out.far.push(solid(x0, base, z0, x1, wall + PARAPET, z1, look));
  if (l.kind === 'trad') {
    // Pitched tiled roof: ridges run along the street it fronts, so a row of houses lines up into a rooftop
    // route; eaves overhang as decor.
    const rise = 2;
    if (l.street[0] || l.street[1] || (!l.street[2] && !l.street[3] && x1 - x0 >= (z1 - z0) * 0.7)) {
      const zm = (z0 + z1) / 2;
      out.solids.push(rampSolid(x0, wall, z0, x1, zm, wall, wall + rise, 3, MAT.roofTile), rampSolid(x0, wall, zm, x1, z1, wall, wall + rise, 4, MAT.roofTile));
    } else {
      const xm = (x0 + x1) / 2;
      out.solids.push(rampSolid(x0, wall, z0, xm, z1, wall, wall + rise, 1, MAT.roofTile), rampSolid(xm, wall, z0, x1, z1, wall, wall + rise, 2, MAT.roofTile));
    }
    out.far.push(solid(x0, base, z0, x1, wall, z1, l.mat), ...out.solids.slice(-2));
    // The eave plate is solid all round: its edge is the lip he pulls over onto the tiles.
    out.solids.push(solid(x0 - 0.4, wall - 0.12, z0 - 0.4, x1 + 0.4, wall, z1 + 0.4, MAT.wood));
    l.top = wall + rise;
    return;
  }
  // Parapet: a lip to grab from the facade and a low wall on the roof (round the top part of a stepped block).
  const p = PARAPET, w = 0.2;
  if (step) {
    out.solids.push(solid(x0, wall - 2 * FLOOR, z0, x1, wall - 2 * FLOOR + 0.3, z0 + w, MAT.concrete), solid(x0, wall - 2 * FLOOR, z1 - w, x1, wall - 2 * FLOOR + 0.3, z1, MAT.concrete));
  }
  if (!open) details(l, r, out, wall - (step ? 2 * FLOOR : 0));
  fronts(l, look, open, step > 0, out);
  const px0 = x0 + step, pz0 = z0 + step, px1 = x1 - step, pz1 = z1 - step;
  out.solids.push(
    solid(px0, wall, pz0, px1, wall + p, pz0 + w, MAT.concrete), solid(px0, wall, pz1 - w, px1, wall + p, pz1, MAT.concrete),
    solid(px0, wall, pz0 + w, px0 + w, wall + p, pz1 - w, MAT.concrete), solid(px1 - w, wall, pz0 + w, px1, wall + p, pz1 - w, MAT.concrete),
  );
  l.top = wall + p;
  // Roof clutter: water tanks on stilts, AC condensers, sometimes a stairwell hut (enterable roofs have a real one).
  const n = open ? 0 : 1 + randInt(r, 3);
  for (let i = 0; i < n; i++) {
    const cx = px0 + 1.5 + rand(r) * Math.max(0.1, px1 - px0 - 3), cz = pz0 + 1.5 + rand(r) * Math.max(0.1, pz1 - pz0 - 3);
    const k = randInt(r, 3);
    if (k === 0) {
      // A water tank on stilts, empty now: room to hide in (M3-47).
      out.solids.push(solid(cx - 1, wall + 0.6, cz - 1, cx + 1, wall + 2.2, cz + 1, MAT.metal)); out.props.push({ kind: 'stilts', x: cx, y: wall, z: cz, yaw: 0, w: 2, h: 0.6 });
      out.hides.push({ id: out.hides.length, kind: 'tank', inner: { x0: cx - 0.9, y0: wall + 0.7, z0: cz - 0.9, x1: cx + 0.9, y1: wall + 2.1, z1: cz + 0.9 } });
    }
    else if (k === 1) out.solids.push(solid(cx - 0.5, wall, cz - 0.35, cx + 0.5, wall + 0.7, cz + 0.35, MAT.metal));
    else if (px1 - px0 > 6 && pz1 - pz0 > 6) out.solids.push(solid(cx - 1.3, wall, cz - 1.3, cx + 1.3, wall + 2.6, cz + 1.3, MAT.concrete));
  }
}
