// Where Yuzhong's buildings stand (M3-41b, D-016): every OSM footprint as a fitted turned rectangle with its
// real height, then rows of infill lots along each street where OSM has no buildings, fronting the street with
// alleys between them. Each lot's ground is levelled to its base: the street-front height, so doors meet the
// street and the slope behind becomes a retaining wall or a buried lower floor.
import type { Heightfield } from '../heightfield';
import { GEO } from '../geo';
import { makeRng, hashString, rand, randInt } from '../../sim/rng';
import { MAT } from '../mats';
import type { LotKind } from '../city/buildings';
import { onGround, WATER_Y, streetCells, type Street } from './ground';
import { minRect, obbOverlap, segNearObb, segDist, points, polyArea, corners, rasterPoly, type Obb, type P2 } from './shapes';

export interface Plan {
  obb: Obb; base: number; wall: number; kind: LotKind; mat: number; seed: string;
  /** which of the lot's own sides (north, south, west, east before turning) face a street */
  street: [boolean, boolean, boolean, boolean];
  across: [number, number, number, number];
  osm: boolean; name: string;
  /** on the far bank: drawn but not built for play */
  far: boolean;
  /** the ground round it rises above its base (a higher street beside it): solid only, never hollowed */
  noEnter?: boolean;
  /** the district it stands in, and whether that was a crowded centre now gone cyberpunk (U-011, U-020) */
  district: string; cyber: boolean;
}

/** Districts round the landmarks, nearest first within their reach; the old crowded centres are cyberpunk. */
const DISTRICTS: [string, number, boolean][] = [['jiefangbei', 380, true], ['jiaochangkou', 200, true], ['hongyadong', 170, true], ['xiaoshizi', 220, true], ['chaotianmen', 320, false], ['shibati', 160, false]];
export function districtAt(x: number, z: number): { district: string; cyber: boolean } {
  let best = { district: 'yuzhong', cyber: false }, bd = Infinity;
  for (const [k, reach, cyber] of DISTRICTS) {
    const L = GEO.landmarks[k], d = Math.hypot(L.x - x, L.z - z);
    if (d < reach && d < bd) { bd = d; best = { district: k, cyber }; }
  }
  return best;
}

/** APRON: the gap kept round each lot (half an alley); LEVEL: how far round it the ground is levelled, more than a
 *  ground cell's diagonal so its edges never lean on unlevelled ground. */
const FLOOR = 3, APRON = 1.5, LEVEL = 3;
const MAIN = new Set(['trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service', 'pedestrian']);

interface Seg { ax: number; az: number; bx: number; bz: number; half: number; s: Street }

/** A coarse hash of things by 40 m cell, for neighbour queries. */
class Hash<T> {
  private m = new Map<number, T[]>();
  add(x0: number, z0: number, x1: number, z1: number, v: T) {
    for (let i = Math.floor(x0 / 40); i <= Math.floor(x1 / 40); i++) for (let j = Math.floor(z0 / 40); j <= Math.floor(z1 / 40); j++) {
      const k = i * 4096 + j; let a = this.m.get(k); if (!a) this.m.set(k, (a = [])); a.push(v);
    }
  }
  near(x0: number, z0: number, x1: number, z1: number): Set<T> {
    const out = new Set<T>();
    for (let i = Math.floor(x0 / 40); i <= Math.floor(x1 / 40); i++) for (let j = Math.floor(z0 / 40); j <= Math.floor(z1 / 40); j++) for (const v of this.m.get(i * 4096 + j) ?? []) out.add(v);
    return out;
  }
}

const bounds = (o: Obb, pad = 0) => { const c = corners(o); const xs = c.map(p => p[0]), zs = c.map(p => p[1]); return [Math.min(...xs) - pad, Math.min(...zs) - pad, Math.max(...xs) + pad, Math.max(...zs) + pad] as const; };

/** land: per heightfield cell, 1 on the peninsula (reachable on foot from Jiefangbei), 2 on a far bank. */
export function planLots(g: Heightfield, sts: Street[], land: Uint8Array): Plan[] {
  const segs = new Hash<Seg>(), plans: Plan[] = [], placed = new Hash<Plan>();
  for (const s of sts) {
    if (!onGround(s)) continue;
    const half = s.w / 2 + (MAIN.has(s.kind) ? 1.5 : 0.4);
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], seg = { ax, az, bx, bz, half, s };
      segs.add(Math.min(ax, bx) - half, Math.min(az, bz) - half, Math.max(ax, bx) + half, Math.max(az, bz) + half, seg);
    }
  }
  // Parks, pitches and plazas stay open.
  const open = new Uint8Array(g.y.length);
  for (const [kind, , p] of GEO.areas) if (kind === 'park' || kind === 'pitch' || kind === 'pier') rasterPoly(points(p, 0.1), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => open.fill(1, j * g.w + i0, j * g.w + i1 + 1));
  const cellAt = (x: number, z: number) => Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)));
  const hAt = (x: number, z: number) => g.y[cellAt(x, z)];
  const [W, H] = [(g.w - 1) * g.cell, (g.h - 1) * g.cell];
  const onLand = (o: Obb) => [...corners(o), [o.cx, o.cz] as P2].every(([x, z]) => { if (x < LEVEL || z < LEVEL || x > W - LEVEL || z > H - LEVEL) return false; const k = cellAt(x, z); return land[k] === land[cellAt(o.cx, o.cz)] && land[k] > 0 && !open[k] && g.y[k] > WATER_Y + 1; });
  const hitsStreet = (o: Obb, pad: number, skip?: Street) => {
    const [x0, z0, x1, z1] = bounds(o, 20);
    for (const sg of segs.near(x0, z0, x1, z1)) if (sg.s !== skip && segNearObb(o, sg.ax, sg.az, sg.bx, sg.bz, sg.half + pad)) return true;
    return false;
  };
  const hitsRoad = (o: Obb) => {
    const [x0, z0, x1, z1] = bounds(o, 20);
    for (const sg of segs.near(x0, z0, x1, z1)) if (MAIN.has(sg.s.kind) && segNearObb(o, sg.ax, sg.az, sg.bx, sg.bz, sg.s.w / 2 - 0.5)) return true;
    return false;
  };
  const hitsLot = (o: Obb, pad: number) => { const [x0, z0, x1, z1] = bounds(o, 2); for (const p of placed.near(x0, z0, x1, z1)) if (obbOverlap(o, p.obb, pad)) return true; return false; };
  const add = (p: Plan) => { plans.push(p); const [x0, z0, x1, z1] = bounds(p.obb); placed.add(x0, z0, x1, z1, p); };
  const sideStreets = (o: Obb): Plan['street'] => {
    const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
    const mids: P2[] = [[0, -o.hd - 3], [0, o.hd + 3], [-o.hw - 3, 0], [o.hw + 3, 0]].map(([u, v]) => [o.cx + c * u - s * v, o.cz + s * u + c * v]);
    return mids.map(([x, z]) => { for (const sg of segs.near(x - 10, z - 10, x + 10, z + 10)) if (segDist(x, z, sg.ax, sg.az, sg.bx, sg.bz) < sg.half + 3) return true; return false; }) as Plan['street'];
  };
  const shibati = GEO.areas.find(a => a[1] === '重庆十八梯传统风貌区');
  const inShibati = (x: number, z: number) => !!shibati && inside(points(shibati[2], 0.1), x, z);

  // OSM buildings first, at their real heights.
  GEO.buildings.forEach(([levels, hdm, kind, name, p], n) => {
    const pts = points(p, 0.1), o = minRect(pts), area = polyArea(pts);
    if (area < 25 || o.hw > 120 || o.hd > 120) return;
    const k = cellAt(o.cx, o.cz);
    if (!land[k] || g.y[k] < WATER_Y || corners(o).some(([x, z]) => x < LEVEL || z < LEVEL || x > W - LEVEL || z > H - LEVEL)) return;
    // A footprint across a roadway is bad data or a building over a passage: the street wins.
    if (hitsRoad(o)) return;
    const r = makeRng(hashString(`osm${n}`)), far = land[k] === 2;
    const floors = levels || (hdm ? Math.max(1, Math.round(hdm / 10 / 3.2)) : area > 1500 ? 12 + randInt(r, 25) : area > 400 ? 6 + randInt(r, 18) : 3 + randInt(r, 6));
    const trad = !far && inShibati(o.cx, o.cz) && floors <= 3;
    // By type: towers over 20 floors; offices, hotels, shops and malls in gridded stone or glass; homes in tile
    // and render; old houses in brick.
    const business = ['commercial', 'retail', 'office', 'hotel', 'theatre', 'transportation'].includes(kind);
    const tower = floors > 20 || (business && floors > 10);
    const street = sideStreets(o);
    const front = street.findIndex(Boolean);
    const base = front >= 0 ? edgeHeight(o, front, hAt) : Math.min(...[...corners(o), [o.cx, o.cz] as P2].map(([x, z]) => hAt(x, z)));
    const mat = tower ? MAT.glass : trad ? MAT.brick : business ? MAT.facadeBand : kind === 'historic' || kind === 'temple' ? MAT.brick : [MAT.tile, MAT.plaster, MAT.concrete, MAT.tile][randInt(r, 4)];
    add({ obb: o, base, wall: base + floors * (tower ? 3.3 : business ? 4 : FLOOR), kind: trad ? 'trad' : tower ? 'tower' : 'res', mat, seed: `osm${n}`, street, across: [0, 0, 0, 0], osm: true, name, far, noEnter: business, ...districtAt(o.cx, o.cz) });
  });

  // Infill: rows along every street, main streets first, fronting the street, alleys between.
  const order = sts.filter(s => onGround(s) && s.pts.length > 1).sort((a, b) => Number(MAIN.has(b.kind)) - Number(MAIN.has(a.kind)));
  order.forEach((s, si) => {
    const r = makeRng(hashString(`row${si}`)), half = s.w / 2 + (MAIN.has(s.kind) ? 1.5 : 0.4);
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], len = Math.hypot(bx - ax, bz - az);
      if (len < 9) continue;
      const th = Math.atan2(bz - az, bx - ax), ux = (bx - ax) / len, uz = (bz - az) / len;
      for (const side of [1, -1]) {
        // Lots on the left of the street (side 1) look back across it: their own +z faces the street.
        const yaw = side === 1 ? th + Math.PI : th, nx = -uz * side, nz = ux * side;
        for (let t = 3 + rand(r) * 2; t < len - 6;) {
          const f = (MAIN.has(s.kind) ? 11 : 7) + rand(r) * (MAIN.has(s.kind) ? 14 : 9);
          if (t + f > len - 2) break;
          let ok: Obb | null = null;
          for (const d of [22, 16, 12, 8]) {
            const off = half + 0.6 + d / 2, cx = ax + ux * (t + f / 2) + nx * off, cz = az + uz * (t + f / 2) + nz * off;
            const o = { cx, cz, hw: f / 2, hd: d / 2, yaw };
            if (onLand(o) && !hitsStreet(o, 0.4) && !hitsLot(o, APRON)) { ok = o; break; }
          }
          if (ok) {
            const n = plans.length, rr = makeRng(hashString(`lot${n}`)), far = land[cellAt(ok.cx, ok.cz)] === 2;
            const base = edgeHeight(ok, 1, hAt), dist = districtAt(ok.cx, ok.cz);
            // The crowded centres build up: shops below, offices and flats above; elsewhere walk-ups and the odd slab.
            const floors = MAIN.has(s.kind) ? 4 + randInt(rr, 8) + (rand(rr) < (dist.cyber ? 0.35 : 0.15) ? 12 + randInt(rr, 14) : 0) : 2 + randInt(rr, 6);
            const trad = !far && inShibati(ok.cx, ok.cz), shop = dist.cyber && MAIN.has(s.kind) && rand(rr) < 0.4;
            add({ obb: ok, base, wall: base + (trad ? 2 + randInt(rr, 2) : floors) * FLOOR, kind: trad ? 'trad' : 'res', mat: trad ? MAT.brick : shop ? MAT.facadeBand : [MAT.tile, MAT.plaster, MAT.tile, MAT.concrete][randInt(rr, 4)], seed: `lot${n}`, street: [false, true, false, false], across: [0, s.w + 3, 0, 0], osm: false, name: '', far, noEnter: shop || undefined, ...dist });
          }
          t += f + 1.6 + rand(r) * 1.6;
        }
      }
    }
  });
  return plans;
}

/** After levelling: only lots on level ground can be hollowed: none rising round them (a higher street left
 *  beside one would lean into its ground floor) and none dipping under them (a lower neighbour's shared wall). */
export function markEnterable(g: Heightfield, plans: Plan[]) {
  for (const p of plans) {
    let hi = -Infinity, lo = Infinity;
    rasterPoly(corners({ ...p.obb, hw: p.obb.hw + LEVEL, hd: p.obb.hd + LEVEL }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) hi = Math.max(hi, g.y[k]); });
    rasterPoly(corners({ ...p.obb, hw: p.obb.hw + g.cell * 1.5, hd: p.obb.hd + g.cell * 1.5 }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) lo = Math.min(lo, g.y[k]); });
    // A sloping street in front may lean a corner by a hand's breadth, no more.
    if (hi > p.base + 0.25 || lo < p.base - 0.25) p.noEnter = true;
  }
}

/** Ground height at the middle of one of the lot's own sides (0 north, 1 south, 2 west, 3 east). */
function edgeHeight(o: Obb, side: number, hAt: (x: number, z: number) => number): number {
  const c = Math.cos(o.yaw), s = Math.sin(o.yaw), [u, v] = [[0, -o.hd], [0, o.hd], [-o.hw, 0], [o.hw, 0]][side];
  return hAt(o.cx + c * u - s * v, o.cz + s * u + c * v);
}

function inside(poly: P2[], x: number, z: number): boolean {
  let n = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) n = !n;
  }
  return n;
}

/** Level the ground round each lot (an apron) and then under it to the lot's base; footprints win over aprons,
 *  and where neighbours overlap the lower base wins, so the ground never rises into a building (its foundation
 *  covers the step down at a shared wall). */
export function levelLots(g: Heightfield, plans: Plan[]) {
  const order = [...plans].sort((a, b) => b.base - a.base);
  for (const pad of [LEVEL, 0.3]) for (const p of order) {
    const o = { ...p.obb, hw: p.obb.hw + pad, hd: p.obb.hd + pad };
    // Aprons stop at the street's surface; footprints take everything under them.
    rasterPoly(corners(o), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) if (pad < LEVEL || !streetCells[k]) g.y[k] = p.base; });
  }
}
