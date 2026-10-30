// The tunnels under Shibati and Jiaochangkou on the real map (M3-41c, D-016): the wartime Grand Tunnel from its
// real entrance by the Shibati stairs (十八梯大隧道遗址), down a stairway cut between retaining walls and level
// into the hill toward Jiaochangkou, deep enough that the ground's shell clears it; a side tunnel to the friends'
// air-raid chamber, whose vent shaft rises to a grate in a paved patch of the street above; a stairway up to the
// street at the far end; the hotpot restaurant's cool room as a dead end. Laid out square in its own frame along
// the tunnel (u along, v across), then turned onto the map. The ground is holed over the open stairways and the
// shaft, with walls and slabs covering the holes' ragged cell edges.
import { solid, carve, turn, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { GEO } from '../geo';
import type { Heightfield } from '../heightfield';
import type { Inter, Prop, Zone, Site, Climbable } from '../world';
import { hideoutParts, HIDEOUT } from '../sets/hideout';
import { alley, alleySpot, alleyObb } from './alley';
import { sitePoly } from './site';
import type { Street } from './ground';
import { stair } from '../steps';
import type { Obb } from './shapes';

export interface Tunnels { solids: Solid[]; decor: Solid[]; props: Prop[]; inter: Inter[]; climbables: Climbable[]; alley: Obb; zones: Zone[]; sites: Site[]; frame: { px: number; pz: number; yaw: number; floor: number }; at: Record<string, { x: number; y: number; z: number }>; keep: Obb[] }

const hAt = (g: Heightfield, x: number, z: number) => g.y[Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)))];

/** Stairways climb at 35 degrees; a stair is 3 m wide between walls reaching 4.4 m out from its middle, wider than
 *  the ground cells the holes over it take (a cell's diagonal past its edge). */
const T35 = Math.tan(0.61), HALF = 1.5, WALL = 4.4, HEAD = 3.2;
/** The friends' chamber (hideoutParts) lies south of the Grand Tunnel near its mouth, under an alley (U-038, M3-72):
 *  the shaft over its middle rises to the grate in the first spot along here whose alley stands off the roads (the
 *  machines keep them clear) and the building site. Its east stub meets a side tunnel up to the Grand Tunnel; its
 *  collapsed side passage runs south into the rock. */
const CHAMBER_U = [24, 44], SIDE = 4;
/** The way out: a stairway south off the Grand Tunnel near its end, up to the street below Jiaochangkou. */
const EXIT_U = 202;
/** Where a passage leaves the Grand Tunnel's north side for the underground network (M3-58), and how far it runs. */
export const JUNCTION = { u: 40, v: 14 };

/** A stairway in its own frame (a from its top at 0 down to its foot at len, b across) mapped onto the tunnel
 *  frame's local boxes: along x (u) or z (v), a increasing toward +sa. */
interface Way { ox: number; oz: number; alongX: boolean; sa: 1 | -1 }
const at = (w: Way, a0: number, a1: number, b0: number, b1: number): [number, number, number, number] => {
  const p = [w.sa * a0, w.sa * a1], A0 = Math.min(...p), A1 = Math.max(...p);
  return w.alongX ? [w.ox + A0, w.oz + b0, w.ox + A1, w.oz + b1] : [w.ox + b0, w.oz + A0, w.ox + b1, w.oz + A1];
};
const wbox = (w: Way, a0: number, a1: number, b0: number, b1: number, y0: number, y1: number, mat: number) => { const [x0, z0, x1, z1] = at(w, a0, a1, b0, b1); return solid(x0, y0, z0, x1, y1, z1, mat); };

/** The tunnel frame: from the real entrance toward Jiaochangkou; W maps (u, v) onto the map. */
export function tunnelFrame() {
  const L = GEO.landmarks, px = L.grandTunnel.x, pz = L.grandTunnel.z;
  const yaw = Math.atan2(L.jiaochangkou.z - pz, L.jiaochangkou.x - px), c = Math.cos(yaw), s = Math.sin(yaw);
  return { px, pz, yaw, W: (u: number, v: number): [number, number] => [px + c * u - s * v, pz + s * u + c * v] };
}

export function buildTunnels(g: Heightfield, sts: Street[]): Tunnels {
  const { px, pz, yaw, W } = tunnelFrame();
  const P = (x: number, z: number): [number, number] => W(x - px, z - pz);
  const surface = (u: number, v: number) => hAt(g, ...W(u, v));
  const X = (u: number) => px + u, Z = (v: number) => pz + v, pt = (x: number, z: number) => { const [mx, mz] = P(x, z); return { x: mx, z: mz }; };
  // Deep enough everywhere that the ground's shell clears the bores: 8.5 m under the entrance, more under higher
  // ground, never less than 8.4 m under the lowest ground over the tunnels.
  const top = surface(0, 0);
  const spot = alleySpot(sts, [sitePoly() ?? []].filter(p => p.length), (u, v) => W(u, -v), CHAMBER_U[0], CHAMBER_U[1], 4.5) ?? { u: 30, v: 8, ang: 0 };
  const gu = spot.u, gv = -spot.v, CHAMBER = { u: gu - HIDEOUT.shaftX, v: gv };
  let lowest = Infinity;
  for (let u = 0; u <= 224; u += 2) for (const v of [-3, 0, 3]) lowest = Math.min(lowest, surface(u, v));
  for (let u = CHAMBER.u; u <= CHAMBER.u + 28; u += 2) for (let v = CHAMBER.v - SIDE - 4; v <= 0; v += 2) lowest = Math.min(lowest, surface(u, v));
  const floor = Math.min(top - 8.5, lowest - 8.4), inRun = (top - floor) / T35;
  const out: Tunnels = { solids: [], decor: [], props: [], inter: [], climbables: [], alley: { cx: 0, cz: 0, hw: 0, hd: 0, yaw: 0 }, zones: [], sites: [], frame: { px, pz, yaw, floor }, at: {}, keep: [] };
  const keep = (u0: number, u1: number, v0: number, v1: number) => { const [cx, cz] = W((u0 + u1) / 2, (v0 + v1) / 2); out.keep.push({ cx, cz, hw: (u1 - u0) / 2, hd: (v1 - v0) / 2, yaw }); };
  const under = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) => {
    const cs = [P(x0, z0), P(x1, z0), P(x0, z1), P(x1, z1)], xs = cs.map(q => q[0]), zs = cs.map(q => q[1]);
    out.zones.push({ kind: 'under', box: { x0: Math.min(...xs) - 0.5, y0, z0: Math.min(...zs) - 0.5, x1: Math.max(...xs) + 0.5, y1, z1: Math.max(...zs) + 0.5 } });
  };

  // Bores (the space) and their linings (floor, ceiling, walls, end caps) in the frame: local x = u + px, z = v + pz.
  const runs = [
    { u0: inRun, u1: 212, v: 0, w: 5, h: 4, alongU: true },
    // The side tunnel from the chamber's stub up to the Grand Tunnel (its far end in the chamber's rock).
    { u0: CHAMBER.v - 1.5, u1: -2.5, v: CHAMBER.u + HIDEOUT.length + 6, w: 2.4, h: 3, alongU: false, open: true },
    { u0: 212, u1: 222, v: 0, w: 9, h: 3, alongU: true },
    // Open at its far end, where the underground network's junction room takes it (under.ts).
    { u0: 2.5, u1: JUNCTION.v, v: JUNCTION.u, w: 3, h: 3.2, alongU: false, open: true },
  ];
  const bores: Box[] = [], lining: Solid[] = [], decor: Solid[] = [], kept: Solid[] = [];
  for (const r of runs) {
    const hw = r.w / 2, [a0, a1, b0, b1] = r.alongU ? [X(r.u0), X(r.u1), Z(r.v - hw), Z(r.v + hw)] : [X(r.v - hw), X(r.v + hw), Z(r.u0), Z(r.u1)];
    bores.push({ x0: a0, y0: floor, z0: b0, x1: a1, y1: floor + r.h, z1: b1 });
    lining.push(solid(a0 - 0.5, floor - 1, b0 - 0.5, a1 + 0.5, floor, b1 + 0.5, MAT.stone), solid(a0 - 0.5, floor + r.h, b0 - 0.5, a1 + 0.5, floor + r.h + 0.8, b1 + 0.5, MAT.stone));
    if (r.alongU) lining.push(solid(a0, floor, b0 - 0.5, a1, floor + r.h, b0, MAT.stone), solid(a0, floor, b1, a1, floor + r.h, b1 + 0.5, MAT.stone), solid(a1, floor, b0, a1 + 0.5, floor + r.h, b1, MAT.stone));
    else lining.push(solid(a0 - 0.5, floor, b0, a0, floor + r.h, b1, MAT.stone), solid(a1, floor, b0, a1 + 0.5, floor + r.h, b1, MAT.stone), ...('open' in r ? [] : [solid(a0, floor, b1, a1, floor + r.h, b1 + 0.5, MAT.stone)]));
    // Old bulkhead lamps on the crown, a few still burning off the shelter's batteries.
    if (r.alongU) for (let u = r.u0 + 6; u < r.u1 - 2; u += 18) decor.push(solid(X(u) - 0.3, floor + r.h - 0.12, Z(r.v) - 0.12, X(u) + 0.3, floor + r.h, Z(r.v) + 0.12, MAT.lamp));
    for (let u = r.u0; u < r.u1; u += 4) {
      const e = Math.min(u + 4, r.u1);
      if (r.alongU) under(X(u), Z(r.v - hw), X(e), Z(r.v + hw), floor - 0.5, floor + r.h); else under(X(r.v - hw), Z(u), X(r.v + hw), Z(e), floor - 0.5, floor + r.h);
    }
  }

  // The stairways: the way in from the Shibati street down to the Grand Tunnel's mouth, and the way out.
  const stairway = (w: Way, len: number, high: number, name: string) => {
    const low = high - len * T35, y = (a: number) => high - a * T35;
    const surf = (a: number) => { const [x0, z0, x1, z1] = at(w, a, a, 0, 0); return hAt(g, ...P((x0 + x1) / 2, (z0 + z1) / 2)); };
    // Open to the sky while the ground's shell would reach into the passage, roofed below it after that.
    let open = 0;
    while (open < len && y(open) + HEAD > surf(open) - g.thick - 0.3) open += 0.5;
    const [sx0, sz0, sx1, sz1] = at(w, 0, len, -HALF, HALF);
    stair(sx0, sz0, sx1, sz1, low, high, w.alongX ? (w.sa > 0 ? 2 : 1) : (w.sa > 0 ? 4 : 3), kept, decor);
    for (const [b0, b1] of [[-WALL, -HALF], [HALF, WALL]]) {
      kept.push(wbox(w, 0, open, b0, b1, low - 1, high + 0.9, MAT.concrete));
      if (open < len) kept.push(wbox(w, open, len, b0, b1, low - 1, y(open) + HEAD + 0.4, MAT.stone));
    }
    // The landing at the top, over the holes' edge, and the head wall where the roof begins.
    kept.push(wbox(w, -2.9, 0, -WALL, WALL, high - 0.6, high, MAT.concrete));
    kept.push(wbox(w, open, open + 2.9, -WALL, WALL, y(open) + HEAD, Math.max(high + 0.9, surf(open + 1.5) + 0.3), MAT.concrete));
    // The roof steps down with the flight.
    for (let a = open; a < len; a += 1.5) kept.push(wbox(w, a, Math.min(len, a + 1.5), -HALF, HALF, y(a) + HEAD, y(a) + HEAD + 0.4, MAT.stone));
    for (let a = open; a < len; a += 4) { const [x0, z0, x1, z1] = at(w, a, Math.min(len, a + 4), -HALF, HALF); under(x0, z0, x1, z1, y(Math.min(len, a + 4)) - 0.5, y(a) + HEAD); }
    const [hx0, hz0, hx1, hz1] = at(w, 0, open, -HALF, HALF);
    hole(g, P, hx0, hz0, hx1, hz1);
    const [kx0, kz0, kx1, kz1] = at(w, -3, open + 3, -WALL - 1, WALL + 1);
    keep(kx0 - px, kx1 - px, kz0 - pz, kz1 - pz);
    const [tx0, tz0, tx1, tz1] = at(w, -1.5, -1.5, 0, 0), [x, z] = P((tx0 + tx1) / 2, (tz0 + tz1) / 2);
    out.at[name] = { x, y: high, z };
  };
  stairway({ ox: X(0), oz: Z(0), alongX: true, sa: 1 }, inRun, top, 'entrance');
  // The way out climbs south off the Grand Tunnel's side to the street.
  let eTop = surface(EXIT_U + 1.5, -2.5 - 15), eRun = 15;
  for (let k = 0; k < 5; k++) { eRun = Math.max(6, (eTop - floor) / T35); eTop = surface(EXIT_U + 1.5, -2.5 - eRun); }
  stairway({ ox: X(EXIT_U + 1.5), oz: Z(-2.5 - eRun), alongX: false, sa: 1 }, eRun, floor + eRun * T35, 'exit');
  bores.push({ x0: X(EXIT_U), y0: floor, z0: Z(-3.1), x1: X(EXIT_U + 3), y1: floor + 3, z1: Z(-2.4) });

  // The chamber, its shaft up to the grate in the alley over it (U-038), levelled round the grate, a slab round it
  // covering the hole's cell edges; the rock round the chamber up to the Grand Tunnel's wall.
  const gy = surface(gu, gv), shaftTop = gy - floor, hs = HIDEOUT.shaftHalf, ang = -spot.ang;
  level(g, W, gu, gv, 6, gy);
  const h = hideoutParts(X(CHAMBER.u), floor, Z(CHAMBER.v), { shaftTop, kit: 'start', prefix: 'airraid-', side: SIDE + 2 });
  const rock: Solid[] = [solid(X(CHAMBER.u) - 1, floor - 1, Z(CHAMBER.v - SIDE - 3), X(CHAMBER.u) + HIDEOUT.length + 7.5, floor + 3.6, Z(-2.5), MAT.stone)];
  const sx = X(gu), sz = Z(gv), sh = floor + shaftTop - 0.4, t = hs + 0.3;
  rock.push(solid(sx - t, floor + 3, sz - t, sx + t, sh, sz - hs, MAT.stone), solid(sx - t, floor + 3, sz + hs, sx + t, sh, sz + t, MAT.stone),
    solid(sx - t, floor + 3, sz - hs, sx - hs, sh, sz + hs, MAT.stone), solid(sx + hs, floor + 3, sz - hs, sx + t, sh, sz + hs, MAT.stone));
  rock.push(solid(sx - hs - 1.3, gy - 0.4, sz - hs - 1.3, sx + hs + 1.3, gy + 0.02, sz + hs + 1.3, MAT.concrete));
  hole(g, P, sx - hs, sz - hs, sx + hs, sz + hs);
  const [gx, gz] = W(gu, gv), lane = alley(gx, gz, gy, yaw + ang, (x, z) => hAt(g, x, z));
  out.alley = alleyObb(gx, gz, yaw + ang);
  out.keep.push(out.alley);
  out.solids.push(...lane.solids);

  // The rusted gate across the foot of the way in, and the cool room's fittings: shelves, a chest freezer,
  // crates and a table, a good place to hide.
  const gate = solid(X(inRun) - 0.25, floor, Z(-HALF), X(inRun) - 0.05, floor + 3, Z(HALF), MAT.hidden);
  out.inter.push({ id: 'shibati-gate', kind: 'door', ...pt(X(inRun) - 0.15, Z(0)), y: floor + 1.2, r: 1.2, zh: '铁门', en: 'Rusted gate', data: { solid: -1 } });
  out.props.push({ kind: 'door', ...pt(X(inRun) - 0.15, Z(-HALF)), y: floor, yaw: -Math.PI / 2 - yaw, w: 2 * HALF, h: 3, d: 0.08, text: 'shibati-gate' });
  const fit = [
    { id: 'cool-freezer', type: 'fridge', box: [214, -3.8, 216, -2.8, 1.0], loot: 'kitchen' },
    { id: 'cool-crate1', type: 'crate', box: [219.5, -4, 221.5, -2.8, 0.9], loot: 'kitchen' },
    { id: 'cool-crate2', type: 'crate', box: [219.5, 2.8, 221.5, 4, 0.9], loot: 'shop' },
  ];
  for (const f of fit) {
    const [u0, v0, u1, v1, fh] = f.box;
    kept.push(solid(X(u0), floor, Z(v0), X(u1), floor + fh, Z(v1), f.type === 'fridge' ? MAT.metal : MAT.crate));
    out.inter.push({ id: f.id, kind: 'container', ...pt(X((u0 + u1) / 2), Z(v0 > 0 ? v0 - 0.05 : v1 + 0.05)), y: floor + fh / 2, r: 0.7, zh: f.type === 'fridge' ? '冰柜' : '货箱', en: f.type === 'fridge' ? 'Freezer' : 'Crate', data: { type: f.type, loot: f.loot } });
  }
  kept.push(solid(X(216.5), floor, Z(2.6), X(218), floor + 0.78, Z(4), MAT.wood));
  out.inter.push({ id: 'cool-table', kind: 'table', ...pt(X(217.25), Z(2.5)), y: floor + 0.78, r: 0.8, zh: '桌子', en: 'Table' });
  out.sites.push({ id: 'coolroom', kind: 'cellar', ...pt(X(217), Z(0)), y: floor, bed: null, table: 'cool-table', containers: fit.map(f => f.id), exits: 1, windows: 0, streetSides: 0 });

  let all = lining.concat(rock);
  for (const b of bores.concat(h.cuts)) all = carve(all, b);
  out.solids.push(...turn(all.concat(h.solids, kept), yaw, px, pz));
  // The gate's door switches its own collision solid: the last one.
  out.solids.push(...turn([gate], yaw, px, pz));
  out.decor.push(...turn(decor, yaw, px, pz));
  out.props.push(...lane.props, ...h.props.map(q => { const [x, z] = P(q.x, q.z); return { ...q, x, z, yaw: q.yaw - yaw }; }));
  out.inter.push(...h.inter.map(q => { const [x, z] = P(q.x, q.z); return { ...q, x, z }; }));
  out.climbables.push(...h.climbables.map(c => { const [x, z] = P(c.x, c.z), [ax, az] = P(c.x + c.nx, c.z + c.nz); return { ...c, x, z, nx: ax - x, nz: az - z }; }));
  out.zones.push(...h.zones.map(zn => {
    const cs = [P(zn.box.x0, zn.box.z0), P(zn.box.x1, zn.box.z0), P(zn.box.x0, zn.box.z1), P(zn.box.x1, zn.box.z1)], xs = cs.map(q => q[0]), zs = cs.map(q => q[1]);
    return { ...zn, box: { ...zn.box, x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) } };
  }));
  for (const [k, q] of Object.entries(h.at)) { const [x, z] = P(q.x, q.z); out.at[k] = { x, y: q.y, z }; }
  out.sites.push({ id: 'airraid', kind: 'cellar', x: out.at.mattress.x, y: floor, z: out.at.mattress.z, bed: 'airraid-mattress', table: null, containers: ['airraid-stash'], exits: 1, windows: 0, streetSides: 0 });
  const [jx, jz] = W(JUNCTION.u, JUNCTION.v);
  out.at.grate = { x: gx, y: gy, z: gz };
  out.at.junction = { x: jx, y: floor, z: jz };
  return out;
}

/** Holes in the ground over every cell a rectangle in the frame's local coordinates touches. */
function hole(g: Heightfield, P: (x: number, z: number) => [number, number], x0: number, z0: number, x1: number, z1: number) {
  for (let x = x0; x <= x1 + 1e-6; x += 0.25) for (let z = z0; z <= z1 + 1e-6; z += 0.25) {
    const [mx, mz] = P(Math.min(x, x1), Math.min(z, z1)), i = Math.floor(mx / g.cell), j = Math.floor(mz / g.cell);
    if (i >= 0 && j >= 0 && i < g.w - 1 && j < g.h - 1) g.hole[j * (g.w - 1) + i] = 1;
  }
}
/** Level the ground within r of a frame point to y. */
function level(g: Heightfield, W: (u: number, v: number) => [number, number], u: number, v: number, r: number, y: number) {
  const [cx, cz] = W(u, v);
  for (let j = Math.floor((cz - r) / g.cell); j <= Math.ceil((cz + r) / g.cell); j++) for (let i = Math.floor((cx - r) / g.cell); i <= Math.ceil((cx + r) / g.cell); i++) {
    if (i >= 0 && j >= 0 && i < g.w && j < g.h && Math.hypot(i * g.cell - cx, j * g.cell - cz) <= r) g.y[j * g.w + i] = y;
  }
}
