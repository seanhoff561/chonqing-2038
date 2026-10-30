// Rooms (M3-38, U-014): each floor of an enterable building divided round its stair core. The stairwell is walled
// off from the floor, its landing open onto it; where the floor is deep enough a corridor runs along the stairwell
// with rooms off it; rooms split between the window bays, so each has a window. Each room is a template (a flat's
// living room, bedroom or kitchen, a back store; a shop, restaurant, workshop or lobby on the ground floor; offices
// on a floor of their own) in one of several variants, furnished from a set of furniture and clutter, in a state
// of decay: a ceiling come down onto the floor (its slab a way up through the hole), debris, water damage,
// furniture knocked over. (docs/reference has no interiors: these are the walk-ups of 1990s Chongqing.)
import { rampSolid, carve, type Solid } from '../geom';
import { MAT } from '../mats';
import { rand, randInt, type Rng } from '../../sim/rng';
import type { Lot, Fabric } from './buildings';
import type { Site } from '../world';

export const FLOOR = 3, WALL = 0.25, SLAB = 0.2;
/** Core space: u runs along the flights, v across. Near landing, two half flights side by side, far landing. */
export const CORE = { near: 1.2, run: 4.0, far: 0.9, lane: 1.3 };
export const CORE_L = CORE.near + CORE.run + CORE.far, CORE_W = CORE.lane * 2;
/** Partitions: thickness, a doorway's width and height, the corridor's width. */
const T = 0.12, DOOR = 0.95, DOOR_H = 2.1, HALL = 1.3;

export const FURNITURE = {
  cabinet: { w: 1.0, d: 0.5, h: 1.8, mat: MAT.wood, zh: '柜子', en: 'Cabinet', loot: 'kitchen' },
  drawer: { w: 0.9, d: 0.5, h: 0.8, mat: MAT.wood, zh: '抽屉', en: 'Drawers', loot: 'bedroom' },
  fridge: { w: 0.7, d: 0.7, h: 1.7, mat: MAT.metal, zh: '冰箱', en: 'Fridge', loot: 'kitchen' },
  locker: { w: 0.5, d: 0.5, h: 1.9, mat: MAT.metal, zh: '储物柜', en: 'Locker', loot: 'bedroom' },
  crate: { w: 1.0, d: 0.8, h: 0.8, mat: MAT.wood, zh: '货箱', en: 'Crate', loot: 'shop' },
  // Big enough to hide in (M3-47).
  wardrobe: { w: 1.2, d: 0.95, h: 2.0, mat: MAT.wood, zh: '衣柜', en: 'Wardrobe', loot: 'bedroom' },
  // Not containers: a bed to claim, a table that becomes a workbench with a toolbox (U-013).
  bed: { w: 2.0, d: 1.0, h: 0.5, mat: MAT.wood, zh: '床', en: 'Bed', use: 'mattress' },
  table: { w: 1.2, d: 0.7, h: 0.78, mat: MAT.wood, zh: '桌子', en: 'Table', use: 'table' },
  // Furniture only.
  sofa: { w: 1.9, d: 0.85, h: 0.8, mat: MAT.cloth },
  desk: { w: 1.3, d: 0.7, h: 0.76, mat: MAT.wood },
  chair: { w: 0.45, d: 0.45, h: 0.9, mat: MAT.wood },
  shelf: { w: 1.0, d: 0.35, h: 1.9, mat: MAT.wood },
  counter: { w: 1.8, d: 0.6, h: 0.95, mat: MAT.tile },
  stove: { w: 0.7, d: 0.6, h: 0.9, mat: MAT.metal },
  sink: { w: 0.8, d: 0.55, h: 0.9, mat: MAT.metal },
  rack: { w: 1.6, d: 0.5, h: 2.0, mat: MAT.metal },
} as const;
export type Piece = keyof typeof FURNITURE;
type Kind = 'living' | 'bedroom' | 'kitchen' | 'store' | 'shop' | 'restaurant' | 'workshop' | 'lobby' | 'office';
/** Each template's variants: the pieces along its walls; 'T' a table with stools out in the room. */
const ROOMS: Record<Kind, (Piece | 'T')[][]> = {
  living: [['sofa', 'table', 'cabinet', 'shelf'], ['sofa', 'cabinet', 'chair', 'chair'], ['table', 'chair', 'chair', 'shelf', 'drawer'], ['sofa', 'shelf', 'locker', 'T']],
  bedroom: [['bed', 'wardrobe', 'drawer'], ['bed', 'bed', 'locker'], ['bed', 'drawer', 'desk', 'chair'], ['wardrobe', 'bed', 'shelf']],
  kitchen: [['counter', 'stove', 'fridge', 'cabinet'], ['sink', 'stove', 'cabinet', 'table'], ['fridge', 'counter', 'shelf'], ['stove', 'sink', 'fridge', 'drawer']],
  store: [['crate', 'crate', 'shelf', 'locker'], ['rack', 'crate', 'wardrobe'], ['locker', 'locker', 'crate']],
  shop: [['counter', 'rack', 'rack', 'crate', 'crate'], ['counter', 'shelf', 'shelf', 'fridge', 'crate'], ['rack', 'rack', 'rack', 'counter', 'locker']],
  restaurant: [['counter', 'stove', 'fridge', 'T', 'T', 'T'], ['counter', 'sink', 'stove', 'cabinet', 'T', 'T'], ['stove', 'stove', 'fridge', 'T', 'T', 'T', 'T']],
  workshop: [['table', 'rack', 'locker', 'crate', 'crate'], ['table', 'rack', 'rack', 'cabinet'], ['table', 'table', 'locker', 'crate', 'shelf']],
  lobby: [['cabinet', 'locker', 'crate'], ['shelf', 'crate', 'drawer'], ['locker', 'locker', 'crate']],
  office: [['desk', 'chair', 'desk', 'chair', 'locker', 'shelf'], ['desk', 'desk', 'desk', 'locker', 'locker', 'cabinet'], ['table', 'chair', 'chair', 'chair', 'shelf', 'locker']],
};
const FLOORING: Record<Kind, number[]> = {
  living: [MAT.tile, MAT.wood], bedroom: [MAT.wood, MAT.tile], kitchen: [MAT.tile], store: [MAT.concrete], shop: [MAT.tile, MAT.stone],
  restaurant: [MAT.tile], workshop: [MAT.concrete], lobby: [MAT.tile, MAT.stone], office: [MAT.tile, MAT.wood],
};

type Rect = [number, number, number, number];
/** One floor: the lot, its core-space size and frame, the floor's height and number, what the ground floor is. */
export interface Floor {
  l: Lot; U: number; V: number; y: number; k: number; top: boolean; alongZ: boolean; doorV: number;
  B: (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, mat: number) => Solid;
  at: (u: number, v: number) => [number, number];
  /** where the ceiling came down on the floor below (to keep clear) */
  holes: Rect[];
  /** how far gone the building is, 0 to 1 */
  decay: number;
  /** where the building's own solids start in out.solids (a hole carves only those) */
  from: number;
}

/** Window centres along a facade: k bays of len from a, as the shell cuts them (interiors.ts). */
const bays = (a: number, len: number) => { const k = Math.max(1, Math.floor(len / 4.5)); return Array.from({ length: k + 1 }, (_, i) => a + (len / k) * i); };

/** Divide and furnish one floor; its holes in the ceiling for the floor above. */
export function floorRooms(f0: Floor, r: Rng, out: Fabric, site: Site): Rect[] {
  // Everything made here is inside: drawn only near (M3-38).
  const f: Floor = { ...f0, B: (...a) => { const s = f0.B(...a); s.inner = true; return s; } };
  const { U, V, y, B } = f, keep: Rect[] = [...f.holes], holes: Rect[] = [];
  // Partitions, a metre kept clear each side of their doorways.
  const wallU = (u: number, v0: number, v1: number, doors: number[]) => { wall(f, 'u', u, v0, v1, doors, out); for (const d of doors) keep.push([u - 1, d - 0.7, u + T + 1, d + 0.7]); };
  const wallV = (v: number, u0: number, u1: number, doors: number[]) => { wall(f, 'v', v, u0, u1, doors, out); for (const d of doors) keep.push([d - 0.7, v - 1, d + 0.7, v + T + 1]); };
  // The stairwell: walled along its side and its far end; its landing (u < CORE.near) opens onto the floor.
  wallV(CORE_W, CORE.near, CORE_L + T, []);
  wallU(CORE_L, 0, CORE_W, []);
  // The landing kept clear, and on the ground floor the way in from the door to it.
  keep.push([0, CORE_W, CORE.near + 0.5, CORE_W + 1.3]);
  const rooms: { rect: Rect; kind: Kind }[] = [];
  // Room ends along u: the window bays' edges (the shell's columns sit between them).
  const ends = bays(f.alongZ ? 0 : -WALL, f.alongZ ? U : U + 2 * WALL).slice(1, -1);
  // (One or two bays a room.)
  const split = (u0: number, u1: number) => {
    const cut = [u0];
    for (const e of ends) if (e - cut[cut.length - 1] >= 2.6 && u1 - e >= 2.6 && (rand(r) < 0.75 || e - cut[cut.length - 1] > 6)) cut.push(e);
    return [...cut, u1];
  };
  if (f.k === 0) {
    // The ground floor: one room on the street (a shop, restaurant or workshop) or the stair's lobby, a store
    // behind the stairwell.
    const q = rand(r), kind: Kind = f.l.street.some(Boolean) ? (q < 0.35 ? 'shop' : q < 0.6 ? 'restaurant' : q < 0.8 ? 'workshop' : 'lobby') : q < 0.5 ? 'workshop' : 'lobby';
    rooms.push({ rect: [0, CORE_W + T, U, V], kind }, { rect: [CORE_L + T, 0, U, CORE_W + T], kind: U - CORE_L > 3 ? 'store' : kind });
    // (The door's way to the stair: a lane across the room.)
    keep.push([CORE.near, f.doorV - 0.9, U, f.doorV + 0.9], [0, CORE_W, U, Math.min(V, CORE_W + 1.5)]);
  } else if (V - CORE_W >= HALL + 2 * T + 2.6) {
    // A corridor along the stairwell, rooms off both its sides.
    const hv = CORE_W + T + HALL, row = split(0, U), side = split(CORE_L + T, U).filter(u => u >= CORE_L + T);
    wallV(hv, 0, U, row.slice(0, -1).map((u, i) => (u + row[i + 1]) / 2));
    wallV(CORE_W, CORE_L + T, U, side.slice(0, -1).map((u, i) => (u + side[i + 1]) / 2));
    for (let i = 1; i < row.length - 1; i++) wallU(row[i], hv + T, V, []);
    for (let i = 1; i < side.length - 1; i++) wallU(side[i], 0, CORE_W, []);
    keep.push([0, CORE_W + T, U, hv]);
    // Deep floors: a room at the front and one behind it, through a doorway.
    const deep = V - hv - T > 7.5 ? (hv + T + V) / 2 : 0;
    row.slice(0, -1).forEach((u, i) => {
      if (!deep) { rooms.push({ rect: [u, hv + T, row[i + 1], V], kind: 'living' }); return; }
      wallV(deep, u, row[i + 1], [(u + row[i + 1]) / 2]);
      rooms.push({ rect: [u, hv + T, row[i + 1], deep], kind: 'living' }, { rect: [u, deep + T, row[i + 1], V], kind: 'living' });
    });
    side.slice(0, -1).forEach((u, i) => rooms.push({ rect: [u, 0, side[i + 1], CORE_W], kind: 'kitchen' }));
  } else {
    // Too shallow for a corridor: rooms one through the next.
    const row = split(0, U), mid = (CORE_W + V) / 2;
    for (let i = 1; i < row.length - 1; i++) wallU(row[i], row[i] < CORE_L + T ? CORE_W + T : 0, V, [mid]);
    row.slice(0, -1).forEach((u, i) => rooms.push({ rect: [u, row[i + 1] <= CORE_L + T ? CORE_W + T : 0, row[i + 1], V], kind: 'living' }));
  }
  // What the rooms are: offices on a floor of their own in an office block; else a flat's rooms, the biggest the
  // living room, the narrowest kitchens and stores, the rest bedrooms.
  if (f.k > 0) {
    const office = f.l.mat === MAT.facadeBand && rand(r) < 0.7, byArea = [...rooms].sort((a, b) => area(b.rect) - area(a.rect));
    byArea.forEach((m, i) => { m.kind = office ? 'office' : i === 0 ? 'living' : Math.min(m.rect[2] - m.rect[0], m.rect[3] - m.rect[1]) < 2.8 ? (rand(r) < 0.6 ? 'kitchen' : 'store') : rand(r) < 0.75 ? 'bedroom' : 'kitchen'; });
  }
  let n = 0;
  for (const m of rooms) {
    const [u0, v0, u1, v1] = m.rect;
    if (u1 - u0 < 1.2 || v1 - v0 < 1.2) continue;
    // The floor laid in it, a hair over the slab.
    out.decor.push(B(u0, y + 0.03, v0, u1, y + 0.045, v1, FLOORING[m.kind][randInt(r, FLOORING[m.kind].length)]));
    const placed: Rect[] = [];
    const free = (b: Rect) => !placed.some(p => over(p, b)) && !keep.some(p => over(p, b));
    // Its variant's pieces, round again in a big room (one a 7 m2 or so).
    const list = ROOMS[m.kind][randInt(r, ROOMS[m.kind].length)], want = Math.max(list.length, Math.min(8, Math.round(area(m.rect) / 7)));
    let looted = false;
    for (let i = 0, got = 0; i < want * 2 && got < want; i++) {
      const p = list[i % list.length];
      if (p === 'T') { if (table(f, m.rect, free, placed, r, out)) got++; continue; }
      const at = against(f, m.rect, FURNITURE[p], free, r);
      if (!at) continue;
      placed.push(at.b); got++;
      // Loot is scarce (M3-36): one room in five has a container worth opening, the first that could be.
      const loot = 'loot' in FURNITURE[p] && !looted && rand(r) < 0.2;
      if (loot) looted = true;
      piece(f, p, at.b, at.face, `b${f.l.id}.${f.k}.${n++}`, rand(r) < 0.25 * f.decay && FURNITURE[p].h > 1.2, loot, out, site);
    }
    clutter(f, m.rect, placed, keep, r, out);
    // Where to look in from: a corner, across to the far one.
    const [ex, ez] = f.at(u0 + 0.3, v0 + 0.3), [lx, lz] = f.at(u1, v1);
    out.features.push({ kind: `inside:${m.kind}`, x: ex, y, z: ez, group: out.features.length, nx: lx - ex, nz: lz - ez });
    // Decay: water in from the walls, debris, the ceiling down.
    if (rand(r) < 0.35 * f.decay + 0.1) stain(f, m.rect, r, out);
    if (rand(r) < 0.5 * f.decay) for (let i = 0, k = 2 + randInt(r, 4); i < k; i++) {
      const s = 0.2 + rand(r) * 0.5, u = u0 + 0.3 + rand(r) * Math.max(0, u1 - u0 - 0.6 - s), v = v0 + 0.3 + rand(r) * Math.max(0, v1 - v0 - 0.6 - s);
      out.decor.push(B(u, y, v, u + s, y + 0.1 + rand(r) * s * 0.6, v + s * (0.6 + rand(r) * 0.8), MAT.rubble));
    }
    if (rand(r) < 0.07 + 0.08 * f.decay && u1 - u0 >= 3.2 && v1 - v0 >= 2.6) {
      const hole = collapse(f, m.rect, free, r, out);
      if (hole) holes.push(hole);
    }
  }
  return holes;
}

const area = (b: Rect) => (b[2] - b[0]) * (b[3] - b[1]);
const over = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/** A partition across the floor at u (axis 'u', running along v from a to b) or at v (along u), doorways at the
 *  given points along it. */
function wall(f: Floor, axis: 'u' | 'v', at: number, a: number, b: number, doors: number[], out: Fabric) {
  const { y, B } = f, top = y + FLOOR - SLAB, mat = f.l.mat === MAT.facadeBand ? MAT.plaster : f.l.mat;
  const box = (c0: number, y0: number, c1: number, y1: number) => {
    if (c1 - c0 < 0.01) return;
    out.solids.push(axis === 'u' ? B(at, y0, c0, at + T, y1, c1, mat) : B(c0, y0, at, c1, y1, at + T, mat));
  };
  let prev = a;
  for (const d of [...doors].sort((p, q) => p - q)) {
    const d0 = Math.max(a, d - DOOR / 2), d1 = Math.min(b, d + DOOR / 2);
    box(prev, y, d0, top);
    box(d0, y + DOOR_H, d1, top);
    prev = d1;
  }
  box(prev, y, b, top);
}

/** A piece against one of the room's walls, clear of what's placed and kept clear (tall pieces not across the
 *  outside walls' windows): its box, and which way its front faces (a unit step in core space). */
function against(f: Floor, [u0, v0, u1, v1]: Rect, p: { w: number; d: number; h: number }, free: (b: Rect) => boolean, r: Rng): { b: Rect; face: [number, number] } | null {
  for (let tries = 0; tries < 8; tries++) {
    const side = randInt(r, 4), along = side < 2, len = along ? u1 - u0 : v1 - v0;
    if (len < p.w + 0.2) continue;
    const c = (along ? u0 : v0) + 0.1 + rand(r) * (len - p.w - 0.2);
    const b: Rect = along
      ? [c, side === 0 ? v0 : v1 - p.d, c + p.w, side === 0 ? v0 + p.d : v1]
      : [side === 2 ? u0 : u1 - p.d, c, side === 2 ? u0 + p.d : u1, c + p.w];
    if (b[2] > u1 + 1e-6 || b[3] > v1 + 1e-6 || !free(b)) continue;
    if (p.h > 0.95 && window(f, b)) continue;
    return { b, face: [[0, 1], [0, -1], [1, 0], [-1, 0]][side] as [number, number] };
  }
  return null;
}

/** Whether a box stands against a window of the shell (on an outside wall, within a window's width of a bay's
 *  centre). */
function window(f: Floor, [u0, v0, u1, v1]: Rect): boolean {
  const uc = bays(f.alongZ ? 0 : -WALL, f.alongZ ? f.U : f.U + 2 * WALL), vc = bays(f.alongZ ? -WALL : 0, f.alongZ ? f.V + 2 * WALL : f.V);
  const near = (cs: number[], a: number, b: number) => cs.slice(0, -1).some((c, i) => { const m = (c + cs[i + 1]) / 2; return a < m + 0.8 && b > m - 0.8; });
  return ((v0 < 0.05 || v1 > f.V - 0.05) && near(uc, u0, u1)) || ((u0 < 0.05 || u1 > f.U - 0.05) && near(vc, v0, v1));
}

/** Build a piece in its box: upright with its front to the room, or knocked over onto its back. */
function piece(f: Floor, p: Piece, b: Rect, face: [number, number], id: string, fallen: boolean, loot: boolean, out: Fabric, site: Site) {
  const P = FURNITURE[p], { y, B, at } = f;
  if (fallen) {
    // On its back, out from the wall the length of its height, a cabinet's worth of mess.
    const [fu, fv] = face, h = Math.min(P.h, 2.2);
    const lb: Rect = fu ? [fu > 0 ? b[0] : b[2] - h, b[1], fu > 0 ? b[0] + h : b[2], b[3]] : [b[0], fv > 0 ? b[1] : b[3] - h, b[2], fv > 0 ? b[1] + h : b[3]];
    out.solids.push(B(lb[0], y, lb[1], lb[2], y + P.d, lb[3], P.mat));
    return;
  }
  // (Chairs are in the way to look at, not to collide with.)
  (p === 'chair' ? out.decor : out.solids).push(B(b[0], y, b[1], b[2], y + P.h, b[3], P.mat));
  if (p === 'wardrobe') {
    const [cx, cz] = at((b[0] + b[2]) / 2, (b[1] + b[3]) / 2), hw = (P.w - 0.1) / 2, hd = (P.d - 0.1) / 2;
    const [nx, nz] = f.alongZ ? [face[1], face[0]] : face;
    // Its space, turned so its doors (the shell's +z) face the room.
    out.hides.push({ id: out.hides.length, kind: 'wardrobe', yaw: Math.atan2(nx, nz), inner: { x0: cx - hw, y0: y + 0.05, z0: cz - hd, x1: cx + hw, y1: y + 1.9, z1: cz + hd } });
  }
  // Only a container with loot, and a floor's first bed and table, are there to use.
  if (!('zh' in P) || ('loot' in P && !loot) || ('use' in P && (P.use === 'mattress' ? site.bed : site.table))) return;
  // The front face, where he reaches in.
  const [fx, fz] = at((b[0] + b[2]) / 2 + face[0] * ((b[2] - b[0]) / 2 + 0.05), (b[1] + b[3]) / 2 + face[1] * ((b[3] - b[1]) / 2 + 0.05));
  if ('use' in P) { if (P.use === 'mattress') site.bed = id; else site.table = id; } else site.containers.push(id);
  out.inter.push('use' in P
    ? { id, kind: P.use, x: fx, y: y + P.h, z: fz, r: 0.8, zh: P.zh, en: P.en }
    : { id, kind: 'container', x: fx, y: y + Math.min(1.0, P.h / 2), z: fz, r: 0.6, zh: P.zh, en: P.en, data: { type: p, loot: P.loot } });
}

/** A table out in the room with stools round it. */
function table(f: Floor, [u0, v0, u1, v1]: Rect, free: (b: Rect) => boolean, placed: Rect[], r: Rng, out: Fabric): boolean {
  for (let tries = 0; tries < 6; tries++) {
    const u = u0 + 1 + rand(r) * Math.max(0, u1 - u0 - 2.9), v = v0 + 1 + rand(r) * Math.max(0, v1 - v0 - 2.6), b: Rect = [u - 0.5, v - 0.5, u + 1.4, v + 1.1];
    if (b[0] < u0 || b[1] < v0 || b[2] > u1 || b[3] > v1 || !free(b)) continue;
    placed.push(b);
    const { y, B } = f;
    out.solids.push(B(u, y, v, u + 0.9, y + 0.75, v + 0.6, MAT.wood));
    for (const [su, sv] of [[-0.45, 0.15], [1.0, 0.15], [0.25, -0.45], [0.25, 0.75]]) {
      // Some knocked over.
      if (rand(r) < 0.3 * f.decay) out.decor.push(B(u + su, y, v + sv, u + su + 0.35, y + 0.3, v + sv + 0.6, MAT.wood));
      else out.decor.push(B(u + su, y, v + sv, u + su + 0.35, y + 0.45, v + sv + 0.35, MAT.wood));
    }
    return true;
  }
  return false;
}

/** Odds and ends on the floor: boxes, papers, bottles, a bag. */
function clutter(f: Floor, [u0, v0, u1, v1]: Rect, placed: Rect[], keep: Rect[], r: Rng, out: Fabric) {
  const { y, B } = f;
  for (let i = 0, k = 2 + randInt(r, 3) + Math.round(((u1 - u0) * (v1 - v0)) / 8); i < k; i++) {
    const q = rand(r), [w, d, h, mat] = q < 0.35 ? [0.3 + rand(r) * 0.3, 0.3 + rand(r) * 0.3, 0.25 + rand(r) * 0.3, MAT.crate] : q < 0.65 ? [0.4 + rand(r) * 0.5, 0.3 + rand(r) * 0.4, 0.012, MAT.plaster] : q < 0.85 ? [0.08, 0.08, 0.28, MAT.glass] : [0.5, 0.35, 0.3, MAT.cloth];
    const u = u0 + 0.15 + rand(r) * Math.max(0, u1 - u0 - 0.3 - w), v = v0 + 0.15 + rand(r) * Math.max(0, v1 - v0 - 0.3 - d), b: Rect = [u, v, u + w, v + d];
    if (placed.some(p => over(p, b)) || (h > 0.2 && keep.some(p => over(p, b)))) continue;
    out.decor.push(B(u, y + 0.045, v, u + w, y + 0.045 + h, v + d, mat));
  }
}

/** Water in from outside: a dark stain down a wall from the ceiling, a puddle under it. */
function stain(f: Floor, [u0, v0, u1, v1]: Rect, r: Rng, out: Fabric) {
  const { y, B } = f, top = y + FLOOR - SLAB, w = 0.8 + rand(r) * 1.4, drop = 0.6 + rand(r) * 1.6;
  if (rand(r) < 0.5) {
    const c = u0 + rand(r) * Math.max(0, u1 - u0 - w), v = rand(r) < 0.5 ? v0 + 0.005 : v1 - 0.015;
    const pv = v < (v0 + v1) / 2 ? v0 + 0.02 : v1 - 0.9;
    out.decor.push(B(c, top - drop, v, c + w, top, v + 0.01, MAT.moss), B(c, y + 0.046, pv, c + w, y + 0.05, pv + 0.88, MAT.water));
  } else {
    const c = v0 + rand(r) * Math.max(0, v1 - v0 - w), u = rand(r) < 0.5 ? u0 + 0.005 : u1 - 0.015;
    out.decor.push(B(u, top - drop, c, u + 0.01, top, c + w, MAT.moss));
  }
  // And a patch spread over the ceiling.
  const cu = u0 + rand(r) * Math.max(0, u1 - u0 - 1.5), cv = v0 + rand(r) * Math.max(0, v1 - v0 - 1.5);
  out.decor.push(B(cu, top - 0.01, cv, cu + 1 + rand(r) * 0.5, top - 0.005, cv + 1 + rand(r) * 0.5, MAT.moss));
}

/** The ceiling come down: a hole through the slab over the room, the broken piece leaning from the floor up to its
 *  edge (a way up to the floor above, or down from it), rubble round its foot. */
function collapse(f: Floor, [u0, v0, u1, v1]: Rect, free: (b: Rect) => boolean, r: Rng, out: Fabric): Rect | null {
  // The slab rises 1.6 m over 2 m from its foot at u (walkable); the hole opens over its upper part, where he has
  // the headroom, and from its top the hole's far edge is a mantle up.
  const { y, B } = f, top = y + FLOOR, s = 1.5 + rand(r) * 0.5, run = 2.0, open = 1.2;
  const u = u0 + 0.4 + rand(r) * Math.max(0, u1 - u0 - 0.8 - open - s), v = v0 + 0.4 + rand(r) * Math.max(0, v1 - v0 - 0.8 - s);
  const foot: Rect = [u, v, u + open + s, v + s];
  if (foot[2] > u1 - 0.3 || foot[3] > v1 - 0.3 || !free(foot)) return null;
  const hole: Rect = [u + open, v, u + open + s, v + s];
  out.solids.splice(f.from, out.solids.length - f.from, ...carve(out.solids.slice(f.from), B(hole[0], top - SLAB - 0.01, hole[1], hole[2], top + 0.01, hole[3], 0)));
  const [ax, az] = f.at(u, v + 0.1), [bx, bz] = f.at(u + run, v + s - 0.1);
  const slab = rampSolid(Math.min(ax, bx), y, Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), y, y + 1.6, f.alongZ ? 3 : 1, MAT.concrete);
  slab.inner = true;
  out.solids.push(slab);
  for (let i = 0; i < 4; i++) {
    const a = u + rand(r) * (open + s - 0.4), b = v + rand(r) * (s - 0.3), w = 0.2 + rand(r) * 0.4;
    out.decor.push(B(a, y, b, a + w, y + 0.1 + rand(r) * 0.3, b + w, MAT.rubble));
  }
  // A strip of the slab still hanging off the hole's far edge.
  out.decor.push(B(hole[2] - 0.15, top - SLAB - 0.5, hole[1], hole[2], top - SLAB, hole[3], MAT.concrete));
  return hole;
}
