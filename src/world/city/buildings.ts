// The ordinary city fabric: building tiles split into lots with alleys, masses by kind and district,
// parapets, pitched roofs in Shibati, roof clutter, and hillside roofs flush with the street above.
import { solid, rampSolid, type Solid } from '../geom';
import { MAT } from '../mats';
import { tiles, tileAt, TILE, type Tile } from '../map';
import { makeRng, rand, randInt, hashString, type Rng } from '../../sim/rng';
import type { Prop } from '../world';

export type LotKind = 'res' | 'tower' | 'trad';
export interface Lot { id: number; x0: number; z0: number; x1: number; z1: number; base: number; top: number; wall: number; kind: LotKind; tile: Tile; mat: number }
export interface Fabric { solids: Solid[]; decor: Solid[]; props: Prop[]; lots: Lot[] }

const FLOOR = 3;
const STREETS = '.=sb';
const BUILT = '#Th';

export const tileRng = (t: Tile, salt = '') => makeRng(hashString(`cq2038:${t.c}:${t.r}:${salt}`));

/** Split a tile into 1, 2 or 4 lots with alleys; margins toward neighbours make the alleys between tiles. */
function splitTile(t: Tile, r: Rng): [number, number, number, number][] {
  const x0 = t.c * TILE, z0 = t.r * TILE;
  const m = (dc: number, dr: number) => (BUILT.includes(tileAt(t.c + dc, t.r + dr)?.type ?? '~') ? 1.25 : 1.0);
  const L = x0 + m(-1, 0), R = x0 + TILE - m(1, 0), N = z0 + m(0, -1), S = z0 + TILE - m(0, 1);
  const kind = t.type;
  if (kind === 'h') {
    const xm = (L + R) / 2, zm = (N + S) / 2;
    return [[L, N, xm - 1, zm - 1], [xm + 1, N, R, zm - 1], [L, zm + 1, xm - 1, S], [xm + 1, zm + 1, R, S]];
  }
  const pattern = kind === 'T' ? (rand(r) < 0.6 ? 1 : 2) : [1, 2, 2, 4][randInt(r, 4)];
  const gap = kind === 'T' ? 3 + rand(r) : 1.6 + rand(r) * 1.6;
  const f = 0.4 + rand(r) * 0.2;
  if (pattern === 1) return [[L, N, R, S]];
  const xm = L + (R - L) * f, zm = N + (S - N) * f;
  if (pattern === 2) return rand(r) < 0.5 ? [[L, N, xm - gap / 2, S], [xm + gap / 2, N, R, S]] : [[L, N, R, zm - gap / 2], [L, zm + gap / 2, R, S]];
  return [[L, N, xm - gap / 2, zm - gap / 2], [xm + gap / 2, N, R, zm - gap / 2], [L, zm + gap / 2, xm - gap / 2, S], [xm + gap / 2, zm + gap / 2, R, S]];
}

/** Highest neighbouring street level, for roofs that sit flush with the street above. */
function upperStreet(t: Tile): number {
  let h = -Infinity;
  for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const o = tileAt(t.c + dc, t.r + dr);
    if (o && STREETS.includes(o.type)) h = Math.max(h, o.h);
  }
  return h;
}

export function buildFabric(): Fabric {
  const out: Fabric = { solids: [], decor: [], props: [], lots: [] };
  for (const t of tiles()) {
    if (!BUILT.includes(t.type)) continue;
    const r = tileRng(t);
    const kind: LotKind = t.type === 'T' ? 'tower' : t.type === 'h' ? 'trad' : 'res';
    const up = upperStreet(t);
    // Shibati rows share one height so their ridges line up into rooftop routes.
    const tradFloors = 2 + (t.r % 3 === 0 ? 1 : 0);
    for (const [x0, z0, x1, z1] of splitTile(t, r)) {
      let wall: number;
      if (kind === 'trad') wall = t.h + tradFloors * FLOOR;
      else if (kind === 'tower') wall = t.h + (15 + randInt(r, 21)) * 3.3;
      else wall = t.h + (4 + randInt(r, 6)) * FLOOR;
      // Hillside block whose roof is the street above (the Kuixinglou effect).
      if (kind === 'res' && up - t.h >= 6 && rand(r) < 0.5) wall = up;
      const mat = kind === 'tower' ? MAT.glass : kind === 'trad' ? MAT.plaster : [MAT.tile, MAT.plaster, MAT.tile, MAT.concrete][randInt(r, 4)];
      const lot: Lot = { id: out.lots.length, x0, z0, x1, z1, base: t.h, wall, top: wall, kind, tile: t, mat };
      out.lots.push(lot);
      mass(lot, r, out);
    }
  }
  return out;
}

function mass(l: Lot, r: Rng, out: Fabric) {
  const { x0, z0, x1, z1, base, wall } = l;
  out.solids.push(solid(x0, base, z0, x1, wall, z1, l.mat));
  if (l.kind === 'trad') {
    // Pitched tiled roof: ridges run along the row (the hill's contour), so a row of houses lines up into a
    // rooftop route; eaves overhang as decor.
    const rise = 2;
    if (x1 - x0 >= (z1 - z0) * 0.7) {
      const zm = (z0 + z1) / 2;
      out.solids.push(rampSolid(x0, wall, z0, x1, zm, wall, wall + rise, 3, MAT.roofTile), rampSolid(x0, wall, zm, x1, z1, wall, wall + rise, 4, MAT.roofTile));
    } else {
      const xm = (x0 + x1) / 2;
      out.solids.push(rampSolid(x0, wall, z0, xm, z1, wall, wall + rise, 1, MAT.roofTile), rampSolid(xm, wall, z0, x1, z1, wall, wall + rise, 2, MAT.roofTile));
    }
    out.decor.push(solid(x0 - 0.4, wall - 0.12, z0 - 0.4, x1 + 0.4, wall, z1 + 0.4, MAT.wood));
    l.top = wall + rise;
    return;
  }
  // Parapet: a lip to grab from the facade and a low wall on the roof.
  const p = 0.9, w = 0.2;
  out.solids.push(
    solid(x0, wall, z0, x1, wall + p, z0 + w, MAT.concrete), solid(x0, wall, z1 - w, x1, wall + p, z1, MAT.concrete),
    solid(x0, wall, z0 + w, x0 + w, wall + p, z1 - w, MAT.concrete), solid(x1 - w, wall, z0 + w, x1, wall + p, z1 - w, MAT.concrete),
  );
  l.top = wall + p;
  // Roof clutter: water tanks on stilts, AC condensers, sometimes a stairwell hut.
  const n = 1 + randInt(r, 3);
  for (let i = 0; i < n; i++) {
    const cx = x0 + 1.5 + rand(r) * Math.max(0.1, x1 - x0 - 3), cz = z0 + 1.5 + rand(r) * Math.max(0.1, z1 - z0 - 3);
    const k = randInt(r, 3);
    if (k === 0) { out.solids.push(solid(cx - 1, wall + 0.6, cz - 1, cx + 1, wall + 2.2, cz + 1, MAT.metal)); out.props.push({ kind: 'stilts', x: cx, y: wall, z: cz, yaw: 0, w: 2, h: 0.6 }); }
    else if (k === 1) out.solids.push(solid(cx - 0.5, wall, cz - 0.35, cx + 0.5, wall + 0.7, cz + 0.35, MAT.metal));
    else if (x1 - x0 > 6 && z1 - z0 > 6) out.solids.push(solid(cx - 1.3, wall, cz - 1.3, cx + 1.3, wall + 2.6, cz + 1.3, MAT.concrete));
  }
}
