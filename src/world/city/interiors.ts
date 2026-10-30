// Enterable buildings (M3-04, U-040): solid blocks with a few small rooms carved into them as a puzzle (puzzle.ts),
// some with the main stairwell: a switchback core from a lobby inside the street door to a hut on the roof. Doors
// locked, jammed, chained or not (access.ts).
import { solid, rampSolid, carve, type Solid } from '../geom';
import { stepsFor } from '../steps';
import { sides } from './climb';
import { MAT } from '../mats';
import { rand, type Rng } from '../../sim/rng';
import { FLOOR, WALL, SLAB, CORE, CORE_L, CORE_W } from './rooms';
import { door, roll } from './access';
import { puzzle } from './puzzle';
import { basement } from './basement';
import type { Lot, Fabric } from './buildings';

const HUT = 2.6;

/** Room for the core and a room beside it, a whole number of floors, not too tall to climb on foot. */
export function canEnter(l: Lot): boolean {
  const a = l.x1 - l.x0, b = l.z1 - l.z0, floors = (l.wall - l.base) / FLOOR;
  return !l.noEnter && l.kind === 'res' && Math.max(a, b) >= CORE_L + 2 * WALL + 1.5 && Math.min(a, b) >= CORE_W + 2 * WALL + 2.5 &&
    Number.isInteger(Math.round(floors * 1000) / 1000) && floors >= 2 && floors <= 24;
}

/** Carve a block's rooms (U-040) out of its mass in `look`; `core` forces the main stairwell (or leaves it out). */
export function hollow(l: Lot, r: Rng, out: Fabric, look = l.mat, core?: boolean) {
  const { x0, z0, x1, z1, base, wall } = l, from = out.solids.length;
  const n = Math.round((wall - base) / FLOOR);
  const alongZ = z1 - z0 >= x1 - x0;
  const ox = x0 + WALL, oz = z0 + WALL;
  /** World position of frame point (u, v): u along the long side, v across, from inside the corner wall. */
  const at = (u: number, v: number): [number, number] => (alongZ ? [ox + v, oz + u] : [ox + u, oz + v]);
  const B = (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, mat: number) => {
    const [ax, az] = at(u0, v0), [bx, bz] = at(u1, v1);
    return solid(Math.min(ax, bx), y0, Math.min(az, bz), Math.max(ax, bx), y1, Math.max(az, bz), mat);
  };
  const U = (alongZ ? z1 - z0 : x1 - x0) - 2 * WALL, V = (alongZ ? x1 - x0 : z1 - z0) - 2 * WALL;
  let ids = 0;
  const nid = (p: string) => `b${l.id}.${p}${ids++}`;
  // The block, solid: its few rooms are carved out of it (its facade's painting kept whole across the cuts).
  const mass = solid(x0, base, z0, x1, wall, z1, look);
  mass.orig = { x0, y0: base, z0, x1, z1 };
  out.solids.push(mass);
  const decay = 0.3 + rand(r) * 0.7;
  // The main stairwell on some: a shaft up the corner from a lobby inside the street door (in the far wall, u = U)
  // to a hut on the roof; it opens onto few rooms (puzzle.ts).
  const doorV = CORE_W + (V - CORE_W) / 2;
  const shaft: [number, number, number, number] = [0, 0, CORE_L, CORE_W], lobby: [number, number, number, number] = [0, CORE_W, U, Math.min(V, doorV + 0.8)];
  const hasCore = core ?? (n >= 3 && rand(r) < 0.55);
  if (hasCore) {
    const cut = (b: Solid) => out.solids.splice(from, out.solids.length - from, ...carve(out.solids.slice(from), b));
    cut(B(shaft[0], base, shaft[1], shaft[2], wall + 0.01, shaft[3], 0));
    cut(B(lobby[0], base, lobby[1], lobby[2], base + FLOOR - SLAB, lobby[3], 0));
    const doorCut = B(U - 0.01, base, doorV - 0.8, U + WALL + 0.05, base + 2.2, doorV + 0.8, 0);
    cut(doorCut);
    door(nid('street'), B(U + WALL / 2 - 0.03, base, doorV - 0.8, U + WALL / 2 + 0.03, base + 2.2, doorV + 0.8, 0), at(U + WALL / 2, doorV - 0.8), alongZ ? [1, 0] : [0, 1], 1.6, roll(r, [0.1, 0.25, 0.4, 0.15, 0.1]), out);
    // Landings at each floor, flights between, each two invisible ramps under visible steps (thin, so the flight
    // above leaves headroom): lane A rises along +u to the far landing, lane B comes back to the next floor's.
    const flight = (u0: number, v0: number, u1: number, v1: number, low: number, up: boolean) => {
      const [ax, az] = at(u0, v0), [bx, bz] = at(u1, v1);
      const dir = alongZ ? (up ? 3 : 4) : up ? 1 : 2;
      const ramp = rampSolid(Math.min(ax, bx), low - 0.12, Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), low, low + FLOOR / 4, dir, MAT.hidden);
      out.solids.push(ramp);
      stepsFor(ramp, out.decor, MAT.concrete);
    };
    const half = CORE.run / 2, mid = CORE.near + half, end = CORE.near + CORE.run;
    for (let k = 0; k < n; k++) {
      const y = base + k * FLOOR;
      if (k > 0) out.solids.push(B(0, y - SLAB, 0, CORE.near, y, CORE_W, MAT.concrete));
      flight(CORE.near, 0, mid, CORE.lane, y, true);
      flight(mid, 0, end, CORE.lane, y + FLOOR / 4, true);
      out.solids.push(B(end, y + FLOOR / 2 - 0.25, 0, CORE_L, y + FLOOR / 2, CORE_W, MAT.concrete));
      flight(mid, CORE.lane, end, CORE_W, y + FLOOR / 2, false);
      flight(CORE.near, CORE.lane, mid, CORE_W, y + (3 * FLOOR) / 4, false);
    }
    out.solids.push(B(0, wall - SLAB, 0, CORE.near, wall, CORE_W, MAT.concrete));
    // Roof hut over the shaft, its door onto the roof beside the near landing: locked as a rule, a lock to break.
    const hut = [
      B(-WALL, wall, -WALL, CORE_L + 0.2, wall + HUT, 0, MAT.concrete), B(-WALL, wall, 0, 0, wall + HUT, CORE_W, MAT.concrete),
      B(CORE_L, wall, 0, CORE_L + 0.2, wall + HUT, CORE_W, MAT.concrete), B(-WALL, wall, CORE_W, CORE_L + 0.2, wall + HUT, CORE_W + 0.2, MAT.concrete),
      B(-WALL, wall + HUT, -WALL, CORE_L + 0.2, wall + HUT + 0.2, CORE_W + 0.2, MAT.concrete),
    ];
    out.solids.push(...carve(hut, B(0.1, wall, CORE_W - 0.1, 1.1, wall + 2.1, CORE_W + 0.3, 0)));
    door(nid('roof'), B(0.1, wall, CORE_W + 0.07, 1.1, wall + 2.1, CORE_W + 0.13, 0), at(0.1, CORE_W + 0.1), alongZ ? [0, 1] : [1, 0], 1.0, roll(r, [0.1, 0.15, 0.6, 0.15, 0]), out, ['屋顶门', 'Roof door']);
    const [hx, hz] = at(CORE.near / 2, CORE_W / 2);
    out.sites.push({ id: `b${l.id}.hut`, kind: 'roof hut', x: hx, y: wall, z: hz, bed: null, table: null, containers: [], exits: 2, windows: 0, streetSides: 0 });
    // A walking route for tests and, later, pursuers: door, up every flight, out of the roof hut.
    const P = (u: number, v: number, y: number) => { const [x, z] = at(u, v); return { x, y, z }; };
    const [ex, ez] = at(U + 1.0, doorV);
    const path = [{ x: ex, y: base, z: ez }, P(U - 0.8, doorV, base), P(CORE.near / 2, CORE_W + 0.8, base)];
    for (let k = 0; k < n; k++) {
      const y = base + k * FLOOR;
      path.push(P(CORE.near / 2, CORE.lane / 2, y), P(CORE_L - CORE.far / 2, CORE.lane / 2, y + FLOOR / 2),
        P(CORE_L - CORE.far / 2, CORE.lane * 1.5, y + FLOOR / 2), P(CORE.near / 2, CORE.lane * 1.5, y + FLOOR));
    }
    path.push(P(0.6, CORE_W + 0.9, wall));
    l.route = path;
    if (rand(r) < 0.7) basement(l, r, out, { U, V, base, alongZ, B, at, nid, decay, lobby });
  }
  const { sites } = puzzle({ l, U, V, n, base, alongZ, decay, B, at, nid, core: hasCore ? { shaft, lobby } : undefined }, from, r, out);
  out.sites.push(...sites.map(q => ({ ...q, streetSides: sides(l).filter(sd => sd.street).length })));
}
