// Where Yuzhong's buildings stand (M3-41b, D-016): every OSM footprint as a fitted turned rectangle with its
// real height, then rows of infill lots along each street where OSM has no buildings, fronting the street with
// alleys between them. Each lot's ground is levelled to its base: the street-front height, so doors meet the
// street and the slope behind becomes a retaining wall or a buried lower floor.
import { heightAt, type Heightfield } from '../heightfield';
import { GEO } from '../geo';
import { makeRng, hashString, rand, randInt, type Rng } from '../../sim/rng';
import { ENVELOPE as E } from '../../data/envelope';
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
  /** a cache reached only with a tool (M3-37, U-037): no holds on it, nothing joining it */
  sheer?: boolean;
  /** a climbing line up one of its sides from a neighbour's roof (vertical.ts, U-032) */
  /** a tower's skyline: the highest roof within 25 m of it (U-036) */
  sky?: number;
  /** its walls run straight up to its roof (a connection meets them, vertical.ts, crossings.ts): no stepped top,
   *  no tower's shaft set back from its podium (M3-81) */
  edge?: boolean;
  /** its roof kept clear, a rooftop route running over it (Shibati's terraces): nothing on it, never hollowed */
  bare?: boolean;
  /** an old house's pitched tile roof (Shibati's terraces, M3-35) */
  pitched?: boolean;
  /** the district it stands in, and whether that was a crowded centre now gone cyberpunk (U-011, U-020) */
  district: string; cyber: boolean;
  /** infill: the row along one side of one street segment it stands in, in order along the street */
  row?: string;
  /** the floor counts its height may take (unknown or loosely known heights), for joining roofs into routes */
  flex?: [number, number];
}

/** Each district's name, Chinese and English, for the journal and the map. */
export const DISTRICT_NAMES: Record<string, [string, string]> = {
  jiefangbei: ['解放碑', 'Jiefangbei'], jiaochangkou: ['较场口', 'Jiaochangkou'], hongyadong: ['洪崖洞', 'Hongyadong'], xiaoshizi: ['小什字', 'Xiaoshizi'],
  chaotianmen: ['朝天门', 'Chaotianmen'], shibati: ['十八梯', 'Shibati'], yuzhong: ['渝中', 'Yuzhong'],
};

/** Shibati's quarter as in the references (M3-35): what isn't on the map there is an old house, three or four floors
 *  of grey brick or render under a pitched tile roof (not those in `keep`: the caches the grappling hook reaches and
 *  what's round them, chosen at their heights). */
export function oldQuarter(plans: Plan[], keep: Set<Plan>) {
  for (const p of plans) {
    if (p.osm || p.far || p.kind !== 'res' || p.pitched || keep.has(p) || districtAt(p.obb.cx, p.obb.cz).district !== 'shibati') continue;
    const rr = makeRng(hashString(`${p.seed}:old`));
    Object.assign(p, { wall: p.base + (3 + randInt(rr, 2)) * FLOOR, flex: [3, 4], pitched: true, mat: rand(rr) < 0.4 ? MAT.brick : MAT.plaster });
  }
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

/** APRON: the gap kept round each lot (half the narrowest alley: obbOverlap pads both); LEVEL: how far round it the ground is levelled, more than a
 *  ground cell's diagonal so its edges never lean on unlevelled ground. */
const FLOOR = 3, APRON = 0.75, LEVEL = 3;
/** The gap to the next lot along a row (M3-57, U-023): mostly an alley a standing jump across, one in five a
 *  running jump (up to its longest), one in ten a wall-run (a billboard spans it, vertical.ts). */
const rowGap = (r: Rng) => {
  const k = rand(r);
  return k < 0.7 ? 1.6 + rand(r) * (E.standingJump.max - 1.65) : k < 0.9 ? 4 + rand(r) * (E.runningJump.max - 4.05) : E.runningJump.max + 1.5 + rand(r) * (E.wallRun.comfortable - E.runningJump.max - 2.5);
};
/** How far the street outside may lean from a building's floor for a landing to level it off. */
const LANDING = 1.2;
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

/** land: per heightfield cell, 1 on the peninsula (reachable on foot from Jiefangbei), 2 on a far bank; block: 1
 *  where the set pieces (tunnel stairways, the grate, the construction site, the monorail) keep lots away. */
export function planLots(g: Heightfield, sts: Street[], land: Uint8Array, block = new Uint8Array(g.y.length)): Plan[] {
  const segs = new Hash<Seg>(), plans: Plan[] = [], placed = new Hash<Plan>();
  for (const s of sts) {
    if (!onGround(s)) continue;
    const half = s.w / 2 + (MAIN.has(s.kind) ? 1.5 : 0.4);
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], seg = { ax, az, bx, bz, half, s };
      segs.add(Math.min(ax, bx) - half, Math.min(az, bz) - half, Math.max(ax, bx) + half, Math.max(az, bz) + half, seg);
    }
  }
  // Parks, pitches and plazas stay open (U-037: as many as there are).
  const open = new Uint8Array(g.y.length);
  for (const [kind, , p] of GEO.areas) if (kind === 'park' || kind === 'pitch' || kind === 'pier') rasterPoly(points(p, 0.1), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => open.fill(1, j * g.w + i0, j * g.w + i1 + 1));
  const cellAt = (x: number, z: number) => Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)));
  const hAt = (x: number, z: number) => g.y[cellAt(x, z)];
  const [W, H] = [(g.w - 1) * g.cell, (g.h - 1) * g.cell];
  const onLand = (o: Obb) => [...corners(o), [o.cx, o.cz] as P2].every(([x, z]) => { if (x < LEVEL || z < LEVEL || x > W - LEVEL || z > H - LEVEL) return false; const k = cellAt(x, z); return land[k] === land[cellAt(o.cx, o.cz)] && land[k] > 0 && !open[k] && !block[k] && g.y[k] > WATER_Y + 1; });
  const blocked = (o: Obb) => { let b = false; rasterPoly(corners(o), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1 && !b; k++) b = !!block[k]; }); return b; };
  const hitsStreet = (o: Obb, pad: number, skip?: (s: Street) => boolean) => {
    const [x0, z0, x1, z1] = bounds(o, 20);
    for (const sg of segs.near(x0, z0, x1, z1)) if (!skip?.(sg.s) && segNearObb(o, sg.ax, sg.az, sg.bx, sg.bz, sg.half + pad)) return true;
    return false;
  };
  const hitsRoad = (o: Obb) => {
    const [x0, z0, x1, z1] = bounds(o, 20);
    for (const sg of segs.near(x0, z0, x1, z1)) if (MAIN.has(sg.s.kind) && segNearObb(o, sg.ax, sg.az, sg.bx, sg.bz, sg.s.w / 2 - 0.5)) return true;
    return false;
  };
  const hitsLot = (o: Obb, pad: number) => { const [x0, z0, x1, z1] = bounds(o, 2); for (const p of placed.near(x0, z0, x1, z1)) if (obbOverlap(o, p.obb, pad)) return true; return false; };
  const add = (p: Plan) => { plans.push(p); const [x0, z0, x1, z1] = bounds(p.obb); placed.add(x0, z0, x1, z1, p); };
  /** Floors for a building whose real height isn't known: usually its roof meets a neighbour's within a jump
   *  (level with it or a floor down), so the roofs join into routes; otherwise its own. */
  const fit = (o: Obb, base: number, floors: number, lo: number, hi: number, r: ReturnType<typeof makeRng>) => {
    // (Not to a low filler's: the city's mid-height stays tall, U-032.)
    const [x0, z0, x1, z1] = bounds(o, 4), nbs = [...placed.near(x0, z0, x1, z1)].filter(p => !p.far && p.kind !== 'tower' && p.wall - p.base >= 15 && obbOverlap(o, p.obb, 2));
    if (!nbs.length || rand(r) > 0.92) return floors;
    const nb = nbs[randInt(r, nbs.length)], f = Math.round((nb.wall - base) / FLOOR) - (rand(r) < 0.15 ? 1 : 0);
    return f >= lo && f <= hi ? f : floors;
  };
  const sideStreets = (o: Obb): Plan['street'] => {
    const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
    const mids: P2[] = [[0, -o.hd - 3], [0, o.hd + 3], [-o.hw - 3, 0], [o.hw + 3, 0]].map(([u, v]) => [o.cx + c * u - s * v, o.cz + s * u + c * v]);
    return mids.map(([x, z]) => { for (const sg of segs.near(x - 10, z - 10, x + 10, z + 10)) if (segDist(x, z, sg.ax, sg.az, sg.bx, sg.bz) < sg.half + 3) return true; return false; }) as Plan['street'];
  };

  // OSM buildings first, at their real heights.
  // Biggest first; a footprint overlapping one already placed by more than a metre is a part of it or a duplicate.
  const osm = GEO.buildings.map((b, n) => ({ b, n, area: polyArea(points(b[4], 0.1)) })).sort((a, b) => b.area - a.area);
  const inner = (o: Obb): Obb => ({ ...o, hw: Math.max(0.1, o.hw - 1), hd: Math.max(0.1, o.hd - 1) });
  const overlapsOne = (o: Obb) => { const [x0, z0, x1, z1] = bounds(o, 2); for (const p of placed.near(x0, z0, x1, z1)) if (obbOverlap(inner(o), inner(p.obb), 0)) return true; return false; };
  osm.forEach(({ b: [levels, hdm, kind, name, p], n, area }) => {
    const pts = points(p, 0.1), o = minRect(pts);
    if (area < 25 || o.hw > 120 || o.hd > 120 || overlapsOne(o)) return;
    const k = cellAt(o.cx, o.cz);
    if (!land[k] || g.y[k] < WATER_Y || corners(o).some(([x, z]) => x < LEVEL || z < LEVEL || x > W - LEVEL || z > H - LEVEL)) return;
    // A footprint across a roadway is bad data or a building over a passage: the street wins.
    if (hitsRoad(o) || blocked(o)) return;
    const r = makeRng(hashString(`osm${n}`)), far = land[k] === 2;
    // Unknown heights: the 2038 city stands about twice as tall as today's (U-032).
    const floors = levels || (hdm ? Math.max(1, Math.round(hdm / 10 / 3.2)) : area > 1500 ? 12 + randInt(r, 25) : area > 400 ? 10 + randInt(r, 16) : 5 + randInt(r, 9));
    // By type: towers over 20 floors; offices, hotels, shops and malls in gridded stone or glass; homes in tile
    // and render; old houses in brick.
    const business = ['commercial', 'retail', 'office', 'hotel', 'theatre', 'transportation'].includes(kind);
    const tower = floors > 20 || (business && floors > 10), known = !!levels || !!hdm;
    const street = sideStreets(o);
    const front = street.findIndex(Boolean);
    const base = front >= 0 ? edgeHeight(o, front, hAt) : Math.min(...[...corners(o), [o.cx, o.cz] as P2].map(([x, z]) => hAt(x, z)));
    const mat = tower ? MAT.glass : business ? MAT.facadeBand : kind === 'historic' || kind === 'temple' ? MAT.brick : [MAT.tile, MAT.plaster, MAT.concrete, MAT.tile][randInt(r, 4)];
    // Unknown heights meet a neighbour's roof; known ones may give or take a floor to (the 1:1 map is a base to
    // edit for play, U-020).
    const fl = tower || business ? floors : known ? fit(o, base, floors, Math.max(1, floors - 1), floors + 1, r) : fit(o, base, floors, 2, 20, r);
    add({ obb: o, base, wall: base + fl * (tower ? 3.3 : business ? 4 : FLOOR), flex: tower || business ? undefined : known ? [Math.max(1, floors - 1), floors + 1] : [2, 20], kind: tower ? 'tower' : 'res', mat, seed: `osm${n}`, street, across: [0, 0, 0, 0], osm: true, name, far, noEnter: business, ...districtAt(o.cx, o.cz) });
  });

  // The Eighteen Stairs (U-018, M3-41c, U-034, M3-35): both flights and the lane below lined with terraces of old
  // houses fronting the steps as in the references (two to four floors of grey brick or render under pitched grey
  // tile roofs), 6-9 m wide with 1.6-2.4 m alleys between them (the old footpaths through the quarter run in those
  // alleys), each roof stepping down the hill from the one above within a running jump.
  for (const [si, s] of sts.entries()) {
    if (!onGround(s) || s.name !== '十八梯' || s.pts.length < 2) continue;
    const r = makeRng(hashString(`shibati${si}`)), half = s.w / 2 + 0.4, lane = (x: Street) => x !== s && !x.steps && !MAIN.has(x.kind);
    const cum = [0];
    for (let k = 1; k < s.pts.length; k++) cum.push(cum[k - 1] + Math.hypot(s.pts[k][0] - s.pts[k - 1][0], s.pts[k][1] - s.pts[k - 1][1]));
    const total = cum[cum.length - 1], along = (t: number): P2 => {
      let k = 1; while (k < cum.length - 1 && cum[k] < t) k++;
      const f = (t - cum[k - 1]) / (cum[k] - cum[k - 1] || 1), [ax, az] = s.pts[k - 1], [bx, bz] = s.pts[k];
      return [ax + (bx - ax) * f, az + (bz - az) * f];
    };
    // Walk down the stairs, so each house steps off the roof of the one above it.
    const down = hAt(...along(0)) < hAt(...along(total));
    for (const side of [1, -1]) {
      let prev: Plan | null = null;
      for (let t = 1 + rand(r); t < total - 4;) {
        const f = 6 + rand(r) * 3, a = down ? total - t : t, b = down ? total - t - f : t + f;
        if (t + f > total - 1) break;
        const [ax, az] = along(Math.min(a, b)), [bx, bz] = along(Math.max(a, b)), len = Math.hypot(bx - ax, bz - az);
        if (len < f * 0.85) { t += 1.5; prev = null; continue; }
        const ux = (bx - ax) / len, uz = (bz - az) / len, th = Math.atan2(uz, ux), yaw = side === 1 ? th + Math.PI : th, nx = -uz * side, nz = ux * side;
        let ok: Obb | null = null;
        for (const d of [10, 8, 6]) {
          const off = half + 0.6 + d / 2, o = { cx: (ax + bx) / 2 + nx * off, cz: (az + bz) / 2 + nz * off, hw: len / 2, hd: d / 2, yaw };
          if (onLand(o) && !blocked(o) && !hitsStreet(o, 0.3, lane) && !hitsLot(o, APRON)) { ok = o; break; }
        }
        if (!ok) { prev = null; t += f + 1.6; continue; }
        const n = plans.length, base = edgeHeight(ok, 1, hAt);
        // Two to four floors; more where the hill drops away below the house above.
        let fl = 2 + randInt(r, 3);
        if (prev) { const want = Math.floor((prev.wall - base + 0.3) / FLOOR - rand(r) * 0.4); if (want >= 2 && want <= 6) fl = want; }
        // (Their heights and clear roofs are the route down the hill: not evened, nor moved to meet another roof.)
        const p: Plan = { obb: ok, base, wall: base + fl * FLOOR, row: `shibati${si}:${side}`, bare: true, noEnter: true, pitched: true, kind: 'res', mat: [MAT.brick, MAT.plaster, MAT.plaster][randInt(r, 3)], seed: `lot${n}`, street: [false, true, false, false], across: [0, s.w + 3, 0, 0], osm: false, name: '', far: false, ...districtAt(ok.cx, ok.cz) };
        add(p);
        prev = p;
        t += f + 1.6 + rand(r) * 0.8;
      }
    }
  }

  // Infill: rows along every street, main streets first, fronting the street, alleys between.
  const order = sts.filter(s => onGround(s) && s.pts.length > 1).sort((a, b) => Number(MAIN.has(b.kind)) - Number(MAIN.has(a.kind)));
  order.forEach((s, si) => {
    const r = makeRng(hashString(`row${si}`)), half = s.w / 2 + (MAIN.has(s.kind) ? 1.5 : 0.4);
    // Along the whole street, round its bends: each lot squares up to the chord under its frontage.
    const cum = [0];
    for (let k = 1; k < s.pts.length; k++) cum.push(cum[k - 1] + Math.hypot(s.pts[k][0] - s.pts[k - 1][0], s.pts[k][1] - s.pts[k - 1][1]));
    const total = cum[cum.length - 1], along = (t: number): P2 => {
      let k = 1; while (k < cum.length - 1 && cum[k] < t) k++;
      const f = (t - cum[k - 1]) / (cum[k] - cum[k - 1] || 1), [ax, az] = s.pts[k - 1], [bx, bz] = s.pts[k];
      return [ax + (bx - ax) * f, az + (bz - az) * f];
    };
    for (const side of [1, -1]) {
      // Towers stand in clusters (M3-57, U-023): after one, the next is often another its height or a floor lower.
      let tower = 0;
      for (let t = 3 + rand(r) * 2; t < total - 6;) {
        const f = (MAIN.has(s.kind) ? 11 : 7) + rand(r) * (MAIN.has(s.kind) ? 14 : 9);
        if (t + f > total - 2) break;
        const [ax, az] = along(t), [bx, bz] = along(t + f), len = Math.hypot(bx - ax, bz - az);
        // Round a sharp bend, move on.
        if (len < f * 0.85) { t += 2; continue; }
        const ux = (bx - ax) / len, uz = (bz - az) / len, th = Math.atan2(uz, ux);
        // Lots on the left of the street (side 1) look back across it: their own +z faces the street.
        const yaw = side === 1 ? th + Math.PI : th, nx = -uz * side, nz = ux * side;
        let ok: Obb | null = null;
        for (const d of [22, 16, 12, 8]) {
          const off = half + 0.6 + d / 2, cx = (ax + bx) / 2 + nx * off, cz = (az + bz) / 2 + nz * off;
          const o = { cx, cz, hw: len / 2, hd: d / 2, yaw };
          if (onLand(o) && !blocked(o) && !hitsStreet(o, 0.4) && !hitsLot(o, APRON)) { ok = o; break; }
        }
        if (ok) {
          const n = plans.length, rr = makeRng(hashString(`lot${n}`)), far = land[cellAt(ok.cx, ok.cz)] === 2;
          const base = edgeHeight(ok, 1, hAt), dist = districtAt(ok.cx, ok.cz);
          // The crowded centres build up (U-023): shops below, offices and flats above, towers among them;
          // elsewhere walk-ups and slabs.
          // Twice today's heights (U-032), a low filler one in five among them; towers of 21 floors and more.
          const floors = tower && rand(rr) < 0.7 ? tower - (rand(rr) < 0.4 ? 1 : 0) : rand(rr) < 0.2 ? 2 + randInt(rr, 3) : MAIN.has(s.kind) ? 9 + randInt(rr, 10) + (rand(rr) < (dist.cyber ? 0.4 : 0.2) ? 12 + randInt(rr, 20) : 0) : 6 + randInt(rr, 10);
          const shop = dist.cyber && MAIN.has(s.kind) && rand(rr) < 0.4;
          const own = floors, fl = own < 21 ? fit(ok, base, own, 2, 20, rr) : own;
          tower = own >= 21 ? own : 0;
          add({ obb: ok, base, wall: base + fl * FLOOR, flex: own < 21 ? [2, 20] : undefined, row: `${si}:${side}`, kind: 'res', mat: shop ? MAT.facadeBand : [MAT.tile, MAT.plaster, MAT.tile, MAT.concrete][randInt(rr, 4)], seed: `lot${n}`, street: [false, true, false, false], across: [0, s.w + 3, 0, 0], osm: false, name: '', far, noEnter: shop || undefined, ...dist });
        }
        t += f + rowGap(r);
      }
    }
  });
  // The open ground among the buildings filled with more of them (U-032, U-033): wherever a block still fits on
  // land that's no street, big park, set piece or steep bank, near the buildings already there (the
  // land beyond them stays wild), one squared to its nearest neighbour, in the layers' heights: low fillers,
  // mid-height blocks, now and then a tall one. One with no street to front is a back building, entered from the
  // yard or alley its door end opens onto (D-030), if it does.
  const nearest = (x: number, z: number) => { let best: Plan | null = null, bd = 30; for (const p of placed.near(x - 30, z - 30, x + 30, z + 30)) { const d = Math.hypot(p.obb.cx - x, p.obb.cz - z) - Math.max(p.obb.hw, p.obb.hd); if (!p.far && !p.seed.startsWith('back') && d < bd) { bd = d; best = p; } } return best; };
  const flat = (o: Obb, rise: number) => { const ys = [...corners(o), [o.cx, o.cz] as P2].map(([x, z]) => hAt(x, z)); return Math.max(...ys) - Math.min(...ys) <= rise; };
  // Two passes: big blocks on an 8 m grid, then smaller ones in what's left, 4 m over (the smallest only on the
  // flat: the rough ground is for the ruins).
  for (const [off, sizes] of [[0, [[12, 9], [9, 7], [7, 5.5], [5.5, 4]]], [4, [[7, 5.5], [5.5, 4], [4.5, 3.5, 1.5]]]] as const)
  for (let z = LEVEL + 8 + off; z < H - LEVEL - 8; z += 8) for (let x = LEVEL + 8 + off; x < W - LEVEL - 8; x += 8) {
    const k = cellAt(x, z);
    if (land[k] !== 1 || open[k] || block[k] || streetCells[k]) continue;
    const nb = nearest(x, z);
    if (!nb) continue;
    let ok: Obb | null = null;
    for (const [hw, hd, rise = 4] of sizes as readonly (readonly number[])[]) {
      const o = { cx: x, cz: z, hw, hd, yaw: nb.obb.yaw };
      if (onLand(o) && flat(o, rise) && !blocked(o) && !hitsStreet(o, 0.4) && !hitsLot(o, APRON)) { ok = o; break; }
    }
    if (!ok) continue;
    const n = plans.length, rr = makeRng(hashString(`back${n}`)), q = rand(rr), street = sideStreets(ok), front = street.findIndex(Boolean);
    const base = front >= 0 ? edgeHeight(ok, front, hAt) : Math.min(...[...corners(ok), [ok.cx, ok.cz] as P2].map(([px, pz]) => hAt(px, pz)));
    const floors = q < 0.35 ? 1 + randInt(rr, 3) : q < 0.75 ? 4 + randInt(rr, 7) : 11 + randInt(rr, 12);
    add({ obb: ok, base, wall: base + floors * FLOOR, flex: [1, 20], kind: 'res', mat: [MAT.tile, MAT.plaster, MAT.concrete, MAT.brick][randInt(rr, 4)], seed: `back${n}`, street, across: [0, 0, 0, 0], osm: false, name: '', far: false, ...districtAt(ok.cx, ok.cz) });
  }
  // More variety beside the tall ones (U-034, U-037): a building under half the height of one within 12 m rises,
  // one time in two, to 60-80% of it (of 60 m at most: a tower may stand over its neighbours); the rest stay low.
  // By the heights as they were, so it doesn't spread on from those raised.
  const was = new Map(plans.map(p => [p, p.wall - p.base]));
  for (const n of plans) {
    if (n.far || !n.flex || n.kind === 'tower') continue;
    const [x0, z0, x1, z1] = bounds(n.obb, 14), r = makeRng(hashString(`even${n.seed}`));
    let h = 0;
    for (const t of placed.near(x0, z0, x1, z1)) if (t !== n && !t.far && obbOverlap(n.obb, t.obb, 12)) h = Math.max(h, was.get(t)!);
    if (was.get(n)! >= 0.5 * h || rand(r) < 0.5) continue;
    const f = Math.round((Math.min(h, 60) * (0.6 + rand(r) * 0.2)) / FLOOR);
    if (f * FLOOR <= was.get(n)!) continue;
    n.wall = n.base + f * FLOOR;
    n.flex = [Math.max(1, f - 3), Math.max(n.flex[1], f + 2)];
  }
  // Then low fillers in what open ground is left (not the parks), on the flat, round them (U-034, U-037): one to
  // three floors, now and then four to six.
  for (const [ox, oz] of [[2, 2], [6, 6], [2, 6], [6, 2]]) for (let z = LEVEL + 8 + oz; z < H - LEVEL - 8; z += 8) for (let x = LEVEL + 8 + ox; x < W - LEVEL - 8; x += 8) {
    const k = cellAt(x, z);
    if (land[k] !== 1 || open[k] || block[k] || streetCells[k]) continue;
    const nb = nearest(x, z);
    if (!nb) continue;
    let ok: Obb | null = null;
    for (const [hw, hd] of [[5.5, 4], [4.5, 3.5], [3.5, 3]]) {
      const o = { cx: x, cz: z, hw, hd, yaw: nb.obb.yaw };
      if (onLand(o) && flat(o, 1.5) && !blocked(o) && !hitsStreet(o, 0.4) && !hitsLot(o, APRON)) { ok = o; break; }
    }
    if (!ok) continue;
    const n = plans.length, rr = makeRng(hashString(`back${n}`)), street = sideStreets(ok), front = street.findIndex(Boolean);
    const base = front >= 0 ? edgeHeight(ok, front, hAt) : Math.min(...[...corners(ok), [ok.cx, ok.cz] as P2].map(([px, pz]) => hAt(px, pz)));
    const fl = rand(rr) < 0.65 ? 1 + randInt(rr, 3) : 4 + randInt(rr, 3);
    add({ obb: ok, base, wall: base + fl * FLOOR, flex: [1, Math.max(3, fl)], kind: 'res', mat: [MAT.tile, MAT.plaster, MAT.concrete, MAT.brick][randInt(rr, 4)], seed: `back${n}`, street, across: [0, 0, 0, 0], osm: false, name: '', far: false, ...districtAt(ok.cx, ok.cz) });
  }
  // A back building's door (the middle of its far end, hollow() in interiors.ts) needs 3 m clear in front of it.
  for (const p of plans) if (p.seed.startsWith('back') && !p.street.some(Boolean)) {
    const o = p.obb, c = Math.cos(o.yaw), s = Math.sin(o.yaw), [u, v, hw, hd] = o.hd >= o.hw ? [1.3, o.hd + 1.6, 1, 1.5] : [o.hw + 1.6, 1.3, 1.5, 1];
    const d = { cx: o.cx + c * u - s * v, cz: o.cz + s * u + c * v, hw, hd, yaw: o.yaw };
    if (!onLand(d) || hitsLot(d, 0) || blocked(d)) p.noEnter = true;
  }
  // A second pass with every neighbour known: a flexible building with no neighbour's roof in jumping range from
  // its own (a running jump across, a safe drop down) moves to a neighbour's roof it can meet (level, or up
  // to a floor above it), the one nearest its own height (U-032: the low fillers don't pull the tall ones down).
  const top = (p: Plan) => p.wall + 0.6, reach = (a: Plan, b: Plan) => top(a) - top(b) >= -0.5 && top(a) - top(b) <= E.safeDrop.max;
  for (let pass = 0; pass < 3; pass++) for (const a of plans) {
    if (!a.flex || a.far) continue;
    const [x0, z0, x1, z1] = bounds(a.obb, 7), nbs = [...placed.near(x0, z0, x1, z1)].filter(b => b !== a && !b.far && b.kind !== 'tower' && obbOverlap(a.obb, b.obb, E.runningJump.comfortable / 2) && !obbOverlap(a.obb, b.obb, 0.25));
    if (!nbs.length || nbs.some(b => reach(a, b))) continue;
    for (const b of nbs.sort((p, q) => Math.abs(top(p) - top(a)) - Math.abs(top(q) - top(a)))) {
      const f = Math.ceil((top(b) - 0.5 - (top(a) - a.wall) - a.base) / FLOOR);
      if (f >= a.flex[0] && f <= a.flex[1]) { a.wall = a.base + f * FLOOR; break; }
    }
  }
  return plans;
}

/** After levelling: only lots with no ground rising round them can be hollowed (a higher street or neighbour left
 *  beside one would lean into its ground floor); ground falling away is hidden under the floor slab.
 *  Where the street outside leans by no more than LANDING, the ground round the building is levelled into a
 *  landing at its floor (as Chongqing's sloping streets level off at the shop doors), except on stair streets
 *  and under other buildings. */
export function markEnterable(g: Heightfield, plans: Plan[]) {
  const foot = new Uint8Array(g.y.length);
  for (const p of plans) rasterPoly(corners({ ...p.obb, hw: p.obb.hw + 0.3, hd: p.obb.hd + 0.3 }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => foot.fill(1, j * g.w + i0, j * g.w + i1 + 1));
  for (const p of plans) {
    if (p.noEnter || p.far) continue;
    let hi = -Infinity, lo = Infinity, stairs = false;
    rasterPoly(corners({ ...p.obb, hw: p.obb.hw + LEVEL, hd: p.obb.hd + LEVEL }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) { hi = Math.max(hi, g.y[k]); stairs ||= streetCells[k] === 2; } });
    rasterPoly(corners({ ...p.obb, hw: p.obb.hw + g.cell * 1.5, hd: p.obb.hd + g.cell * 1.5 }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) lo = Math.min(lo, g.y[k]); });
    // The ground round an enterable one is settled: later landings leave it alone.
    const settle = () => rasterPoly(corners({ ...p.obb, hw: p.obb.hw + g.cell * 1.5, hd: p.obb.hd + g.cell * 1.5 }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => foot.fill(1, j * g.w + i0, j * g.w + i1 + 1));
    // A sloping street in front may lean a corner by a hand's breadth, no more; ground falling away, however far,
    // is hidden under the ground-floor slab and the foundation (it stands on a plinth over the slope).
    if (hi <= p.base + 0.25) {
      // But the ground outside the door (in the middle of its far end, hollow() in interiors.ts) is made up to the
      // sill if it's within a landing's height, off the streets: a step out, not a drop. Otherwise it stays solid.
      const c = Math.cos(p.obb.yaw), s = Math.sin(p.obb.yaw), z = p.obb.hd >= p.obb.hw, o = p.obb;
      const [bu, bv, bw, bd] = z ? [1.3, o.hd + 1.25, 1.8, 1.25] : [o.hw + 1.25, 1.3, 1.25, 1.8];
      rasterPoly(corners({ cx: o.cx + c * bu - s * bv, cz: o.cz + s * bu + c * bv, hw: bw, hd: bd, yaw: o.yaw }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) if (!foot[k] && !streetCells[k] && g.y[k] < p.base && g.y[k] >= p.base - LANDING) g.y[k] = p.base; });
      const [du, dv] = z ? [1.3, o.hd + 0.75] : [o.hw + 0.75, 1.3];
      if ((heightAt(g, o.cx + c * du - s * dv, o.cz + s * du + c * dv) ?? -99) < p.base - 0.4) { p.noEnter = true; continue; }
      settle();
      continue;
    }
    if (stairs || hi > p.base + LANDING || lo < p.base - LANDING) { p.noEnter = true; continue; }
    rasterPoly(corners({ ...p.obb, hw: p.obb.hw + LEVEL, hd: p.obb.hd + LEVEL }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) if (!foot[k] && streetCells[k] !== 1) g.y[k] = p.base; });
    // A neighbour's footprint or a road's carriageway inside the ring keeps its own ground (a landing may cross
    // a pavement or a lane): if that leaves a step at our walls, stay solid.
    let off = false;
    rasterPoly(corners({ ...p.obb, hw: p.obb.hw + g.cell * 1.5, hd: p.obb.hd + g.cell * 1.5 }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) off ||= g.y[k] - p.base > 0.25; });
    if (off) p.noEnter = true; else settle();
  }
}

/** Ground height at the middle of one of the lot's own sides (0 north, 1 south, 2 west, 3 east). */
function edgeHeight(o: Obb, side: number, hAt: (x: number, z: number) => number): number {
  const c = Math.cos(o.yaw), s = Math.sin(o.yaw), [u, v] = [[0, -o.hd], [0, o.hd], [-o.hw, 0], [o.hw, 0]][side];
  return hAt(o.cx + c * u - s * v, o.cz + s * u + c * v);
}

/** Level the ground round each lot (an apron) and then under it to the lot's base; footprints win over aprons,
 *  and where neighbours overlap the lower base wins, so the ground never rises into a building (its foundation
 *  covers the step down at a shared wall). */
export function levelLots(g: Heightfield, plans: Plan[]) {
  const order = [...plans].sort((a, b) => b.base - a.base);
  for (const pad of [LEVEL, 0.3]) for (const p of order) {
    const o = { ...p.obb, hw: p.obb.hw + pad, hd: p.obb.hd + pad };
    // Aprons stop at the carriageway (a pavement steps up or down to a door); footprints take everything under them.
    rasterPoly(corners(o), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) if (pad < LEVEL || streetCells[k] === 0 || streetCells[k] === 3) g.y[k] = p.base; });
  }
}
