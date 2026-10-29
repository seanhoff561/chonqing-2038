// Carving the tunnel network into the terrain (M3-08): each run between polyline points becomes boxes cut out
// of the ground (a sloped run gets a stair floor), plus the gate, the plaza exit's shelter and the cool room's
// fittings. Only terrain solids are cut, so it stays cheap.
import { solid, carve, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { stair } from './terrain';
import { TUNNELS, GATE } from '../../data/tunnels';
import type { Inter, Prop, Zone, Site } from '../world';

const lampAt = (alongX: boolean, p: number, c: number, y: number): [number, number, number, number, number, number, number] =>
  alongX ? [p - 0.3, y - 0.12, c - 0.12, p + 0.3, y, c + 0.12, MAT.lamp] : [c - 0.12, y - 0.12, p - 0.3, c + 0.12, y, p + 0.3, MAT.lamp];

export function carveTunnels(terrain: Solid[]) {
  const solids: Solid[] = [], decor: Solid[] = [], inter: Inter[] = [], props: Prop[] = [], zones: Zone[] = [], sites: Site[] = [];
  const cuts: Box[] = [];
  for (const t of TUNNELS) {
    for (let i = 1; i < t.pts.length; i++) {
      const [ax, ay, az] = t.pts[i - 1], [bx, by, bz] = t.pts[i];
      const alongX = Math.abs(bx - ax) > Math.abs(bz - az), hw = t.w / 2;
      const [lo, hi] = alongX ? [Math.min(ax, bx), Math.max(ax, bx)] : [Math.min(az, bz), Math.max(az, bz)];
      const c = alongX ? az : ax;
      const box = (p0: number, p1: number, y0: number, y1: number): Box => alongX
        ? { x0: p0, y0, z0: c - hw, x1: p1, y1, z1: c + hw } : { x0: c - hw, y0, z0: p0, x1: c + hw, y1, z1: p1 };
      if (ay === by) {
        cuts.push(box(lo - hw, hi + hw, ay, ay + t.h));
        // Old bulkhead lamps on the crown, a few still burning off the shelter's batteries.
        for (let p = lo + 6; p < hi - 2; p += 18) decor.push(solid(...lampAt(alongX, p, c, ay + t.h)));
      } else {
        // A flight: cut in 1 m slices following the floor, then lay the stair in it.
        const n = Math.ceil(hi - lo);
        for (let k = 0; k < n; k++) {
          const f = (k + 0.5) / n, p = lo + k, y = ay + (by - ay) * (alongX ? (bx > ax ? f : 1 - f) : (bz > az ? f : 1 - f));
          cuts.push(box(p, p + 1.01, Math.min(ay, by) - 0.5, y + t.h));
        }
        const up = alongX ? (bx < ax ? 2 : 1) : (bz < az ? 4 : 3);
        const b = box(lo, hi, 0, 0);
        stair(b.x0, b.z0, b.x1, b.z1, Math.min(ay, by), Math.max(ay, by), up as 1 | 2 | 3 | 4, solids, decor);
      }
      const z = box(lo - hw, hi + hw, Math.min(ay, by), Math.max(ay, by) + t.h);
      zones.push({ kind: 'under', box: z });
    }
  }
  let ground = terrain;
  for (const c of cuts) ground = carve(ground, c);

  // The rusted gate: a door in the retaining wall's face.
  const gate = solid(GATE.x - GATE.w / 2, GATE.y, GATE.z - 0.25, GATE.x + GATE.w / 2, GATE.y + GATE.h, GATE.z - 0.05, MAT.hidden);
  solids.push(gate);
  inter.push({ id: 'shibati-gate', kind: 'door', x: GATE.x, y: GATE.y + 1.2, z: GATE.z - 0.15, r: 1.2, zh: '铁门', en: 'Rusted gate', data: { solid: -1 } });
  props.push({ kind: 'door', x: GATE.x - GATE.w / 2, y: GATE.y, z: GATE.z - 0.15, yaw: 0, w: GATE.w, h: GATE.h, d: 0.08, text: 'shibati-gate' });

  // The plaza exit breaks the surface under a small concrete shelter, open to the west.
  const ex = 485, ez = 370, y = 44;
  solids.push(
    solid(ex, y, ez + 1.5, ex + 6.5, y + 2.8, ez + 1.75, MAT.concrete), solid(ex, y, ez - 1.75, ex + 6.5, y + 2.8, ez - 1.5, MAT.concrete),
    solid(ex + 6.25, y, ez - 1.5, ex + 6.5, y + 2.8, ez + 1.5, MAT.concrete), solid(ex - 0.3, y + 2.8, ez - 2, ex + 6.8, y + 3.05, ez + 2, MAT.concrete),
  );

  // The cool room: shelves, a chest freezer, crates and a table; a good place to hide.
  const cy = 32;
  const fit = [
    { id: 'cool-freezer', type: 'fridge', box: [560, 341.2, 562, 342.2, 1.0], loot: 'kitchen' },
    { id: 'cool-crate1', type: 'crate', box: [565.5, 341.0, 567.5, 342.2, 0.9], loot: 'kitchen' },
    { id: 'cool-crate2', type: 'crate', box: [565.5, 347.8, 567.5, 349.0, 0.9], loot: 'shop' },
  ];
  for (const f of fit) {
    const [x0, z0, x1, z1, h] = f.box;
    solids.push(solid(x0, cy, z0, x1, cy + h, z1, f.type === 'fridge' ? MAT.metal : MAT.crate));
    inter.push({ id: f.id, kind: 'container', x: (x0 + x1) / 2, y: cy + h / 2, z: z0 > 345 ? z0 - 0.05 : z1 + 0.05, r: 0.7, zh: f.type === 'fridge' ? '冰柜' : '货箱', en: f.type === 'fridge' ? 'Freezer' : 'Crate', data: { type: f.type, loot: f.loot } });
  }
  solids.push(solid(562.5, cy, 347.6, 564, cy + 0.78, 349.0, MAT.wood));
  inter.push({ id: 'cool-table', kind: 'table', x: 563.25, y: cy + 0.78, z: 347.5, r: 0.8, zh: '桌子', en: 'Table' });
  sites.push({ id: 'coolroom', kind: 'cellar', x: 563, y: cy, z: 345, bed: null, table: 'cool-table', containers: fit.map(f => f.id), exits: 1, windows: 0, streetSides: 0 });
  return { ground, solids, decor, inter, props, zones, sites, gate };
}
