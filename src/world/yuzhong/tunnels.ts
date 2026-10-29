// The tunnels under Shibati and Jiaochangkou on the real map (M3-41c, D-016): the wartime Grand Tunnel from its
// real entrance by the Shibati stairs (十八梯大隧道遗址) level into the hill toward Jiaochangkou, an open cut where
// it's shallow; a side tunnel to the friends' air-raid chamber, whose vent shaft rises to a grate under shop
// neon; a stair exit up to Jiaochangkou at the far end; the hotpot restaurant's cool room as a dead end. Laid
// out square in its own frame along the tunnel, then turned onto the map. Floors are level at the entrance's
// height; the ground's shell is cut away over the shaft and the exit.
import { solid, carve, turn, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { GEO } from '../geo';
import type { Heightfield } from '../heightfield';
import type { Inter, Prop, Zone, Site } from '../world';
import { hideoutParts } from '../sets/hideout';
import { stair } from '../city/terrain';

export interface Tunnels { solids: Solid[]; decor: Solid[]; props: Prop[]; inter: Inter[]; zones: Zone[]; sites: Site[]; frame: { px: number; pz: number; yaw: number; floor: number }; at: Record<string, { x: number; y: number; z: number }>; keep: [number, number, number][] }

const hAt = (g: Heightfield, x: number, z: number) => g.y[Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)))];

/** Runs in the tunnel frame: u along the Grand Tunnel from its entrance, v across, w wide, h tall. */
const RUNS = [
  { id: 'grand', u0: -2, u1: 212, v: 0, w: 5, h: 4, alongU: true },
  { id: 'side', u0: 2.5, u1: 13, v: 117.2, w: 2.4, h: 3, alongU: false },
  { id: 'coolroom', u0: 212, u1: 222, v: 0, w: 9, h: 3, alongU: true },
];
/** The friends' chamber (hideoutParts), its east stub meeting the side tunnel, its blocked north passage the Grand. */
const CHAMBER = { u: 91.2, v: 11 };
const EXIT = { u: 196, v0: 2.5 };

export function buildTunnels(g: Heightfield): Tunnels {
  const L = GEO.landmarks, px = L.grandTunnel.x, pz = L.grandTunnel.z;
  const yaw = Math.atan2(L.jiaochangkou.z - pz, L.jiaochangkou.x - px), c = Math.cos(yaw), s = Math.sin(yaw);
  const floor = hAt(g, px, pz) - 0.3;
  /** Tunnel-frame (u, v) to the map. */
  const W = (u: number, v: number): [number, number] => [px + c * u - s * v, pz + s * u + c * v];
  const surface = (u: number, v: number) => hAt(g, ...W(u, v));
  const out: Tunnels = { solids: [], decor: [], props: [], inter: [], zones: [], sites: [], frame: { px, pz, yaw, floor }, at: {}, keep: [] };

  // Bores (the space) and their linings (floor, ceiling, walls) in the frame: local x = u + px, z = v + pz.
  const X = (u: number) => px + u, Z = (v: number) => pz + v;
  const bores: Box[] = [], lining: Solid[] = [], decor: Solid[] = [];
  for (const r of RUNS) {
    const hw = r.w / 2, [a0, a1, b0, b1] = r.alongU ? [X(r.u0), X(r.u1), Z(r.v - hw), Z(r.v + hw)] : [X(r.v - hw), X(r.v + hw), Z(r.u0), Z(r.u1)];
    bores.push({ x0: a0, y0: floor, z0: b0, x1: a1, y1: floor + r.h, z1: b1 });
    lining.push(solid(a0 - 0.5, floor - 1, b0 - 0.5, a1 + 0.5, floor, b1 + 0.5, MAT.stone), solid(a0 - 0.5, floor + r.h, b0 - 0.5, a1 + 0.5, floor + r.h + 0.8, b1 + 0.5, MAT.stone));
    lining.push(r.alongU ? solid(a0, floor, b0 - 0.5, a1, floor + r.h, b0, MAT.stone) : solid(a0 - 0.5, floor, b0, a0, floor + r.h, b1, MAT.stone));
    lining.push(r.alongU ? solid(a0, floor, b1, a1, floor + r.h, b1 + 0.5, MAT.stone) : solid(a1, floor, b0, a1 + 0.5, floor + r.h, b1, MAT.stone));
    // Old bulkhead lamps on the crown, a few still burning off the shelter's batteries.
    if (r.alongU) for (let u = r.u0 + 6; u < r.u1 - 2; u += 18) decor.push(solid(X(u) - 0.3, floor + r.h - 0.12, Z(r.v) - 0.12, X(u) + 0.3, floor + r.h, Z(r.v) + 0.12, MAT.lamp));
    for (let u = r.u0; u < r.u1; u += 4) {
      const [x0, z0] = W(r.alongU ? u : r.v - hw, r.alongU ? r.v - hw : u), [x1, z1] = W(r.alongU ? Math.min(u + 4, r.u1) : r.v + hw, r.alongU ? r.v + hw : Math.min(u + 4, r.u1));
      out.zones.push({ kind: 'under', box: { x0: Math.min(x0, x1) - 1, y0: floor - 0.5, z0: Math.min(z0, z1) - 1, x1: Math.max(x0, x1) + 1, y1: floor + r.h, z1: Math.max(z0, z1) + 1 } });
    }
  }
  // The chamber, its shaft up to the ground over it.
  const shaftTop = surface(CHAMBER.u + 10, CHAMBER.v) - floor;
  const h = hideoutParts(X(CHAMBER.u), floor, Z(CHAMBER.v), { shaftTop, kit: 'start', prefix: 'airraid-', side: CHAMBER.v - 2 });
  const rock: Solid[] = [solid(X(CHAMBER.u) - 1, floor - 1, Z(CHAMBER.v) - CHAMBER.v + 2, X(CHAMBER.u) + 27, floor + 3.6, Z(CHAMBER.v) + 3, MAT.stone)];
  // The shaft's own lining from the chamber's roof to the ground.
  const sx = X(CHAMBER.u + 10), sz = Z(CHAMBER.v);
  rock.push(solid(sx - 1.8, floor + 3, sz - 1.8, sx + 1.8, floor + shaftTop - 0.1, sz - 1.5, MAT.stone), solid(sx - 1.8, floor + 3, sz + 1.5, sx + 1.8, floor + shaftTop - 0.1, sz + 1.8, MAT.stone),
    solid(sx - 1.8, floor + 3, sz - 1.5, sx - 1.5, floor + shaftTop - 0.1, sz + 1.5, MAT.stone), solid(sx + 1.5, floor + 3, sz - 1.5, sx + 1.8, floor + shaftTop - 0.1, sz + 1.5, MAT.stone));
  // The exit stair: up from the Grand Tunnel's side to Jiaochangkou at 35 degrees.
  // Find where the flight meets the ground: a few rounds of run = rise / tan(35 degrees).
  let top = surface(EXIT.u + 1.5, EXIT.v0 + 15), run = 15;
  for (let k = 0; k < 4; k++) { run = Math.max(4, (top - floor) / Math.tan(0.61)); top = surface(EXIT.u + 1.5, EXIT.v0 + run); }
  const ex0 = X(EXIT.u), ez0 = Z(EXIT.v0);
  bores.push({ x0: ex0, y0: floor, z0: ez0 - 0.5, x1: ex0 + 3, y1: top + 3, z1: ez0 + run + 1 });
  const stairs: Solid[] = [], stairDecor: Solid[] = [];
  stair(ex0, ez0, ex0 + 3, ez0 + run, floor, top, 3, stairs, stairDecor);
  lining.push(solid(ex0 - 0.5, floor, ez0, ex0, top + 3, ez0 + run + 1, MAT.stone), solid(ex0 + 3, floor, ez0, ex0 + 3.5, top + 3, ez0 + run + 1, MAT.stone));
  // A little concrete shelter over the exit, open toward the street.
  lining.push(solid(ex0 - 0.5, top + 2.6, ez0 + run - 2, ex0 + 3.5, top + 2.9, ez0 + run + 1, MAT.concrete));
  let all = lining.concat(rock);
  for (const b of bores.concat(h.cuts)) all = carve(all, b);
  const local = all.concat(h.solids, stairs);
  out.solids.push(...turn(local, yaw, px, pz));
  out.decor.push(...turn(decor.concat(stairDecor), yaw, px, pz));
  // Points, props and interactables turn with it.
  const P = (x: number, z: number): [number, number] => W(x - px, z - pz);
  out.props.push(...h.props.map(q => { const [x, z] = P(q.x, q.z); return { ...q, x, z, yaw: q.yaw - yaw }; }));
  out.inter.push(...h.inter.map(q => { const [x, z] = P(q.x, q.z); return { ...q, x, z }; }));
  out.zones.push(...h.zones.map(zn => {
    const cs = [P(zn.box.x0, zn.box.z0), P(zn.box.x1, zn.box.z0), P(zn.box.x0, zn.box.z1), P(zn.box.x1, zn.box.z1)], xs = cs.map(q => q[0]), zs = cs.map(q => q[1]);
    return { ...zn, box: { ...zn.box, x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) } };
  }));
  for (const [k, q] of Object.entries(h.at)) { const [x, z] = P(q.x, q.z); out.at[k] = { x, y: q.y, z }; }
  const [gx, gz] = W(CHAMBER.u + 10, CHAMBER.v);
  // Shop neon over and beside the grate: what he sees looking up from the hideout at night.
  out.props.push({ kind: 'neonsign', x: gx, y: floor + shaftTop, z: gz, yaw: -yaw, w: 4, h: 4.2 }, { kind: 'neonsign', x: gx + 1.5, y: floor + shaftTop, z: gz + 1.5, yaw: Math.PI / 2 - yaw, w: 3, h: 6 });
  out.sites.push({ id: 'airraid', kind: 'cellar', x: out.at.mattress.x, y: floor, z: out.at.mattress.z, bed: 'airraid-mattress', table: null, containers: ['airraid-stash'], exits: 1, windows: 0, streetSides: 0 });
  // Open the ground over the shaft and the exit, and cut the entrance where the tunnel is shallow.
  open(g, W, CHAMBER.u + 10 - 1.5, CHAMBER.u + 10 + 1.5, CHAMBER.v - 1.5, CHAMBER.v + 1.5);
  openXZ(g, ex0, ez0 + run - 2, ex0 + 3, ez0 + run + 1, yaw, px, pz);
  for (let u = -2; u < 212; u += 1) if (surface(u, 0) - (floor + 4) < 4.5) trench(g, W, u, floor);
  out.at.grate = { x: gx, y: floor + shaftTop, z: gz };
  out.at.entrance = { x: px, y: floor, z: pz };
  out.at.exit = (() => { const [x, z] = P(ex0 + 1.5, ez0 + run + 0.5); return { x, y: top, z }; })();
  // Places the street dressing and the lots keep clear of: the entrance cut, the grate, the exit.
  out.keep = [[px, pz, 8], [gx, gz, 4], [out.at.exit.x, out.at.exit.z, 5]];
  return out;
}

/** Holes in the ground over a frame rectangle (u0..u1, v0..v1). */
function open(g: Heightfield, W: (u: number, v: number) => [number, number], u0: number, u1: number, v0: number, v1: number) {
  for (let u = u0; u <= u1; u += 0.5) for (let v = v0; v <= v1; v += 0.5) {
    const [x, z] = W(u, v), i = Math.floor(x / g.cell), j = Math.floor(z / g.cell);
    if (i >= 0 && j >= 0 && i < g.w - 1 && j < g.h - 1) g.hole[j * (g.w - 1) + i] = 1;
  }
}
/** Holes over a rectangle given in the frame's unturned map coordinates. */
function openXZ(g: Heightfield, x0: number, z0: number, x1: number, z1: number, yaw: number, px: number, pz: number) {
  open(g, (u, v) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [px + c * u - s * v, pz + s * u + c * v]; }, x0 - px, x1 - px, z0 - pz, z1 - pz);
}
/** Where the Grand Tunnel runs too shallow for the ground's shell, the ground is cut down to its floor. */
function trench(g: Heightfield, W: (u: number, v: number) => [number, number], u: number, floor: number) {
  for (let v = -3.5; v <= 3.5; v += 1) {
    const [x, z] = W(u, v), i = Math.round(x / g.cell), j = Math.round(z / g.cell);
    if (i >= 0 && j >= 0 && i < g.w && j < g.h) g.y[j * g.w + i] = Math.min(g.y[j * g.w + i], floor);
  }
}
