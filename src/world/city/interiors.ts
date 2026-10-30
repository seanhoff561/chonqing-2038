// Enterable buildings (M3-04): a hollow shell with a street door and window openings (their sills are hand
// holds), floor slabs, a switchback stair core from the street to a hut on the roof, and on every floor rooms
// round it (rooms.ts, M3-38).
import { solid, rampSolid, carve } from '../geom';
import { stepsFor } from '../steps';
import { sides } from './climb';
import { MAT } from '../mats';
import { rand, type Rng } from '../../sim/rng';
import { floorRooms, FLOOR, WALL, SLAB, CORE, CORE_L, CORE_W } from './rooms';
import type { Lot, Fabric } from './buildings';
import type { Site } from '../world';

const HUT = 2.6;
/** Window openings: wide and tall enough to hop onto the sill and drop through, or vault at a run (U-014). */
const WIN = { w: 1.4, sill: 0.8, h: 1.9, every: 4.5 };

/** Room for the core and a room beside it, a whole number of floors, not too tall to climb on foot. */
export function canEnter(l: Lot): boolean {
  const a = l.x1 - l.x0, b = l.z1 - l.z0, floors = (l.wall - l.base) / FLOOR;
  return !l.noEnter && l.kind === 'res' && Math.max(a, b) >= CORE_L + 2 * WALL + 1.5 && Math.min(a, b) >= CORE_W + 2 * WALL + 2.5 &&
    Number.isInteger(Math.round(floors * 1000) / 1000) && floors >= 2 && floors <= 24;
}

export function hollow(l: Lot, r: Rng, out: Fabric) {
  const { x0, z0, x1, z1, base, wall } = l, from = out.solids.length;
  const n = Math.round((wall - base) / FLOOR);
  const alongZ = z1 - z0 >= x1 - x0;
  const ox = x0 + WALL, oz = z0 + WALL;
  /** World position of core-space (u, v). */
  const at = (u: number, v: number): [number, number] => (alongZ ? [ox + v, oz + u] : [ox + u, oz + v]);
  const B = (u0: number, y0: number, v0: number, u1: number, y1: number, v1: number, mat: number) => {
    const [ax, az] = at(u0, v0), [bx, bz] = at(u1, v1);
    return solid(Math.min(ax, bx), y0, Math.min(az, bz), Math.max(ax, bx), y1, Math.max(az, bz), mat);
  };
  const U = (alongZ ? z1 - z0 : x1 - x0) - 2 * WALL, V = (alongZ ? x1 - x0 : z1 - z0) - 2 * WALL;

  // Shell: each facade is full-height piers between window columns and spandrels between the openings.
  // The street door sits in the far wall from the core (u = U), centred on the room.
  const doorV = CORE_W + (V - CORE_W) / 2;
  const [dx, dz] = at(U, doorV);
  const doorC = alongZ ? dx : dz;
  const streetSides = sides(l).filter(sd => sd.street).length;
  let windows = 0;
  const facade = (alongX: boolean, a: number, b: number, t0: number, t1: number, door: boolean) => {
    const len = b - a, k = Math.floor(len / WIN.every);
    let cols = Array.from({ length: k }, (_, i) => a + (len / k) * (i + 0.5));
    if (door) cols = [...cols.filter(c => Math.abs(c - doorC) > 2), doorC].sort((p, q) => p - q);
    const box = (c0: number, y0: number, c1: number, y1: number) => {
      if (c1 - c0 > 0.01 && y1 - y0 > 0.01) out.solids.push(alongX ? solid(c0, y0, t0, c1, y1, t1, l.mat) : solid(t0, y0, c0, t1, y1, c1, l.mat));
    };
    windows += cols.length - (door ? 1 : 0);
    let prev = a;
    for (const c of cols) {
      box(prev, base, c - WIN.w / 2, wall);
      let y = base;
      for (let f = 0; f < n; f++) {
        const isDoor = door && c === doorC && f === 0;
        const o0 = isDoor ? base : base + f * FLOOR + WIN.sill;
        box(c - WIN.w / 2, y, c + WIN.w / 2, o0);
        y = isDoor ? base + 2.2 : o0 + WIN.h;
      }
      box(c - WIN.w / 2, y, c + WIN.w / 2, wall);
      prev = c + WIN.w / 2;
    }
    box(prev, base, b, wall);
  };
  facade(true, x0, x1, z0, z0 + WALL, false);
  facade(true, x0, x1, z1 - WALL, z1, alongZ);
  facade(false, z0 + WALL, z1 - WALL, x0, x0 + WALL, false);
  facade(false, z0 + WALL, z1 - WALL, x1 - WALL, x1, !alongZ);

  // Floor slabs and the roof, open over the flights; the ground floor's slab hides the ground dipping under it.
  out.solids.push(B(0, base - SLAB, 0, U, base + 0.03, V, MAT.concrete));
  for (let k = 1; k <= n; k++) {
    const y = base + k * FLOOR;
    out.solids.push(...carve([B(0, y - SLAB, 0, U, y, V, MAT.concrete)], B(CORE.near, y - SLAB - 1, 0, CORE_L, y + 1, CORE_W, 0)));
  }

  // Flights, each two invisible ramps under visible steps (thin, so the flight above leaves headroom):
  // lane A rises along +u to the far landing, lane B comes back to the next floor's near landing.
  const flight = (u0: number, v0: number, u1: number, v1: number, low: number, up: boolean) => {
    const [ax, az] = at(u0, v0), [bx, bz] = at(u1, v1);
    const dir = alongZ ? (up ? 3 : 4) : up ? 1 : 2;
    // Thin under the low end (0.12 m), so a turned building's flights leave his square footprint the headroom too.
    const ramp = rampSolid(Math.min(ax, bx), low - 0.12, Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), low, low + FLOOR / 4, dir, MAT.hidden);
    out.solids.push(ramp);
    stepsFor(ramp, out.decor, MAT.concrete);
  };
  const half = CORE.run / 2, mid = CORE.near + half, end = CORE.near + CORE.run;
  for (let k = 0; k < n; k++) {
    const y = base + k * FLOOR;
    flight(CORE.near, 0, mid, CORE.lane, y, true);
    flight(mid, 0, end, CORE.lane, y + FLOOR / 4, true);
    out.solids.push(B(end, y + FLOOR / 2 - 0.25, 0, CORE_L, y + FLOOR / 2, CORE_W, MAT.concrete));
    flight(mid, CORE.lane, end, CORE_W, y + FLOOR / 2, false);
    flight(CORE.near, CORE.lane, mid, CORE_W, y + (3 * FLOOR) / 4, false);
  }

  // Roof hut over the core, its door opening onto the roof beside the near landing.
  const hut = [
    B(-WALL, wall, -WALL, CORE_L + 0.2, wall + HUT, 0, MAT.concrete), B(-WALL, wall, 0, 0, wall + HUT, CORE_W, MAT.concrete),
    B(CORE_L, wall, 0, CORE_L + 0.2, wall + HUT, CORE_W, MAT.concrete), B(-WALL, wall, CORE_W, CORE_L + 0.2, wall + HUT, CORE_W + 0.2, MAT.concrete),
    B(-WALL, wall + HUT, -WALL, CORE_L + 0.2, wall + HUT + 0.2, CORE_W + 0.2, MAT.concrete),
  ];
  out.solids.push(...carve(hut, B(0.1, wall, CORE_W - 0.1, 1.1, wall + 2.1, CORE_W + 0.3, 0)));
  const [hx, hz] = at(CORE.near / 2, CORE_W / 2);
  out.sites.push({ id: `b${l.id}.hut`, kind: 'roof hut', x: hx, y: wall, z: hz, bed: null, table: null, containers: [], exits: 2, windows: 0, streetSides: 0 });

  // Rooms on every floor; how far gone the building is.
  const decay = 0.3 + rand(r) * 0.7;
  let holes: [number, number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const y = base + k * FLOOR;
    const [sx, sz] = at((CORE_L + U) / 2, (CORE_W + V) / 2);
    const site: Site = { id: `b${l.id}.${k}`, kind: 'flat', x: sx, y, z: sz, bed: null, table: null, containers: [], windows, streetSides,
      // Ground floors have the street door; every floor has the stairs; the first floor's windows are a drop.
      exits: k === 0 ? 2 : k === 1 ? 2 : 1 };
    out.sites.push(site);
    holes = floorRooms({ l, U, V, y, k, top: k === n - 1, alongZ, doorV, B, at, holes, decay, from }, r, out, site);
  }

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
}
