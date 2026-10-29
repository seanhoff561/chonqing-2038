// Shibati 十八梯 (M3-06): the stair street's terraces lined with two-storey shop houses in grey brick, timber
// posts, shutters and beams under tiled roofs with deep timber eaves; side alleys between them lead back to
// the house blocks.
import { solid, rampSolid, type Solid } from '../geom';
import { MAT } from '../mats';
import { tiles, tileAt, TILE, type Tile } from '../map';
import { DISTRICTS } from '../../data/map';

const SHOP = { back: 0.8, depth: 3.5, floors: [3.2, 2.8], rise: 1.6, eave: 0.5, spans: [[1, 9], [11, 19]] as const };

export function buildShibati(): { solids: Solid[]; decor: Solid[] } {
  const solids: Solid[] = [], decor: Solid[] = [];
  const [c0, r0, c1, r1] = DISTRICTS.find(d => d.id === 'shibati')!.box;
  for (const t of tiles()) {
    if (t.type !== 's' || t.c < c0 || t.c > c1 || t.r < r0 || t.r > r1) continue;
    const n = tileAt(t.c, t.r - 1), s = tileAt(t.c, t.r + 1), w = tileAt(t.c - 1, t.r), e = tileAt(t.c + 1, t.r);
    const alongZ = Math.abs((n?.h ?? t.h) - (s?.h ?? t.h)) >= Math.abs((w?.h ?? t.h) - (e?.h ?? t.h));
    const [a, b] = alongZ ? [n, s] : [w, e];
    // The terraces either side of the flight sit at the tile's high level (see stairStreet in terrain.ts).
    const high = Math.max((t.h + (a?.h ?? t.h)) / 2, (t.h + (b?.h ?? t.h)) / 2);
    for (const side of [-1, 1]) for (const [u0, u1] of SHOP.spans) shopHouse(t, alongZ, side, u0, u1, high, solids, decor);
  }
  return { solids, decor };
}

/** One shop house on a terrace, its front facing the flight. u runs along the street, v across it. */
function shopHouse(t: Tile, alongZ: boolean, side: number, u0: number, u1: number, base: number, solids: Solid[], decor: Solid[]) {
  const ox = t.c * TILE, oz = t.r * TILE;
  // v measured from the tile's edge on this side toward the flight; the front is at v = back + depth.
  const vAt = (v: number) => (side < 0 ? v : TILE - v);
  const B = (ua: number, y0: number, va: number, ub: number, y1: number, vb: number, mat: number) => {
    const [p, q] = [vAt(va), vAt(vb)];
    return alongZ ? solid(ox + p, y0, oz + ua, ox + q, y1, oz + ub, mat) : solid(ox + ua, y0, oz + p, ox + ub, y1, oz + q, mat);
  };
  const v0 = SHOP.back, v1 = SHOP.back + SHOP.depth, wall = base + SHOP.floors[0] + SHOP.floors[1];
  solids.push(B(u0, base, v0, u1, wall, v1, MAT.brick));
  // Tiled roof, ridge along the street, eave plate solid all round and deep over the shopfront.
  const vm = (v0 + v1) / 2;
  const ramp = (va: number, vb: number, risingToFront: boolean) => {
    const [p, q] = [vAt(va), vAt(vb)];
    const lo = Math.min(p, q), hi = Math.max(p, q);
    // Which world direction the slope rises toward.
    const towardPlus = risingToFront === (side < 0);
    const dir = (alongZ ? (towardPlus ? 1 : 2) : towardPlus ? 3 : 4) as 1 | 2 | 3 | 4;
    solids.push(alongZ ? rampSolid(ox + lo, wall, oz + u0, ox + hi, oz + u1, wall, wall + SHOP.rise, dir, MAT.roofTile)
      : rampSolid(ox + u0, wall, oz + lo, ox + u1, oz + hi, wall, wall + SHOP.rise, dir, MAT.roofTile));
  };
  ramp(v0, vm, true);
  ramp(vm, v1, false);
  solids.push(B(u0 - 0.3, wall - 0.12, v0 - 0.3, u1 + 0.3, wall, v1 + SHOP.eave, MAT.wood));
  // Shopfront: timber posts, a beam, shutters between the posts; lattice windows upstairs.
  const f = v1, bays = Math.max(2, Math.round((u1 - u0) / 2));
  const bay = (u1 - u0) / bays;
  for (let i = 0; i <= bays; i++) {
    const u = u0 + i * bay;
    decor.push(B(Math.max(u0, u - 0.08), base, f - 0.02, Math.min(u1, u + 0.08), base + SHOP.floors[0], f + 0.12, MAT.wood));
  }
  decor.push(B(u0, base + SHOP.floors[0] - 0.25, f - 0.02, u1, base + SHOP.floors[0], f + 0.14, MAT.wood));
  for (let i = 0; i < bays; i++) {
    const ua = u0 + i * bay + 0.1, ub = ua + bay - 0.2;
    decor.push(B(ua, base + 0.1, f - 0.02, ub, base + SHOP.floors[0] - 0.35, f + 0.04, MAT.wood));
    if (i % 2 === 0) decor.push(B(ua + bay * 0.2, base + SHOP.floors[0] + 0.8, f - 0.02, ub - bay * 0.2, base + SHOP.floors[0] + 2.0, f + 0.05, MAT.wood));
  }
}
