// Furnishing a room (M3-38, U-014): each room a template (a flat's living room, bedroom or kitchen, a store; a
// shop, restaurant, workshop or lobby; an office) in one of several variants, furnished from a set of furniture and
// clutter, in a state of decay: debris, water damage, furniture knocked over. The rooms themselves are carved into
// a building as a puzzle (puzzle.ts, U-040). (docs/reference has no interiors: these are 1990s Chongqing walk-ups.)
import { carve, type Solid } from '../geom';
import { MAT } from '../mats';
import { rand, randInt, type Rng } from '../../sim/rng';
import type { Lot, Fabric } from './buildings';
import type { Site } from '../world';

export const FLOOR = 3, WALL = 0.25, SLAB = 0.2;
/** Core space: u runs along the flights, v across. Near landing, two half flights side by side, far landing. */
export const CORE = { near: 1.2, run: 4.0, far: 0.9, lane: 1.3 };
export const CORE_L = CORE.near + CORE.run + CORE.far, CORE_W = CORE.lane * 2;
/** A doorway's width and height. */
export const DOOR = 0.95, DOOR_H = 2.1;

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
export type Kind = 'living' | 'bedroom' | 'kitchen' | 'store' | 'shop' | 'restaurant' | 'workshop' | 'lobby' | 'office' | 'corridor';
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
  // A block's corridor (M3-77): what the tenants left outside their doors.
  corridor: [['cabinet', 'crate'], ['locker'], ['shelf', 'crate'], ['crate']],
  office: [['desk', 'chair', 'desk', 'chair', 'locker', 'shelf'], ['desk', 'desk', 'desk', 'locker', 'locker', 'cabinet'], ['table', 'chair', 'chair', 'chair', 'shelf', 'locker']],
};
const FLOORING: Record<Kind, number[]> = {
  living: [MAT.tile, MAT.wood], bedroom: [MAT.wood, MAT.tile], kitchen: [MAT.tile], store: [MAT.concrete], shop: [MAT.tile, MAT.stone],
  restaurant: [MAT.tile], workshop: [MAT.concrete], lobby: [MAT.tile, MAT.stone], office: [MAT.tile, MAT.wood], corridor: [MAT.tile, MAT.concrete],
};

export type Rect = [number, number, number, number];
/** A room's frame: the lot, its floor's height and number, the building's frame (u along its long side, v across)
 *  and how far gone it is. */
export interface Floor {
  l: Lot; y: number; k: number; alongZ: boolean;
  B: (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, mat: number) => Solid;
  at: (u: number, v: number) => [number, number];
  /** how far gone the building is, 0 to 1 */
  decay: number;
  /** a fresh id in the building, with a prefix */
  nid: (p: string) => string;
}

export const area = (b: Rect) => (b[2] - b[0]) * (b[3] - b[1]);
export const over = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/** Furnish one room (everything in it drawn only near, M3-38): its floor laid, its variant's pieces against its
 *  walls (round again in a big room), clutter, decay; `keep` clear (doorways, windows, the way through); `fallen`
 *  heaps it with rubble. Containers are scarce (M3-36): one room in five has one worth opening. */
export function furnish(f0: Floor, rect: Rect, kind: Kind, keep: Rect[], fallen: boolean, r: Rng, out: Fabric, site: Site) {
  const f: Floor = { ...f0, B: (...a) => { const s = f0.B(...a); s.inner = true; return s; } };
  const { y, B } = f, [u0, v0, u1, v1] = rect;
  if (u1 - u0 < 1.1 || v1 - v0 < 1.1) return;
  out.decor.push(B(u0, y + 0.03, v0, u1, y + 0.045, v1, FLOORING[kind][randInt(r, FLOORING[kind].length)]));
  // Skirting round a home's walls (cut where it's kept clear: doorways, under windows) (M3-74).
  if (kind === 'living' || kind === 'bedroom' || kind === 'office') {
    let skirt = [B(u0, y, v0, u1, y + 0.09, v0 + 0.035, MAT.wood), B(u0, y, v1 - 0.035, u1, y + 0.09, v1, MAT.wood), B(u0, y, v0, u0 + 0.035, y + 0.09, v1, MAT.wood), B(u1 - 0.035, y, v0, u1, y + 0.09, v1, MAT.wood)];
    for (const k of keep) skirt = carve(skirt, B(k[0], y - 0.01, k[1], k[2], y + 0.2, k[3], 0));
    for (const s of skirt) { s.inner = true; out.decor.push(s); }
  }
  const placed: Rect[] = [];
  const free = (b: Rect) => !placed.some(p => over(p, b)) && !keep.some(p => over(p, b));
  const list = ROOMS[kind][randInt(r, ROOMS[kind].length)], want = Math.max(list.length, Math.min(8, Math.round(area(rect) / 7)));
  let looted = false;
  for (let i = 0, got = 0; i < want * 2 && got < want; i++) {
    const p = list[i % list.length];
    if (p === 'T') { if (table(f, rect, free, placed, r, out)) got++; continue; }
    const at = against(f, rect, FURNITURE[p], free, r);
    if (!at) continue;
    placed.push(at.b); got++;
    const loot = 'loot' in FURNITURE[p] && !looted && rand(r) < 0.2;
    if (loot) looted = true;
    piece(f, p, at.b, at.face, f.nid('f'), rand(r) < 0.25 * f.decay && FURNITURE[p].h > 1.2, loot, out, site);
  }
  clutter(f, rect, placed, keep, r, out);
  // Dust and grime lying in patches on the floor.
  for (let i = 0, k = randInt(r, 3) + (f.decay > 0.6 ? 1 : 0); i < k; i++) {
    const s = 0.6 + rand(r) * 1.2, u = u0 + rand(r) * Math.max(0, u1 - u0 - s), v = v0 + rand(r) * Math.max(0, v1 - v0 - s);
    out.decor.push(B(u, y + 0.046, v, u + s, y + 0.048, v + s * (0.5 + rand(r)), MAT.asphalt));
  }
  // Where to look in from: a corner, across to the far one.
  const [ex, ez] = f.at(u0 + 0.3, v0 + 0.3), [lx, lz] = f.at(u1, v1);
  out.features.push({ kind: `inside:${kind}`, x: ex, y, z: ez, group: out.features.length, nx: lx - ex, nz: lz - ez });
  if (rand(r) < 0.35 * f.decay + 0.1) stain(f, rect, r, out);
  // Rubble: mounds to climb over where it has come down, debris where it's only old.
  if (fallen) for (let i = 0; i < 2; i++) {
    const s = 0.8 + rand(r) * 0.8, u = u0 + 0.2 + rand(r) * Math.max(0, u1 - u0 - 0.4 - s), v = v0 + 0.2 + rand(r) * Math.max(0, v1 - v0 - 0.4 - s);
    if (!keep.some(p => over(p, [u, v, u + s, v + s]))) out.solids.push(B(u, y, v, u + s, y + 0.4 + rand(r) * 0.6, v + s, MAT.rubble));
  }
  if (fallen || rand(r) < 0.5 * f.decay) for (let i = 0, k = (fallen ? 6 : 2) + randInt(r, 4); i < k; i++) {
    const s = 0.2 + rand(r) * 0.5, u = u0 + 0.3 + rand(r) * Math.max(0, u1 - u0 - 0.6 - s), v = v0 + 0.3 + rand(r) * Math.max(0, v1 - v0 - 0.6 - s);
    out.decor.push(B(u, y, v, u + s, y + 0.1 + rand(r) * s * 0.6, v + s * (0.6 + rand(r) * 0.8), MAT.rubble));
  }
}

/** A piece against one of the room's walls, clear of what's placed and kept clear: its box, and which way its
 *  front faces (a unit step in the building's frame). */
function against(_f: Floor, [u0, v0, u1, v1]: Rect, p: { w: number; d: number; h: number }, free: (b: Rect) => boolean, r: Rng): { b: Rect; face: [number, number] } | null {
  for (let tries = 0; tries < 8; tries++) {
    const side = randInt(r, 4), along = side < 2, len = along ? u1 - u0 : v1 - v0;
    if (len < p.w + 0.2) continue;
    const c = (along ? u0 : v0) + 0.1 + rand(r) * (len - p.w - 0.2);
    const b: Rect = along
      ? [c, side === 0 ? v0 : v1 - p.d, c + p.w, side === 0 ? v0 + p.d : v1]
      : [side === 2 ? u0 : u1 - p.d, c, side === 2 ? u0 + p.d : u1, c + p.w];
    if (b[2] > u1 + 1e-6 || b[3] > v1 + 1e-6 || !free(b)) continue;
    return { b, face: [[0, 1], [0, -1], [1, 0], [-1, 0]][side] as [number, number] };
  }
  return null;
}

/** Build a piece in its box: upright with its front to the room, or knocked over onto its back. */
function piece(f: Floor, p: Piece, b: Rect, face: [number, number], id: string, fallen: boolean, loot: boolean, out: Fabric, site: Site) {
  const P = FURNITURE[p], { y, B, at } = f;
  // Drawn as a model of its own (render/roomprops.ts, M3-74), its front facing the room; its box only collides.
  model(f, p, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2, face, P.w, P.h, P.d, out, fallen);
  if (fallen) {
    // On its back, out from the wall the length of its height, a cabinet's worth of mess.
    const [fu, fv] = face, h = Math.min(P.h, 2.2);
    const lb: Rect = fu ? [fu > 0 ? b[0] : b[2] - h, b[1], fu > 0 ? b[0] + h : b[2], b[3]] : [b[0], fv > 0 ? b[1] : b[3] - h, b[2], fv > 0 ? b[1] + h : b[3]];
    out.solids.push(B(lb[0], y, lb[1], lb[2], y + P.d, lb[3], MAT.hidden));
    return;
  }
  // (Chairs are in the way to look at, not to collide with.)
  if (p !== 'chair') out.solids.push(B(b[0], y, b[1], b[2], y + P.h, b[3], MAT.hidden));
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

/** A model prop (render/roomprops.ts) at frame point (u, v) on the floor, its front facing `face` (a step in the
 *  frame): w across, h high, d deep; `fallen` on its back. */
function model(f: Floor, kind: string, u: number, v: number, face: [number, number], w: number, h: number, d: number, out: Fabric, fallen = false, y = f.y) {
  const [x, z] = f.at(u, v), [fx, fz] = f.at(u + face[0], v + face[1]);
  out.props.push({ kind: `f:${kind}`, x, y, z, yaw: Math.atan2(fx - x, fz - z), w, h, d, ...(fallen ? { text: 'fallen' } : {}) });
}

/** A table out in the room with stools round it. */
function table(f: Floor, [u0, v0, u1, v1]: Rect, free: (b: Rect) => boolean, placed: Rect[], r: Rng, out: Fabric): boolean {
  for (let tries = 0; tries < 6; tries++) {
    const u = u0 + 1 + rand(r) * Math.max(0, u1 - u0 - 2.9), v = v0 + 1 + rand(r) * Math.max(0, v1 - v0 - 2.6), b: Rect = [u - 0.5, v - 0.5, u + 1.4, v + 1.1];
    if (b[0] < u0 || b[1] < v0 || b[2] > u1 || b[3] > v1 || !free(b)) continue;
    placed.push(b);
    const { y, B } = f;
    out.solids.push(B(u, y, v, u + 0.9, y + 0.75, v + 0.6, MAT.hidden));
    model(f, 'table', u + 0.45, v + 0.3, [0, 1], 0.9, 0.75, 0.6, out);
    for (const [su, sv] of [[-0.45, 0.15], [1.0, 0.15], [0.25, -0.45], [0.25, 0.75]]) {
      // Some knocked over.
      model(f, 'stool', u + su + 0.175, v + sv + 0.175, [rand(r) - 0.5, rand(r) - 0.5], 0.35, 0.45, 0.35, out, rand(r) < 0.3 * f.decay);
    }
    return true;
  }
  return false;
}

/** Odds and ends on the floor (models, M3-74): boxes, books, papers, bottles, clothes, a bag; and a light on the
 *  ceiling. */
function clutter(f: Floor, [u0, v0, u1, v1]: Rect, placed: Rect[], keep: Rect[], r: Rng, out: Fabric) {
  const KINDS: [string, number, number, number][] = [['box', 0.45, 0.35, 0.4], ['books', 0.25, 0.2, 0.18], ['papers', 0.4, 0.01, 0.4], ['bottles', 0.4, 0.3, 0.3], ['clothes', 0.5, 0.15, 0.4], ['bag', 0.4, 0.4, 0.3], ['papers', 0.4, 0.01, 0.4]];
  for (let i = 0, k = 1 + randInt(r, 3) + Math.round(((u1 - u0) * (v1 - v0)) / 12); i < k; i++) {
    const [kind, w, h, d] = KINDS[randInt(r, KINDS.length)];
    const u = u0 + 0.15 + rand(r) * Math.max(0, u1 - u0 - 0.3 - w), v = v0 + 0.15 + rand(r) * Math.max(0, v1 - v0 - 0.3 - d), b: Rect = [u, v, u + w, v + d];
    if (placed.some(p => over(p, b)) || (h > 0.2 && keep.some(p => over(p, b)))) continue;
    const s = kind === 'box' ? 0.7 + rand(r) * 0.6 : 1;
    model(f, kind, u + w / 2, v + d / 2, [rand(r) - 0.5, rand(r) - 0.5], w * s, h * s, d * s, out, false, f.y + 0.045);
  }
  model(f, 'light', (u0 + u1) / 2, (v0 + v1) / 2, [1, 0], 1.2, 0.1, 0.16, out, false, f.y + FLOOR - SLAB);
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
