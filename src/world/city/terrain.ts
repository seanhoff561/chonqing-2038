// Ground from the tile map: terraces at each tile's level with stone retaining walls between them,
// a surface layer per tile type, river beds and water, and stair flights where streets change level.
import { solid, rampSolid, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { tiles, tileAt, TILE, type Tile } from '../map';

export const BEDROCK = -20;
const STREETS = '.=sb';
const isStreet = (t: Tile | null) => !!t && STREETS.includes(t.type);

const surfaceMat: Record<string, number> = { '.': MAT.stone, '=': MAT.asphalt, s: MAT.stone, b: MAT.concrete, '#': MAT.concrete, T: MAT.tile, h: MAT.stone, X: MAT.concrete, p: MAT.moss, W: MAT.concrete };

export interface Terrain { solids: Solid[]; decor: Solid[]; water: Box[] }

/** Visible steps over a ramp: render-only boxes filling under the slope. */
export function stepsFor(r: Solid, out: Solid[], mat: number = MAT.stone) {
  const rise = r.y1 - r.low, n = Math.max(1, Math.round(rise / 0.18));
  const along = r.ramp <= 2 ? r.x1 - r.x0 : r.z1 - r.z0;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * along, b = ((i + 1) / n) * along, top = r.low + ((i + 1) / n) * rise;
    // Distance a..b measured from the low end.
    let s: Solid;
    switch (r.ramp) {
      case 1: s = solid(r.x0 + a, r.y0, r.z0, r.x0 + b, top, r.z1, mat); break;
      case 2: s = solid(r.x1 - b, r.y0, r.z0, r.x1 - a, top, r.z1, mat); break;
      case 3: s = solid(r.x0, r.y0, r.z0 + a, r.x1, top, r.z0 + b, mat); break;
      default: s = solid(r.x0, r.y0, r.z1 - b, r.x1, top, r.z1 - a, mat);
    }
    out.push(s);
  }
}

/** A stair flight: an invisible ramp for walking plus visible steps. */
export function stair(x0: number, z0: number, x1: number, z1: number, low: number, high: number, dir: 1 | 2 | 3 | 4, solids: Solid[], decor: Solid[]) {
  const r = rampSolid(x0, low - 0.5, z0, x1, z1, low, high, dir, MAT.hidden);
  solids.push(r);
  stepsFor(r, decor);
}

export function buildTerrain(): Terrain {
  const solids: Solid[] = [], decor: Solid[] = [], water: Box[] = [];
  const all = tiles();
  // Ground columns, merged along each row where level and type match.
  for (let r = 0; r < 35; r++) {
    let run: Tile | null = null, start = 0;
    const flush = (end: number) => {
      if (!run) return;
      const x0 = start * TILE, x1 = end * TILE, z0 = r * TILE, z1 = z0 + TILE;
      if (run.type === '~') {
        solids.push(solid(x0, BEDROCK, z0, x1, -4, z1, MAT.stone));
        water.push({ x0, y0: -4, z0, x1, y1: 0, z1 });
      } else if (run.type !== 's') {
        solids.push(solid(x0, BEDROCK, z0, x1, run.h - 0.15, z1, MAT.stone));
        solids.push(solid(x0, run.h - 0.15, z0, x1, run.h, z1, surfaceMat[run.type] ?? MAT.concrete));
      }
    };
    for (let c = 0; c < 70; c++) {
      const t = all[r * 70 + c];
      if (!run || t.type !== run.type || t.h !== run.h) { flush(c); run = t; start = c; }
    }
    flush(70);
  }
  for (const t of all) {
    if (t.type === 's') stairStreet(t, solids, decor);
    else if (isStreet(t) || t.type === 'X') levelStairs(t, solids, decor);
  }
  return { solids, decor, water };
}

/** A stair-street tile: a 6 m wide stair down the middle between its low and high neighbours, terraces either side. */
function stairStreet(t: Tile, solids: Solid[], decor: Solid[]) {
  const x0 = t.c * TILE, z0 = t.r * TILE, x1 = x0 + TILE, z1 = z0 + TILE;
  const n = tileAt(t.c, t.r - 1), s = tileAt(t.c, t.r + 1), w = tileAt(t.c - 1, t.r), e = tileAt(t.c + 1, t.r);
  const dz = Math.abs((n?.h ?? t.h) - (s?.h ?? t.h)), dx = Math.abs((w?.h ?? t.h) - (e?.h ?? t.h));
  const alongZ = dz >= dx;
  const [a, b] = alongZ ? [n, s] : [w, e];
  // Edge heights meet the neighbours halfway so consecutive stair tiles join up.
  const ha = (t.h + (a?.h ?? t.h)) / 2, hb = (t.h + (b?.h ?? t.h)) / 2;
  const low = Math.min(ha, hb), high = Math.max(ha, hb);
  const mid0 = (alongZ ? x0 : z0) + 7, mid1 = mid0 + 6;
  solids.push(solid(x0, BEDROCK, z0, x1, low - 0.05, z1, MAT.stone));
  // Terraces either side of the flight at the high end's level.
  if (alongZ) { solids.push(solid(x0, low - 0.05, z0, mid0, high, z1, MAT.stone), solid(mid1, low - 0.05, z0, x1, high, z1, MAT.stone)); }
  else { solids.push(solid(x0, low - 0.05, z0, x1, high, mid0, MAT.stone), solid(x0, low - 0.05, mid1, x1, high, z1, MAT.stone)); }
  if (high - low < 0.05) { solids.push(alongZ ? solid(mid0, low - 0.05, z0, mid1, low, z1, MAT.stone) : solid(x0, low - 0.05, mid0, x1, low, mid1, MAT.stone)); return; }
  // Rising toward the higher neighbour, in two flights with a landing halfway (M3-06).
  const dir: 1 | 2 | 3 | 4 = alongZ ? (ha > hb ? 4 : 3) : (ha > hb ? 2 : 1);
  const up = dir === 1 || dir === 3, mid = (low + high) / 2;
  const p0 = alongZ ? z0 : x0, p1 = p0 + 8, p2 = p0 + 12, p3 = p0 + TILE;
  const flight = (a: number, b: number, lo: number, hi: number) =>
    alongZ ? stair(mid0, a, mid1, b, lo, hi, dir, solids, decor) : stair(a, mid0, b, mid1, lo, hi, dir, solids, decor);
  flight(p0, p1, up ? low : mid, up ? mid : high);
  flight(p2, p3, up ? mid : low, up ? high : mid);
  solids.push(alongZ ? solid(mid0, low - 0.05, p1, mid1, mid, p2, MAT.stone) : solid(p1, low - 0.05, mid0, p2, mid, mid1, MAT.stone));
}

/** Between level streets (and set pieces) that differ in height: a 4 m flight in the lower tile against the edge. */
function levelStairs(t: Tile, solids: Solid[], decor: Solid[]) {
  const x0 = t.c * TILE, z0 = t.r * TILE;
  for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
    const o = tileAt(t.c + dc, t.r + dr);
    if (!o || !isStreet(o) || o.type === 's') continue;
    const dh = o.h - t.h;
    if (dh <= 0.45 || dh > 16) continue; // only from the lower side; cliffs stay walls
    const len = Math.min(TILE - 2, dh / Math.tan((dh > 10 ? 40 : 33) * Math.PI / 180));
    const cx = x0 + TILE / 2, cz = z0 + TILE / 2, hw = 2;
    if (dr === -1) stair(cx - hw, z0, cx + hw, z0 + len, t.h, o.h, 4, solids, decor);
    else if (dr === 1) stair(cx - hw, z0 + TILE - len, cx + hw, z0 + TILE, t.h, o.h, 3, solids, decor);
    else if (dc === 1) stair(x0 + TILE - len, cz - hw, x0 + TILE, cz + hw, t.h, o.h, 1, solids, decor);
    else stair(x0, cz - hw, x0 + len, cz + hw, t.h, o.h, 2, solids, decor);
  }
}
