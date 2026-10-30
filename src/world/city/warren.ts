// Buildings as warrens (M3-77, U-043): on a band of a block's floors the whole floor is built, the way a walk-up's is:
// a corridor down its length (off the stairwell's landing, where it has one), rooms either side of it, on the
// facades with windows and, where the block is deep, windowless rooms behind them off the corridor. Doors in every
// room, many locked, jammed or chained; some rooms open only off their neighbour, by a door, a vent or a crack to
// squeeze through; the corridor choked with rubble now and then. Between the band's floors: holes through the slabs,
// a thin shaft to chimney up or down, a collapsed slab leaning in a narrow slot between floors. The rest of the
// block stays solid but for the puzzle's clusters (puzzle.ts).
import { rampSolid, type Solid } from '../geom';
import { MAT } from '../mats';
import { rand, randInt, type Rng } from '../../sim/rng';
import { FLOOR, SLAB, WALL, DOOR, DOOR_H, CORE, CORE_L, CORE_W, type Kind, type Rect } from './rooms';
import { door, roll, type Glazing, type Lock } from './access';
import { GAP, SIZE, type Room } from './puzzle';
import type { Fabric } from './buildings';

/** The corridor's width; a shaft's width (two walls to brace between, M3-78); how deep a block must be to have
 *  rooms behind its facade rooms. */
export const CORR = 1.2, SHAFT = 0.9, DEEP = 5.8;

export interface Kit {
  U: number; V: number; n: number; core: boolean; alongZ: boolean; r: Rng; out: Fabric;
  nid: (p: string) => string;
  add: (face: number, a0: number, w: number, d: number, k: number, kind: Kind, d0?: number) => Room | null;
  rect: (face: number, a0: number, a1: number, d0: number, d1: number) => Rect;
  box: (q: Rect, y0: number, y1: number, mat?: number) => Solid;
  at: (u: number, v: number) => [number, number];
  unit: (du: number, dv: number) => [number, number];
  yOf: (k: number) => number;
  cut: (s: Solid) => void;
  later: (f: () => void) => void;
  window: (m: Room, state: Glazing) => void;
  winState: (k: number) => Glazing;
  between: (a: Room, b: Room, kind: 'door' | 'vent' | 'rubble' | 'squeeze') => void;
  hole: (lo: Room, hi: Room) => void;
  flatKind: () => Kind;
  /** a shelter site for these rooms */
  site: (rooms: Room[]) => void;
}

/** Lay the warren. Returns the floors it took (none if the block is too shallow for a corridor and rooms). */
export function warren(K: Kit): number[] {
  const { U, V, n, r, rect, box, yOf } = K;
  // The corridor's band across the block, and the facade rooms' depth either side of it.
  const cv0 = K.core ? CORE_W + GAP : Math.max(SIZE.d[0] + GAP, (V - CORR) / 2), cv1 = cv0 + CORR;
  // (A block too shallow for rooms on both sides has them on one, its corridor along the other facade.)
  const south = cv0 - GAP, north = V - cv1 - GAP;
  if (south < SIZE.d[0] || cv1 > V || n < 2) return [];
  const count = Math.min(n - 1, 1 + Math.floor(n / 6) + (rand(r) < 0.5 ? 1 : 0)), k0 = 1 + randInt(r, Math.max(1, n - count)), floors: number[] = [];
  for (let k = k0; k < Math.min(n, k0 + count); k++) floors.push(k);
  // One floor plan for the band, as in a real block: the rooms' widths along it, a slot kept for the shaft.
  const from = K.core ? CORE_L + GAP : 0, slots: [number, number][] = [];
  for (let u = from; u + SIZE.w[0] <= U; ) { const w = Math.min(U - u, SIZE.w[0] + rand(r) * (SIZE.w[1] - SIZE.w[0])); if (U - u - w < SIZE.w[0]) { slots.push([u, U - u]); break; } slots.push([u, w]); u += w + GAP; }
  const shaftAt = floors.length > 1 && slots.length > 2 && north >= SIZE.d[0] ? 1 + randInt(r, slots.length - 2) : -1;
  if (shaftAt >= 0) { const [u, w] = slots[shaftAt]; slots.splice(shaftAt, 1, [u, SHAFT], [u + SHAFT + GAP, w - SHAFT - GAP]); }
  const backD = north >= DEEP ? 2.4 + rand(r) * Math.min(0.8, north - DEEP) : 0, southD = !K.core && south >= DEEP ? 2.4 + rand(r) * 0.6 : 0;
  const lock = (): Lock => roll(r, [0.2, 0.3, 0.3, 0.1, 0.1]);
  /** A doorway between two rooms on facing sides of a wall along u (a corridor and a room off it, a room and the
   *  one behind it): through the wall at u c, the door leaf in its middle. */
  const through = (a: Room, b: Room, lk: Lock) => {
    const [, av0, , av1] = rect(a.face, a.a0, a.a1, a.d0, a.d), [, bv0, , bv1] = rect(b.face, b.a0, b.a1, b.d0, b.d);
    const v0 = Math.min(av1, bv1), v1 = Math.max(av0, bv0), u0 = Math.max(a.a0, b.a0), u1 = Math.min(a.a1, b.a1);
    if (u1 - u0 < DOOR + 0.4) return false;
    const c = u0 + 0.2 + DOOR / 2 + rand(r) * (u1 - u0 - DOOR - 0.4), y = yOf(a.k);
    K.cut(box([c - DOOR / 2, v0 - 0.01, c + DOOR / 2, v1 + 0.01], y, y + DOOR_H));
    for (const m of [a, b]) m.keep.push([c - 0.7, Math.min(v0, v1) - 1, c + 0.7, Math.max(v0, v1) + 1]);
    const vm = (v0 + v1) / 2;
    K.later(() => door(K.nid('d'), box([c - DOOR / 2, vm - 0.03, c + DOOR / 2, vm + 0.03], y, y + DOOR_H), K.at(c - DOOR / 2, vm), K.unit(1, 0), DOOR, lk, K.out));
    return true;
  };
  const facade = new Map<number, Room[]>(), corridors = new Map<number, Room>();
  for (const k of floors) {
    const y = yOf(k), made: Room[] = [];
    const corridor = K.add(0, 0, U, cv1, k, 'corridor', cv0);
    if (!corridor) continue;
    made.push(corridor);
    corridors.set(k, corridor);
    // Off the stairwell's landing, its door often locked or chained: the main stair rarely gets you in.
    if (K.core) {
      const u = CORE.near / 2;
      K.cut(box([u - DOOR / 2, CORE_W - 0.01, u + DOOR / 2, cv0 + 0.01], y, y + DOOR_H));
      corridor.keep.push([u - 0.7, cv0, u + 0.7, cv0 + 1]);
      K.later(() => door(K.nid('d'), box([u - DOOR / 2, CORE_W + GAP / 2 - 0.03, u + DOOR / 2, CORE_W + GAP / 2 + 0.03], y, y + DOOR_H), K.at(u - DOOR / 2, CORE_W + GAP / 2), K.unit(1, 0), DOOR, roll(r, [0.1, 0.2, 0.3, 0.15, 0.25]), K.out));
    }
    // Rubble across the corridor, now and then: over it is a crawl under the ceiling.
    if (rand(r) < 0.35) {
      const u = from + 2 + rand(r) * Math.max(0, U - from - 8);
      K.later(() => K.out.solids.push(box([u, cv0, u + 1.6, cv1], y, y + FLOOR - SLAB - 0.75, MAT.rubble)));
      corridor.keep.push([u - 0.5, cv0, u + 2.1, cv1]);
    }
    // The rooms either side, slot by slot; the shaft's slot left to the shaft.
    const rows: Room[][] = [[], [], []];
    slots.forEach(([u, w], i) => {
      if (i === shaftAt) return;
      const sd = southD || south, s0 = K.add(0, u, w, sd, k, K.flatKind());
      const f1 = north >= SIZE.d[0] ? K.add(1, u, w, backD || north, k, K.flatKind()) : null;
      const b1 = backD ? K.add(1, u, w, north, k, rand(r) < 0.5 ? 'store' : K.flatKind(), backD + GAP) : null;
      const s1 = southD ? K.add(0, u, w, south, k, 'store', southD + GAP) : null;
      for (const [m, row] of [[s0, 0], [f1, 1], [b1, 2]] as const) if (m) { rows[row].push(m); made.push(m); }
      facade.set(k, [...(facade.get(k) ?? []), ...[s0, f1].filter((m): m is Room => !!m)]);
      if (s1) made.push(s1);
      // The rooms behind, without windows, marked for the tests and the routes (M3-76).
      for (const m of [b1, s1]) if (m) { const q = rect(m.face, m.a0, m.a1, m.d0, m.d), [x, z] = K.at((q[0] + q[2]) / 2, (q[1] + q[3]) / 2); K.out.features.push({ kind: 'backroom', x, y, z, group: K.out.features.length }); }
      // Windows on the facades; doors off the corridor to the rooms on it, through to the ones behind.
      for (const m of [s0, f1]) if (m && rand(r) < 0.75) K.window(m, K.winState(k));
      for (const [inner, outer] of [[b1, f1], [s1, s0]] as const) {
        const onCorr = inner ?? outer;
        if (onCorr && rand(r) < 0.8) through(corridor, onCorr, lock());
        if (inner && outer) through(outer, inner, roll(r, [0.4, 0.4, 0.05, 0.15, 0]));
      }
    });
    // Neighbours through their party walls (not across the shaft's slot): a door, a vent, a crack to squeeze through.
    for (const row of rows) for (let i = 0; i + 1 < row.length; i++) {
      const q = rand(r);
      if (row[i + 1].a0 - row[i].a1 > GAP + 0.01) continue;
      if (q < 0.3) K.between(row[i], row[i + 1], q < 0.12 ? 'squeeze' : q < 0.2 ? 'vent' : 'door');
    }
    // Where the floor meets its neighbours' (M3-76): the corridor's two ends and the facade rooms, at their outer
    // faces, for a breach through to a building close by (yuzhong/breach.ts).
    const party = (u: number, v: number, du: number, dv: number) => { const [x, z] = K.at(u, v), [nx, nz] = K.unit(du, dv); K.out.features.push({ kind: 'party', x, y, z, group: K.out.features.length, nx, nz }); };
    party(-WALL, (cv0 + cv1) / 2, -1, 0); party(U + WALL, (cv0 + cv1) / 2, 1, 0);
    for (const m of rows[0]) party((m.a0 + m.a1) / 2, -WALL, 0, -1);
    for (const m of rows[1]) party((m.a0 + m.a1) / 2, V + WALL, 0, 1);
    K.site(made);
  }
  if (floors.length > 1) vertical(K, floors, facade, corridors, slots, shaftAt, backD || north, north);
  return floors;
}

/** Between the band's floors: a hole through the slab from a facade room to the one over it, now and then a
 *  collapsed slab leaning up the corridor's far end to the corridor over it (a slope too narrow to do more than
 *  brace and climb, M3-78), and the shaft up the slot kept for it (a low duct from the corridor at its foot and at
 *  its head, nothing between). */
function vertical(K: Kit, floors: number[], facade: Map<number, Room[]>, corridors: Map<number, Room>, slots: [number, number][], shaftAt: number, d: number, north: number) {
  const { r, rect, box, yOf, U } = K;
  for (let i = 0; i + 1 < floors.length; i++) {
    const lo = facade.get(floors[i]) ?? [], hi = facade.get(floors[i + 1]) ?? [];
    const pairs = lo.map(a => [a, hi.find(b => b.face === a.face && Math.abs(b.a0 - a.a0) < 1e-6)] as const).filter(([, b]) => b);
    if (pairs.length && rand(r) < 0.7) { const [a, b] = pairs[randInt(r, pairs.length)]; K.hole(a, b!); }
    const c = corridors.get(floors[i]), c2 = corridors.get(floors[i + 1]);
    if (c && c2 && rand(r) < 0.45) {
      const u0 = U - 2.8, u1 = U - 0.2, y = yOf(floors[i]), [v0, v1] = [c.d0, c.d];
      K.cut(box([u0, v0, u1, v1], y + FLOOR - SLAB - 0.01, y + FLOOR + 0.01));
      const [ax, az] = K.at(u0, v0), [bx, bz] = K.at(u1, v1);
      K.later(() => K.out.solids.push(rampSolid(Math.min(ax, bx), y, Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), y, y + FLOOR, K.alongZ ? 3 : 1, MAT.concrete)));
      c.keep.push([u0 - 0.3, v0, U, v1]); c2.keep.push([u0 - 0.3, v0, U, v1]);
      const [fx, fz] = K.at(u0, (v0 + v1) / 2), [tx, tz] = K.at(u1, (v0 + v1) / 2);
      K.out.features.push({ kind: 'chute', x: fx, y, z: fz, group: K.out.features.length, nx: tx - fx, nz: tz - fz });
    }
  }
  if (shaftAt >= 0) {
    const [u] = slots[shaftAt], y0 = yOf(floors[0]), y1 = yOf(floors[floors.length - 1]);
    const q = rect(1, u, u + SHAFT, 0.3, d - 0.3), [x, z] = K.at((q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
    K.cut(box(q, y0, y1 + FLOOR - SLAB));
    K.out.features.push({ kind: 'shaft', x, y: y0, z, group: K.out.features.length }, { kind: 'shafthead', x, y: y1, z, group: K.out.features.length + 1 });
    // In at its foot and out at its head through its end, a duct the shaft's width from the corridor: the walls he
    // braces between run on through it.
    // Each behind a vent cover on the corridor wall, shut or rusted fast (M3-83).
    for (const y of [y0, y1]) {
      K.cut(box(rect(1, u, u + SHAFT, d - 0.31, north + GAP + 0.01), y, y + 1.2));
      const v = north + GAP - 0.05, lock: Lock = rand(r) < 0.5 ? 'jammed' : 'shut';
      K.later(() => door(K.nid('v'), box(rect(1, u, u + SHAFT, v - 0.03, v + 0.03), y, y + 1.2), K.at(u, K.V - v), K.unit(1, 0), SHAFT, lock, K.out, ['通风口', 'Vent cover']));
    }
  }
}
