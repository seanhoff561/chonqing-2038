// Jiaochangkou 较场口 (M3-07): the junction plaza, the Line 2 terminus and the elevated monorail beam running
// west over the main road to the construction site. The beam is 0.85 m of concrete 9 m up: walkable if he keeps
// his nerve, reached by the station stairs or the maintenance ladders at each station.
import { solid, type Solid } from '../geom';
import { MAT } from '../mats';
import { stair } from '../city/terrain';
import { tileAt, TILE } from '../map';
import type { Climbable, Inter, Prop } from '../world';

/** The beam: its centre line, top, width and ends; stations along it. */
export const BEAM = { z: 15 * TILE + 10, top: 53, w: 0.85, depth: 1.6, west: 130, east: 524 };
export const STATIONS = [
  { name: 'Jiaochangkou terminus', x0: 466, x1: 524 },
  { name: 'Site stop', x0: 288, x1: 318 },
];
/** A two-car Line 2 train stalled on the beam over the road since the takeover: walk the beam through it. */
export const TRAIN = { x0: 356, cars: 2, len: 14.8, gap: 0.4, w: 2.9 };
const PLAZA = { x0: 22 * TILE, z0: 16 * TILE, x1: 27 * TILE, z1: 19 * TILE, y: 44 };

export function buildJiaochangkou() {
  const solids: Solid[] = [], decor: Solid[] = [], climbables: Climbable[] = [], inter: Inter[] = [], props: Prop[] = [];
  const bz0 = BEAM.z - BEAM.w / 2, bz1 = BEAM.z + BEAM.w / 2, bot = BEAM.top - BEAM.depth;
  const ground = (x: number) => tileAt(Math.floor(x / TILE), Math.floor(BEAM.z / TILE))?.h ?? 44;

  // The beam on its piers, a buffer at the east end.
  solids.push(solid(BEAM.west, bot, bz0, BEAM.east, BEAM.top, bz1, MAT.concrete));
  solids.push(solid(BEAM.east - 0.6, BEAM.top, bz0 - 0.2, BEAM.east, BEAM.top + 1.0, bz1 + 0.2, MAT.metal));
  for (let x = BEAM.west + 8; x < BEAM.east; x += 24) {
    const g = ground(x);
    solids.push(solid(x - 0.6, g, BEAM.z - 1.1, x + 0.6, bot - 0.6, BEAM.z + 1.1, MAT.concrete));
    solids.push(solid(x - 0.9, bot - 0.6, BEAM.z - 1.4, x + 0.9, bot, BEAM.z + 1.4, MAT.concrete));
  }

  for (const st of STATIONS) {
    const g = ground((st.x0 + st.x1) / 2), deck = BEAM.top, roof = deck + 4.5;
    // Platforms either side of the beam, a step across from it, railed on their outer edges.
    for (const [z0, z1, outer] of [[bz0 - 5.8, bz0 - 0.3, bz0 - 5.8], [bz1 + 0.3, bz1 + 5.8, bz1 + 5.6]] as const) {
      solids.push(solid(st.x0, deck - 0.4, z0, st.x1, deck, z1, MAT.concrete));
      // Rails, open at the head of the terminus stairs.
      const gap = st === STATIONS[0] && outer > BEAM.z ? [st.x1 - 6.2, st.x1 - 2.8] : null;
      for (const [a, b] of gap ? [[st.x0, gap[0]], [gap[1], st.x1]] : [[st.x0, st.x1]]) solids.push(solid(a, deck, outer, b, deck + 1.1, outer + 0.2, MAT.metal));
      for (let x = st.x0 + 2; x < st.x1; x += 12) solids.push(solid(x, g, outer, x + 0.5, deck - 0.4, outer + 0.5, MAT.concrete));
      // Canopy posts and roof.
      for (let x = st.x0 + 2; x < st.x1; x += 12) solids.push(solid(x, deck, outer, x + 0.25, roof, outer + 0.25, MAT.metal));
    }
    solids.push(solid(st.x0 - 1, roof, bz0 - 6.6, st.x1 + 1, roof + 0.3, bz1 + 6.6, MAT.metal));
    // Maintenance ladders from the road to each platform.
    const lx = st.x0 + 1.2;
    climbables.push({ kind: 'ladder', x: lx, z: bz0 - 5.85, y0: g, y1: deck + 1.1, nx: 0, nz: -1 }, { kind: 'ladder', x: lx, z: bz1 + 5.85, y0: g, y1: deck + 1.1, nx: 0, nz: 1 });
  }

  // The stalled train: a floor a step above the beam, walls and roof, end doors jammed open. The render is the
  // 'train' prop; these are its collision.
  const top = BEAM.top, hw = TRAIN.w / 2, H = MAT.hidden;
  for (let c = 0; c < TRAIN.cars; c++) {
    const x0 = TRAIN.x0 + c * (TRAIN.len + TRAIN.gap), x1 = x0 + TRAIN.len;
    solids.push(solid(x0, top + 0.25, BEAM.z - hw + 0.08, x1, top + 0.4, BEAM.z + hw - 0.08, H));
    for (const z of [BEAM.z - hw, BEAM.z + hw - 0.08]) solids.push(solid(x0, top - 1.2, z, x1, top + 2.95, z + 0.08, H));
    solids.push(solid(x0, top + 2.7, BEAM.z - hw, x1, top + 2.95, BEAM.z + hw, H));
    for (const x of [x0, x1 - 0.08]) {
      solids.push(solid(x, top + 0.4, BEAM.z - hw + 0.08, x + 0.08, top + 2.7, BEAM.z - 0.45, H), solid(x, top + 0.4, BEAM.z + 0.45, x + 0.08, top + 2.7, BEAM.z + hw - 0.08, H));
      solids.push(solid(x, top + 2.3, BEAM.z - 0.45, x + 0.08, top + 2.7, BEAM.z + 0.45, H));
    }
    inter.push({ id: `jck-train${c}`, kind: 'container', x: x0 + 4 + c * 5, y: top + 0.9, z: BEAM.z + 1.0, r: 1.0, zh: '包', en: 'Bag', data: { type: 'bag', loot: 'car' } });
  }
  props.push({ kind: 'train', x: TRAIN.x0 + (TRAIN.cars * (TRAIN.len + TRAIN.gap) - TRAIN.gap) / 2, y: top, z: BEAM.z, yaw: Math.PI / 2, w: TRAIN.cars });

  // Terminus stairs from the plaza up to the south platform, with a landing.
  const term = STATIONS[0], sx = term.x1 - 6;
  stair(sx, bz1 + 5.8, sx + 3, bz1 + 5.8 + 14, PLAZA.y + 4.5, BEAM.top, 4, solids, decor);
  solids.push(solid(sx, PLAZA.y, bz1 + 19.8, sx + 3, PLAZA.y + 4.5, bz1 + 23.8, MAT.concrete));
  stair(sx, bz1 + 23.8, sx + 3, bz1 + 33.8, PLAZA.y, PLAZA.y + 4.5, 4, solids, decor);

  // The junction plaza: a raised planter gone wild, benches, kiosks, a bus shelter, abandoned cars to search.
  const cx = (PLAZA.x0 + PLAZA.x1) / 2, cz = (PLAZA.z0 + PLAZA.z1) / 2, y = PLAZA.y;
  solids.push(solid(cx - 6, y, cz - 6, cx + 6, y + 0.6, cz + 6, MAT.stone));
  decor.push(solid(cx - 5.7, y + 0.6, cz - 5.7, cx + 5.7, y + 0.7, cz + 5.7, MAT.moss));
  for (const [dx, dz] of [[-3, -2], [2, 3], [3, -3], [-2, 2.5]]) {
    decor.push(solid(cx + dx - 0.15, y + 0.6, cz + dz - 0.15, cx + dx + 0.15, y + 4, cz + dz + 0.15, MAT.wood));
    decor.push(solid(cx + dx - 1.6, y + 3.2, cz + dz - 1.6, cx + dx + 1.6, y + 5.2, cz + dz + 1.6, MAT.leaves));
  }
  for (const [dx, dz] of [[-9, 0], [9, 0], [0, 9], [0, -9]]) solids.push(solid(cx + dx - 1, y, cz + dz - 0.25, cx + dx + 1, y + 0.45, cz + dz + 0.25, MAT.wood));
  for (const [kx, kz] of [[PLAZA.x0 + 6, PLAZA.z0 + 8], [PLAZA.x1 - 9, PLAZA.z1 - 10]]) {
    solids.push(solid(kx, y, kz, kx + 2.6, y + 2.6, kz + 2.4, MAT.metal), solid(kx - 0.3, y + 2.6, kz - 0.3, kx + 2.9, y + 2.8, kz + 2.7, MAT.metal));
  }
  // Bus shelter on the plaza's north edge, by the road.
  const bx = PLAZA.x0 + 20, bzs = PLAZA.z0 + 1.5;
  solids.push(solid(bx, y, bzs, bx + 6, y + 2.6, bzs + 0.1, MAT.glass), solid(bx - 0.2, y + 2.6, bzs - 0.2, bx + 6.2, y + 2.8, bzs + 1.8, MAT.metal));
  // Abandoned cars, doors hanging open: searchable.
  [[PLAZA.x0 + 34, PLAZA.z0 + 4, 0], [PLAZA.x0 + 60, PLAZA.z1 - 8, 1], [PLAZA.x1 - 20, PLAZA.z0 + 18, 0]].forEach(([x, z, turn], i) => {
    const [w, d] = turn ? [1.8, 4.3] : [4.3, 1.8];
    solids.push(solid(x, y + 0.25, z, x + w, y + 1.45, z + d, MAT.metal));
    inter.push({ id: `jck-car${i}`, kind: 'container', x: x + w / 2, y: y + 1.0, z: z + d / 2, r: 1.2, zh: '汽车', en: 'Car', data: { type: 'car', loot: 'car' } });
  });
  return { solids, decor, climbables, inter, props };
}
