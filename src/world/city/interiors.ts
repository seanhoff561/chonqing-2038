// Enterable buildings (M3-04): a hollow shell with a street door and window openings (their sills are hand
// holds), floor slabs, a switchback stair core from the street to a hut on the roof, and furniture containers
// on every floor.
import { solid, rampSolid, carve } from '../geom';
import { stepsFor } from '../steps';
import { sides } from './climb';
import { MAT } from '../mats';
import { rand, randInt, type Rng } from '../../sim/rng';
import type { Lot, Fabric } from './buildings';
import type { Site } from '../world';

const FLOOR = 3, WALL = 0.25, SLAB = 0.2, HUT = 2.6;
/** Core space: u runs along the flights, v across. Near landing, two half flights side by side, far landing. */
const CORE = { near: 1.2, run: 4.0, far: 0.9, lane: 1.3 };
const CORE_L = CORE.near + CORE.run + CORE.far, CORE_W = CORE.lane * 2;
/** Window openings: wide and tall enough to hop onto the sill and drop through, or vault at a run (U-014). */
const WIN = { w: 1.4, sill: 0.8, h: 1.9, every: 4.5 };

const FURNITURE = {
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
} as const;
type Piece = keyof typeof FURNITURE;

/** Room for the core and a room beside it, a whole number of floors, not too tall to climb on foot. */
export function canEnter(l: Lot): boolean {
  const a = l.x1 - l.x0, b = l.z1 - l.z0, floors = (l.wall - l.base) / FLOOR;
  return !l.noEnter && l.kind === 'res' && Math.max(a, b) >= CORE_L + 2 * WALL + 1.5 && Math.min(a, b) >= CORE_W + 2 * WALL + 2.5 &&
    Number.isInteger(Math.round(floors * 1000) / 1000) && floors >= 2 && floors <= 24;
}

export function hollow(l: Lot, r: Rng, out: Fabric) {
  const { x0, z0, x1, z1, base, wall } = l;
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

  // Furniture along the walls of the room beside the core, a container in each.
  for (let k = 0; k < n; k++) {
    const y = base + k * FLOOR, shop = k === 0 && rand(r) < 0.4;
    const m = 1 + randInt(r, 3);
    const placed: [number, number, number, number][] = [];
    const [sx, sz] = at((CORE_L + U) / 2, (CORE_W + V) / 2);
    const site: Site = { id: `b${l.id}.${k}`, kind: 'flat', x: sx, y, z: sz, bed: null, table: null, containers: [], windows, streetSides,
      // Ground floors have the street door; every floor has the stairs; the first floor's windows are a drop.
      exits: k === 0 ? 2 : k === 1 ? 2 : 1 };
    out.sites.push(site);
    for (let i = 0; i < m; i++) {
      const kind: Piece = shop && i === 0 ? 'crate' : (['cabinet', 'drawer', 'fridge', 'locker', 'bed', 'table', 'wardrobe', 'wardrobe'] as const)[randInt(r, 8)];
      const f = FURNITURE[kind];
      // Against the far wall (u = U, which has the door) or the side wall (v = V): [u0, v0, u1, v1].
      const far = rand(r) < 0.5, t = rand(r);
      const box: [number, number, number, number] = far
        ? [U - f.d, CORE_W + 0.4 + t * Math.max(0, V - CORE_W - 0.4 - f.w), U, 0]
        : [CORE_L + 0.4 + t * Math.max(0, U - CORE_L - 0.4 - f.w), V - f.d, 0, V];
      if (far) box[3] = box[1] + f.w; else box[2] = box[0] + f.w;
      if (box[2] > U || box[3] > V) continue;
      if (k === 0 && far && Math.abs((box[1] + box[3]) / 2 - doorV) < 1.6) continue;
      if (placed.some(p => p[0] < box[2] && box[0] < p[2] && p[1] < box[3] && box[1] < p[3])) continue;
      placed.push(box);
      out.solids.push(B(box[0], y, box[1], box[2], y + f.h, box[3], f.mat));
      if (kind === 'wardrobe') {
        // Its space, turned so its doors (the shell's +z) face the room: across the far wall's face, or the side's.
        const [cx, cz] = at((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), hw = (f.w - 0.1) / 2, hd = (f.d - 0.1) / 2;
        const [nu, nv] = far ? [-1, 0] : [0, -1], [nx, nz] = alongZ ? [nv, nu] : [nu, nv];
        out.hides.push({ id: out.hides.length, kind: 'wardrobe', yaw: Math.atan2(nx, nz), inner: { x0: cx - hw, y0: y + 0.05, z0: cz - hd, x1: cx + hw, y1: y + 1.9, z1: cz + hd } });
      }
      // The front face, where he reaches in.
      const [fx, fz] = far ? at(box[0] - 0.05, (box[1] + box[3]) / 2) : at((box[0] + box[2]) / 2, box[1] - 0.05);
      const id = `b${l.id}.${k}.${i}`;
      if ('use' in f) { if (f.use === 'mattress') site.bed = id; else site.table = id; } else site.containers.push(id);
      out.inter.push('use' in f
        ? { id, kind: f.use, x: fx, y: y + f.h, z: fz, r: 0.8, zh: f.zh, en: f.en }
        : { id, kind: 'container', x: fx, y: y + Math.min(1.0, f.h / 2), z: fz, r: 0.6, zh: f.zh, en: f.en, data: { type: kind, loot: f.loot } });
    }
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
