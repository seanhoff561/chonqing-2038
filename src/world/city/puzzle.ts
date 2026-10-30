// Buildings as puzzles (M3-36, U-040): an enterable building is solid but for a few small rooms carved into it, and
// only those are built. They come in clusters, each grown from a first room by a template's steps: the room beside
// it through a door (often locked or jammed, now and then choked with rubble) or a crawl vent behind a cover to pry
// off, the one over or under it through a hole in the floor (a broken slab to climb, or a ladder), a short flight up
// to the next floor, a fire escape outside, a hatch from the roof. A cluster's ways in from outside are its windows
// (broken in, glazed or barred) and those hatches and escapes; rarely does one way in reach them all, and the main
// stairwell, where there is one, opens onto few of them.
import { rampSolid, carve, type Solid } from '../geom';
import { stepsFor } from '../steps';
import { MAT } from '../mats';
import { rand, randInt, type Rng } from '../../sim/rng';
import { FLOOR, WALL, SLAB, DOOR, DOOR_H, CORE, CORE_W, furnish, over, type Floor, type Kind, type Rect } from './rooms';

const CORE_NEAR = CORE.near;
import { door, glaze, roll, type Glazing } from './access';
import type { Lot, Fabric } from './buildings';
import type { Site } from '../world';
import { warren } from './warren';

/** Rooms are small (U-040); the mass left between two; a window; a vent to crawl through; a crack to squeeze
 *  through (he is 0.5 m across, square to the world's axes, so a turned block's crack needs a little more). */
export const SIZE = { w: [2.6, 4.2], d: [2.4, 3.4] }, GAP = 0.3, WIN = { w: 1.4, sill: 0.9, h: 1.5 }, VENT = { w: 0.75, h: 0.65 }, SQUEEZE = { w: 0.72, h: 1.8 };

export interface Frame {
  l: Lot; U: number; V: number; n: number; base: number; alongZ: boolean; decay: number;
  B: Floor['B']; at: Floor['at']; nid: (p: string) => string;
  /** the main stairwell's footprint (every floor) and its ground floor lobby, if it has one */
  core?: { shaft: Rect; lobby: Rect };
}
/** A room against a face: along it from a0 to a1, in from it from d0 (0 for a room on the facade) to d. */
export interface Room { face: number; a0: number; a1: number; d0: number; d: number; k: number; kind: Kind; fallen: boolean; keep: Rect[] }
type Step = 'door' | 'vent' | 'rubble' | 'over' | 'stair' | 'escape';
/** The templates: a cluster's first room, then its steps. */
const RECIPES: Record<string, { steps: Step[]; top?: boolean; ground?: boolean; burrow?: boolean }> = {
  flat: { steps: ['door', 'door'] }, tower: { steps: ['over', 'over'] }, split: { steps: ['vent'] }, climb: { steps: ['stair', 'door'] },
  escape: { steps: ['escape', 'door'] }, loft: { steps: ['over'], top: true }, blocked: { steps: ['door', 'rubble'] }, shop: { steps: ['door', 'stair'], ground: true },
  // In from the alley through a hole broken low in the wall, a crawl (M3-71, U-038), then a flight up.
  burrow: { steps: ['stair', 'door'], ground: true, burrow: true },
};

/** Carve the building's rooms and their ways through; furnish them. Returns the sites (one a cluster). */
export function puzzle(fr: Frame, from: number, r: Rng, out: Fabric) {
  const { l, U, V, n, base, B, at, alongZ } = fr, yOf = (k: number) => base + k * FLOOR, wall = base + n * FLOOR;
  // A face's along/depth coordinates (along its length, in from its inner face) to the frame's rect.
  const len = (face: number) => (face < 2 ? U : V);
  const rect = (face: number, a0: number, a1: number, d0: number, d1: number): Rect =>
    face === 0 ? [a0, d0, a1, d1] : face === 1 ? [a0, V - d1, a1, V - d0] : face === 2 ? [d0, a0, d1, a1] : [U - d1, a0, U - d0, a1];
  const box = (q: Rect, y0: number, y1: number, mat = 0) => B(q[0], y0, q[1], q[2], y1, q[3], mat);
  const unit = (du: number, dv: number): [number, number] => { const [ax, az] = at(0, 0), [bx, bz] = at(du, dv); return [bx - ax, bz - az]; };
  /** Along a face, and in from it, as a world step. */
  const alongDir = (face: number) => (face < 2 ? unit(1, 0) : unit(0, 1)), inDir = (face: number) => (face === 0 ? unit(0, 1) : face === 1 ? unit(0, -1) : face === 2 ? unit(1, 0) : unit(-1, 0));
  const rooms: Room[] = [], cuts: Solid[] = [], later: (() => void)[] = [];
  const roomRect = (m: Room) => rect(m.face, m.a0, m.a1, m.d0, m.d);
  const free = (q: Rect, k: number) => {
    if (q[0] < 0 || q[1] < 0 || q[2] > U || q[3] > V) return false;
    // (A hair under the wall's thickness, so rooms laid a wall apart in sums of floats still fit.)
    const t = GAP - 1e-4, g: Rect = [q[0] - t, q[1] - t, q[2] + t, q[3] + t];
    if (fr.core && (over(g, fr.core.shaft) || (k === 0 && over(g, fr.core.lobby)))) return false;
    return !rooms.some(m => m.k === k && over(g, roomRect(m)));
  };
  const add = (face: number, a0: number, w: number, d: number, k: number, kind: Kind, d0 = 0): Room | null => {
    if (k < 0 || k >= n || a0 < 0 || a0 + w > len(face) + 1e-6) return null;
    const m: Room = { face, a0, a1: a0 + w, d0, d, k, kind, fallen: false, keep: [] };
    if (!free(roomRect(m), k)) return null;
    rooms.push(m);
    return m;
  };
  const size = (lo: number, hi: number) => lo + rand(r) * (hi - lo);
  const flatKind = (): Kind => (l.mat === MAT.facadeBand && rand(r) < 0.6 ? 'office' : (['bedroom', 'living', 'kitchen', 'store', 'bedroom'] as const)[randInt(r, 5)]);

  // Openings: a box carved from the mass and the rooms' lining, and what fills it.
  const window = (m: Room, state: Glazing) => {
    const c = (m.a0 + m.a1) / 2, y = yOf(m.k), o0 = y + WIN.sill, o1 = o0 + WIN.h;
    cuts.push(box(rect(m.face, c - WIN.w / 2, c + WIN.w / 2, -WALL - 0.05, 0.05), o0, o1));
    m.keep.push(rect(m.face, c - WIN.w / 2 - 0.2, c + WIN.w / 2 + 0.2, 0, 0.9));
    // A frame round it outside: sill, lintel, jambs.
    for (const [a0, a1, y0, y1] of [[c - WIN.w / 2 - 0.1, c + WIN.w / 2 + 0.1, o0 - 0.08, o0], [c - WIN.w / 2 - 0.1, c + WIN.w / 2 + 0.1, o1, o1 + 0.12], [c - WIN.w / 2 - 0.1, c - WIN.w / 2, o0, o1], [c + WIN.w / 2, c + WIN.w / 2 + 0.1, o0, o1]])
      out.decor.push(box(rect(m.face, a0, a1, -WALL - 0.1, -WALL + 0.02), y0, y1, MAT.concrete));
    // And inside: a sill deep enough to sit on, a frame (M3-74).
    for (const [a0, a1, d0, d1, y0, y1] of [[c - WIN.w / 2 - 0.06, c + WIN.w / 2 + 0.06, -WALL / 2, 0.14, o0 - 0.04, o0], [c - WIN.w / 2 - 0.06, c - WIN.w / 2, -0.01, 0.03, o0, o1], [c + WIN.w / 2, c + WIN.w / 2 + 0.06, -0.01, 0.03, o0, o1], [c - WIN.w / 2 - 0.06, c + WIN.w / 2 + 0.06, -0.01, 0.03, o1, o1 + 0.06]]) {
      const fr = box(rect(m.face, a0, a1, d0, d1), y0, y1, MAT.wood); fr.inner = true; out.decor.push(fr);
    }
    const q = rect(m.face, c - WIN.w / 2, c + WIN.w / 2, -WALL / 2 - 0.02, -WALL / 2 + 0.02), [cu, cv] = [(q[0] + q[2]) / 2, (q[1] + q[3]) / 2];
    later.push(() => glaze(fr.nid('w'), box(q, o0, o1), at(cu, cv), alongDir(m.face), WIN.w, state, out));
    // Where it is from outside, for planks across to it (M3-37a): its sill, facing out.
    const s = rect(m.face, c, c, -WALL - 0.02, -WALL - 0.02), [sx, sz] = at(s[0], s[1]), [ix, iz] = inDir(m.face);
    out.features.push({ kind: `win:${state}`, x: sx, y: o0, z: sz, group: out.features.length, nx: -ix, nz: -iz });
  };
  const winState = (k: number): Glazing => { const q = rand(r); return k === 0 ? (q < 0.6 ? 'barred' : q < 0.9 ? 'glass' : 'open') : q < 0.25 ? 'open' : q < 0.75 ? 'glass' : 'barred'; };
  /** A doorway (or a vent, low and narrow, or a squeeze, a crack he turns sideways through) through the mass between
   *  two rooms side by side along a face. */
  const between = (a: Room, b: Room, kind: 'door' | 'vent' | 'rubble' | 'squeeze') => {
    const lo = a.a1 < b.a0 ? a : b, hi = lo === a ? b : a, e0 = Math.max(a.d0, b.d0), d = Math.min(a.d, b.d) - e0;
    const w = kind === 'vent' ? VENT.w : kind === 'squeeze' ? SQUEEZE.w : DOOR, h = kind === 'vent' ? VENT.h : kind === 'squeeze' ? SQUEEZE.h : DOOR_H;
    const dc = e0 + Math.min(d - w / 2 - 0.2, 0.4 + w / 2 + rand(r) * Math.max(0, d - w - 0.8)), y = yOf(a.k);
    cuts.push(box(rect(a.face, lo.a1 - 0.01, hi.a0 + 0.01, dc - w / 2, dc + w / 2), y, y + h));
    lo.keep.push(rect(a.face, lo.a1 - 1, lo.a1, dc - 0.7, dc + 0.7)); hi.keep.push(rect(a.face, hi.a0, hi.a0 + 1, dc - 0.7, dc + 0.7));
    if (kind === 'squeeze') {
      // Broken through: chunks of the wall lying either side.
      for (const [u0, u1] of [[lo.a1 - 0.6, lo.a1], [hi.a0, hi.a0 + 0.6]]) out.decor.push(box(rect(a.face, u0, u1, dc - 0.45, dc + 0.45), y, y + 0.15 + rand(r) * 0.2, MAT.rubble));
      const q = rect(a.face, (lo.a1 + hi.a0) / 2, (lo.a1 + hi.a0) / 2, dc, dc), [x, z] = at(q[0], q[1]), [nx, nz] = alongDir(a.face);
      out.features.push({ kind: 'squeeze', x, y, z, group: out.features.length, nx, nz });
      return;
    }
    if (kind === 'rubble') {
      // Choked with rubble: the room beyond has come down.
      const q = rect(a.face, lo.a1 - 0.5, hi.a0 + 0.5, dc - w / 2, dc + w / 2);
      later.push(() => out.solids.push(box(q, y, y + 1.6, MAT.rubble)));
      hi.fallen = true;
      return;
    }
    // A frame round a doorway, both sides (M3-74).
    if (kind === 'door') for (const [a0, a1] of [[lo.a1 - 0.03, lo.a1], [hi.a0, hi.a0 + 0.03]]) {
      for (const [d0, d1, y0, y1] of [[dc - w / 2 - 0.07, dc - w / 2, y, y + h + 0.07], [dc + w / 2, dc + w / 2 + 0.07, y, y + h + 0.07], [dc - w / 2 - 0.07, dc + w / 2 + 0.07, y + h, y + h + 0.07]]) {
        const fr = box(rect(a.face, a0, a1, d0, d1), y0, y1, MAT.wood); fr.inner = true; out.decor.push(fr);
      }
    }
    // In the middle of the mass, a door or a vent cover hinged at one side.
    const mid = (lo.a1 + hi.a0) / 2, q = rect(a.face, mid - 0.03, mid + 0.03, dc - w / 2, dc + w / 2), [hu, hv] = a.face < 2 ? [mid, rect(a.face, 0, 0, dc - w / 2, dc - w / 2)[1]] : [rect(a.face, 0, 0, dc - w / 2, dc - w / 2)[0], mid];
    const lock = kind === 'vent' ? (rand(r) < 0.6 ? 'jammed' : 'shut') : roll(r, [0.3, 0.2, 0.3, 0.2, 0]);
    later.push(() => door(fr.nid(kind === 'vent' ? 'v' : 'd'), box(q, y, y + h), at(hu, hv), inDir(a.face), w, lock, out, kind === 'vent' ? ['通风口', 'Vent cover'] : undefined));
  };
  /** A hole through the floor from a room to the one over it, near its outer wall, and a way up it: a broken slab
   *  leaning under it, or a ladder on the wall. */
  const hole = (lo: Room, hi: Room) => {
    const a1 = Math.min(lo.a1, hi.a1) - 0.3, a0 = a1 - 1.3, y = yOf(lo.k), q = rect(lo.face, a0, a1, 0, 1.3);
    cuts.push(box(q, y + FLOOR - SLAB - 0.01, y + FLOOR + 0.01));
    hi.keep.push(rect(hi.face, a0 - 0.3, a1 + 0.3, 0, 1.6));
    if (rand(r) < 0.5 && a0 - 2.2 > lo.a0) {
      // The slab rises 1.6 m over 2.4 to under the hole (walkable); from its top the hole's far edge is a mantle.
      // (Under the ceiling it stays a metre low, so he has his headroom.)
      const s = rect(lo.face, a0 - 1.5, a0 + 0.9, 0.1, 1.2), up = lo.face < 2 ? (alongZ ? 3 : 1) : alongZ ? 1 : 3;
      const [ax, az] = at(s[0], s[1]), [bx, bz] = at(s[2], s[3]), ramp = rampSolid(Math.min(ax, bx), y, Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), y, y + 1.6, up as 1 | 3, MAT.concrete);
      ramp.inner = true;
      out.solids.push(ramp);
      lo.keep.push(rect(lo.face, a0 - 2, a1, 0, 1.6));
    } else {
      // A ladder by the outer wall (a hand off it, its own frame behind), up through it.
      const c = (a0 + a1) / 2, p = rect(lo.face, c, c, 0.2, 0.2), [x, z] = at(p[0], p[1]), [nx, nz] = inDir(lo.face);
      out.climbables.push({ kind: 'ladder', x, z, y0: y, y1: y + FLOOR + 1.0, nx, nz });
      lo.keep.push(rect(lo.face, a0 - 0.3, a1 + 0.3, 0, 1.2));
    }
  };
  /** A short flight along a face from a room's floor up one: a stair room two floors tall, the room beside it
   *  through its foot, and a room on the floor over at its head. */
  const stair = (m: Room): Room | null => {
    const run = 3.6, w = run + 1.0, d = 1.5, a0 = m.a1 + GAP, k = m.k;
    const s = add(m.face, a0, w, d, k, 'store'), s2 = s && add(m.face, a0, w, d, k + 1, 'store');
    if (!s || !s2) { if (s) rooms.splice(rooms.indexOf(s), 1); return null; }
    // (No floor between its two floors; the head a landing at the floor over.)
    const y = yOf(k);
    cuts.push(box(rect(m.face, a0, a0 + w, 0, d), y + FLOOR - SLAB - 0.01, y + FLOOR + 0.01));
    const head = rect(m.face, a0 + run, a0 + w, 0, d);
    later.push(() => out.solids.push(box(head, y + FLOOR - SLAB, y + FLOOR, MAT.concrete)));
    const q = rect(m.face, a0, a0 + run, 0.05, d - 0.05), [ax, az] = at(q[0], q[1]), [bx, bz] = at(q[2], q[3]), up = m.face < 2 ? (alongZ ? 3 : 1) : alongZ ? 1 : 3;
    const ramp = rampSolid(Math.min(ax, bx), y - 0.12, Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), y, y + FLOOR, up as 1 | 3, MAT.hidden);
    out.solids.push(ramp);
    stepsFor(ramp, out.decor, MAT.concrete);
    s.kind = s2.kind = 'store';
    s.keep.push(rect(m.face, a0, a0 + w, 0, d)); s2.keep.push(rect(m.face, a0, a0 + w, 0, d));
    between(m, s, 'door');
    const top = add(m.face, a0 + w + GAP, size(SIZE.w[0], SIZE.w[1]), size(SIZE.d[0], SIZE.d[1]), k + 1, flatKind());
    if (top) between(s2, top, 'door');
    return top ?? s2;
  };
  /** A fire escape outside: a landing under a room's window, a ladder down to a landing under the window of the room
   *  beneath it. */
  const escape = (m: Room): Room | null => {
    const lo = add(m.face, m.a0, m.a1 - m.a0, m.d, m.k - 1, flatKind());
    if (!lo || m.k - 1 < 3) { if (lo) rooms.splice(rooms.indexOf(lo), 1); return null; }
    window(m, rand(r) < 0.5 ? 'open' : 'glass'); window(lo, rand(r) < 0.5 ? 'open' : 'glass');
    const c = (m.a0 + m.a1) / 2;
    for (const [k, gap] of [[m.k, true], [lo.k, false]] as const) {
      const y = yOf(k);
      out.solids.push(box(rect(m.face, c - 1.1, gap ? c + 0.45 : c + 1.1, -WALL - 1.0, -WALL), y - 0.12, y, MAT.metal));
      out.decor.push(box(rect(m.face, c - 1.1, c + 1.1, -WALL - 1.0, -WALL - 0.96), y + 0.95, y + 1.0, MAT.metal));
      for (let u = c - 1.08; u < c + 1.1; u += 0.55) out.decor.push(box(rect(m.face, u, u + 0.03, -WALL - 1.0, -WALL - 0.96), y, y + 0.95, MAT.metal));
    }
    const p = rect(m.face, c + 0.8, c + 0.8, -WALL - 0.75, -WALL - 0.75), [x, z] = at(p[0], p[1]), [nx, nz] = inDir(m.face);
    out.climbables.push({ kind: 'ladder', x, z, y0: yOf(lo.k), y1: yOf(m.k) + 1.0, nx: -nx, nz: -nz });
    return lo;
  };

  const names = Object.keys(RECIPES), sites: Site[] = [], siteOf = new Map<Room, Site>();
  // The warren: a band of whole floors built (M3-77, U-043).
  const band = warren({
    U, V, n, core: !!fr.core, alongZ, r, out, nid: fr.nid, add, rect, box, at, unit, yOf, cut: c => cuts.push(c), later: f => later.push(f), window, winState, between, hole, flatKind,
    site: ms => {
      const q = roomRect(ms[0]), [sx, sz] = at((q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
      sites.push({ id: `b${l.id}.w${ms[0].k}`, kind: 'flat', x: sx, y: yOf(ms[0].k), z: sz, bed: null, table: null, containers: [], exits: 1, windows: ms.length, streetSides: 0 });
      for (const m of ms) siteOf.set(m, sites[sites.length - 1]);
    },
  });
  // The clusters elsewhere: one to three, each from a template (fewer beside a warren).
  for (let c = 0, count = band.length ? 1 : 1 + randInt(r, Math.min(3, 1 + Math.floor(n / 4))); c < count; c++) {
    // Beside a warren, half the time it's the hole broken in low from the alley (M3-71).
    const recipe = RECIPES[band.length && rand(r) < 0.5 ? 'burrow' : names[randInt(r, names.length)]], first = rooms.length;
    let m: Room | null = null;
    for (let t = 0; t < 14 && !m; t++) {
      const face = randInt(r, 4), w = size(SIZE.w[0], SIZE.w[1]), k = recipe.ground ? 0 : recipe.top ? n - 1 : 1 + randInt(r, Math.max(1, n - 1));
      m = add(face, size(0, Math.max(0, len(face) - w)), w, size(SIZE.d[0], SIZE.d[1]), k, recipe.burrow ? 'store' : recipe.ground ? (['shop', 'restaurant', 'workshop'] as const)[randInt(r, 3)] : flatKind());
    }
    if (!m) continue;
    // Its way in: a window (or the roof hatch, the shop's shutter).
    if (recipe.top) {
      const a1 = m.a1 - 0.3, q = rect(m.face, a1 - 1.3, a1, 0, 1.3), c0 = (a1 - 0.65), p = rect(m.face, c0, c0, 0.2, 0.2), [x, z] = at(p[0], p[1]), [nx, nz] = inDir(m.face);
      cuts.push(box(q, wall - SLAB - 0.01, wall + 0.01));
      out.climbables.push({ kind: 'ladder', x, z, y0: yOf(m.k), y1: wall + 1.0, nx, nz });
      m.keep.push(rect(m.face, a1 - 1.6, a1 + 0.3, 0, 1.2));
    } else if (recipe.burrow) {
      // A hole broken through the wall at its foot, crawl-high, rubble round it outside.
      const c = (m.a0 + m.a1) / 2, y = yOf(0), h = rect(m.face, c - 0.4, c + 0.4, -WALL - 0.05, 0.05);
      cuts.push(box(h, y, y + 0.65));
      m.keep.push(rect(m.face, c - 0.6, c + 0.6, 0, 1.2));
      for (const k of [-1, 1]) out.decor.push(box(rect(m.face, c + k * 0.55 - 0.25, c + k * 0.55 + 0.25, -WALL - 0.5, -WALL), y, y + 0.2 + rand(r) * 0.3, MAT.rubble));
      const [hx, hz] = at((h[0] + h[2]) / 2, (h[1] + h[3]) / 2), [ix, iz] = inDir(m.face);
      out.features.push({ kind: 'burrow', x: hx, y, z: hz, group: out.features.length, nx: -ix, nz: -iz });
    } else window(m, recipe.ground ? (rand(r) < 0.5 ? 'glass' : 'open') : winState(m.k) === 'barred' ? 'glass' : winState(m.k));
    let at0: Room = m;
    for (const step of recipe.steps) {
      let next: Room | null = null;
      if (step === 'door' || step === 'rubble' || step === 'vent') {
        const w = size(SIZE.w[0], SIZE.w[1]), gap = step === 'vent' ? size(1.2, 3) : GAP;
        next = add(at0.face, at0.a1 + gap, w, size(SIZE.d[0], SIZE.d[1]), at0.k, flatKind()) ?? add(at0.face, at0.a0 - gap - w, w, size(SIZE.d[0], SIZE.d[1]), at0.k, flatKind());
        if (next) {
          if (step === 'vent') {
            // A crawl duct through the mass: long, so carved as one with the cover at its first end.
            const lo = at0.a1 < next.a0 ? at0 : next, hi = lo === at0 ? next : at0, y = yOf(at0.k), dc = Math.min(lo.d, hi.d) / 2;
            cuts.push(box(rect(at0.face, lo.a1 - 0.01, hi.a0 + 0.01, dc - VENT.w / 2, dc + VENT.w / 2), y, y + VENT.h));
            lo.keep.push(rect(at0.face, lo.a1 - 1, lo.a1, dc - 0.6, dc + 0.6)); hi.keep.push(rect(at0.face, hi.a0, hi.a0 + 1, dc - 0.6, dc + 0.6));
            const q = rect(at0.face, lo.a1 - 0.03, lo.a1 + 0.03, dc - VENT.w / 2, dc + VENT.w / 2), dir = inDir(at0.face), hp = rect(at0.face, lo.a1, lo.a1, dc - VENT.w / 2, dc - VENT.w / 2);
            later.push(() => door(fr.nid('v'), box(q, y, y + VENT.h), at(hp[0], hp[1]), dir, VENT.w, rand(r) < 0.6 ? 'jammed' : 'shut', out, ['通风口', 'Vent cover']));
          } else between(at0, next, step);
          if (rand(r) < 0.4) window(next, winState(next.k));
        }
      } else if (step === 'over') {
        const up = !recipe.top, k = at0.k + (up ? 1 : -1);
        next = add(at0.face, at0.a0, at0.a1 - at0.a0, at0.d, k, flatKind());
        if (next) { hole(up ? at0 : next, up ? next : at0); if (rand(r) < 0.3) window(next, winState(next.k)); }
      } else if (step === 'stair') next = stair(at0);
      else if (step === 'escape') next = at0.k >= 4 ? escape(at0) : null;
      if (next) at0 = next;
    }
    // The cluster's shelter site, at its first room.
    const q = roomRect(m), [sx, sz] = at((q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
    sites.push({ id: `b${l.id}.c${c}`, kind: 'flat', x: sx, y: yOf(m.k), z: sz, bed: null, table: null, containers: [], exits: 1, windows: rooms.length - first, streetSides: 0 });
    for (const x of rooms.slice(first)) siteOf.set(x, sites[sites.length - 1]);
  }

  // Off the main stairwell's landings, now and then a room behind a door, mostly locked or chained (U-040: the
  // main body is no way into most of it).
  if (fr.core) for (let k = 1; k < n; k++) {
    if (rand(r) > 0.45) continue;
    const m = add(2, CORE_W + GAP, size(SIZE.w[0], SIZE.w[1]), size(SIZE.d[0], SIZE.d[1]), k, flatKind());
    if (!m) continue;
    const y = yOf(k), u = CORE_NEAR / 2;
    cuts.push(box([u - DOOR / 2, CORE_W - 0.01, u + DOOR / 2, CORE_W + GAP + 0.01], y, y + DOOR_H));
    m.keep.push([u - 0.7, CORE_W + GAP, u + 0.7, CORE_W + GAP + 1]);
    later.push(() => door(fr.nid('d'), box([u - DOOR / 2, CORE_W + GAP / 2 - 0.03, u + DOOR / 2, CORE_W + GAP / 2 + 0.03], y, y + DOOR_H), at(u - DOOR / 2, CORE_W + GAP / 2), unit(1, 0), DOOR, roll(r, [0.05, 0.1, 0.35, 0.2, 0.3]), out));
    if (rand(r) < 0.5) window(m, winState(k));
    const q = roomRect(m), [sx, sz] = at((q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
    sites.push({ id: `b${l.id}.s${k}`, kind: 'flat', x: sx, y, z: sz, bed: null, table: null, containers: [], exits: 1, windows: 1, streetSides: 0 });
    siteOf.set(m, sites[sites.length - 1]);
  }

  // Carve: the rooms (a stair room's two floors as one), then every opening. (Their walls show the building's
  // inside, plaster or paper: world-mesh.ts.)
  for (const m of rooms) {
    const y = yOf(m.k);
    out.solids.splice(from, out.solids.length - from, ...carve(out.solids.slice(from), box(roomRect(m), y, y + FLOOR - SLAB)));
  }
  for (const c of cuts) out.solids.splice(from, out.solids.length - from, ...carve(out.solids.slice(from), c));
  for (const f of later) f();
  for (const m of rooms) {
    const site = siteOf.get(m)!;
    furnish({ l, y: yOf(m.k), k: m.k, alongZ, B, at, decay: fr.decay, nid: fr.nid }, roomRect(m), m.kind, m.keep, m.fallen, r, out, site);
  }
  return { sites, rooms: rooms.map(m => ({ rect: roomRect(m), k: m.k })) };
}

/** A solid's lining over the inner faces of the core (its shaft and lobby), so they don't show the facade. */
export const lineBox = (q: Rect, y0: number, y1: number, B: Frame['B']) => {
  const t = 0.02;
  return [B(q[0], y0, q[1], q[2], y1, q[1] + t, MAT.plaster), B(q[0], y0, q[3] - t, q[2], y1, q[3], MAT.plaster), B(q[0], y0, q[1], q[0] + t, y1, q[3], MAT.plaster), B(q[2] - t, y0, q[1], q[2], y1, q[3], MAT.plaster)];
};
