// The ordinary city fabric: one lot's building by kind (walk-ups, slabs, towers, Shibati's traditional houses),
// parapets, pitched roofs, roof clutter, facade climbing and interiors.
import { solid, carve, type Solid } from '../geom';
import { MAT } from '../mats';
import { makeRng, rand, randInt, hashString, type Rng } from '../../sim/rng';
import type { Prop, Inter, Climbable, HideSpot, Site, Feature } from '../world';
import { canEnter, hollow } from './interiors';
import { facades } from './climb';
import { details } from './details';
import { fronts } from './fronts';
import { tower } from './towers';
import { tintFor, PAINTED } from './palette';

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
  const s0 = out.solids.length, f0 = out.far.length;
  l.tint ??= tintFor(l.mat, makeRng(hashString(`tint:${l.x0}:${l.z0}`)));
  if (l.kind === 'tower') tower(l, r, out); else { mass(l, r, out); if (!l.sheer) facades(l, r, out); }
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
  out.solids.push(
    solid(px0, wall, pz0, px1, wall + p, pz0 + w, MAT.concrete), solid(px0, wall, pz1 - w, px1, wall + p, pz1, MAT.concrete),
    solid(px0, wall, pz0 + w, px0 + w, wall + p, pz1 - w, MAT.concrete), solid(px1 - w, wall, pz0 + w, px1, wall + p, pz1 - w, MAT.concrete),
  );
  l.top = wall + p;
  roofClutter(l, open, wall, [px0, pz0, px1, pz1], r, out);
}

/** Roof clutter (U-044: urban, never green), two to five things: water tanks on stilts and plastic drums (both room to
 *  hide in), AC condensers in a row, a corrugated shed open at one end (a corner to crouch in), a pile of crates, a
 *  solar water heater, a stairwell hut on a big roof. None on a roof a route keeps bare, nor round an enterable
 *  block's roof hut and stair (its corner). */
function roofClutter(l: Lot, open: boolean, wall: number, [px0, pz0, px1, pz1]: [number, number, number, number], r: Rng, out: Fabric) {
  const n = l.bare ? 0 : 2 + randInt(r, 4), placed: [number, number, number][] = [];
  for (let i = 0, t = 0; i < n && t < 20; t++) {
    const cx = px0 + 1.8 + rand(r) * Math.max(0.1, px1 - px0 - 3.6), cz = pz0 + 1.8 + rand(r) * Math.max(0.1, pz1 - pz0 - 3.6), k = randInt(r, 7);
    if ((open && Math.hypot(cx - l.x0, cz - l.z0) < 9) || placed.some(([x, z, rr]) => Math.hypot(cx - x, cz - z) < rr + 1.8)) continue;
    i++;
    if (k === 0) {
      // A water tank on stilts, empty now: room to hide in (M3-47).
      out.solids.push(solid(cx - 1, wall + 0.6, cz - 1, cx + 1, wall + 2.2, cz + 1, MAT.metal)); out.props.push({ kind: 'stilts', x: cx, y: wall, z: cz, yaw: 0, w: 2, h: 0.6 });
      out.hides.push({ id: out.hides.length, kind: 'tank', inner: { x0: cx - 0.9, y0: wall + 0.7, z0: cz - 0.9, x1: cx + 0.9, y1: wall + 2.1, z1: cz + 0.9 } });
    } else if (k === 1) {
      for (let j = 0, m = 1 + randInt(r, 3); j < m; j++) out.solids.push(solid(cx - 0.5 + j * 1.2, wall, cz - 0.35, cx + 0.5 + j * 1.2, wall + 0.7, cz + 0.35, MAT.metal));
    } else if (k === 2) {
      // A blue plastic water drum, its lid off: a hiding place like the streets' (the world makes it one).
      out.solids.push(solid(cx - 0.5, wall, cz - 0.5, cx + 0.5, wall + 1.25, cz + 0.5, MAT.hidden));
      out.props.push({ kind: 'drum', x: cx, y: wall, z: cz, yaw: rand(r) * 3 });
    } else if (k === 3) {
      // A corrugated shed, open at its east end; crouched in its back corner, out of sight from above.
      out.solids.push(solid(cx - 1.2, wall, cz - 0.9, cx + 1.2, wall + 2.1, cz - 0.85, MAT.metal), solid(cx - 1.2, wall, cz + 0.85, cx + 1.2, wall + 2.1, cz + 0.9, MAT.metal),
        solid(cx - 1.25, wall, cz - 0.9, cx - 1.2, wall + 2.1, cz + 0.9, MAT.metal), solid(cx - 1.25, wall + 2.1, cz - 0.95, cx + 1.3, wall + 2.2, cz + 0.95, MAT.metal));
      out.hides.push({ id: out.hides.length, kind: 'nook', inner: { x0: cx - 1.15, y0: wall, z0: cz - 0.8, x1: cx - 0.25, y1: wall + 1.9, z1: cz + 0.8 } });
    } else if (k === 4) {
      for (let j = 0, m = 2 + randInt(r, 3); j < m; j++) { const s = 0.6 + rand(r) * 0.4, x = cx + (rand(r) - 0.5) * 1.6, z = cz + (rand(r) - 0.5) * 1.6, y = wall + (j > 1 ? 0.6 : 0); out.solids.push(solid(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, MAT.wood)); }
    } else if (k === 5) {
      // A solar water heater: a tank on a frame over tilted tubes.
      out.solids.push(solid(cx - 1, wall, cz - 0.6, cx + 1, wall + 0.3, cz + 0.6, MAT.metal));
      out.decor.push(solid(cx - 1, wall + 0.3, cz - 0.6, cx + 1, wall + 0.9, cz - 0.5, MAT.glass), solid(cx - 1.05, wall + 1.0, cz + 0.2, cx + 1.05, wall + 1.35, cz + 0.55, MAT.metal));
    } else if (px1 - px0 > 6 && pz1 - pz0 > 6 && !open) out.solids.push(solid(cx - 1.3, wall, cz - 1.3, cx + 1.3, wall + 2.6, cz + 1.3, MAT.concrete));
    placed.push([cx, cz, 1.4]);
  }
}
