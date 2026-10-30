// Open ground laid out on purpose (M3-60, U-031): the marks' open and park ground in parcels (cells touching side
// by side), each given a use by its size, its streets and its district. Parks: lawns in beds edged with kerbs, a
// cross of paved paths, trees along them, benches and lamps, a hedge round the edge. Parking lots off the roads:
// asphalt, bays painted in rows facing their aisles, cars parked in them, a booth, lamps. Plazas in the centres:
// paving, trees in planters, a row of food stalls with stools, benches, a kiosk. What's too small for any of that
// (the spaces between buildings) is left for fill's sheds, lean-tos and yards. Every lawn ends at a kerb; the
// lawns, paving and asphalt are drawn over the ground cell by cell (cover), so their edges are clean.
import { solid, rampSolid, overlaps, type Solid, type SolidIndex } from '../geom';
import { heightAt, type Heightfield } from '../heightfield';
import { MAT } from '../mats';
import { makeRng, hashString, rand, randInt } from '../../sim/rng';
import type { Feature, Prop } from '../world';
import { propBoxes } from './dressing';
import { MARK, type Marks } from './marks';
import { streetCells } from './ground';
import { districtAt } from './lots';

export const COVER = { lawn: 1, paving: 2, asphalt: 3 } as const;
export interface Layout { cover: Marks; solids: Solid[]; decor: Solid[]; props: Prop[]; features: Feature[] }

/** Kerb height over the ground and width; a parking bay's width and depth, its aisle. */
const KH = 0.15, KW = 0.2, BAY_W = 2.6, BAY_D = 5, AISLE = 6;

export function layout(index: SolidIndex, g: Heightfield, mk: Marks): Layout {
  const C = mk.cell, cover: Marks = { ...mk, m: new Uint8Array(mk.m.length) };
  const out: Layout = { cover, solids: [], decor: [], props: [], features: [] };
  const yAt = (x: number, z: number) => heightAt(g, x, z) ?? 0;
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= mk.w || j >= mk.h ? -1 : j * mk.w + i);
  /** A prop with its collision, clear of anything built (and of what this has already put down). */
  const placed: Solid[] = [];
  const put = (kind: string, x: number, z: number, yaw: number) => {
    const y = heightAt(g, x, z);
    if (y === null) return false;
    const p: Prop = { kind, x, y, z, yaw }, boxes = propBoxes(p);
    const hit = (b: Solid) => overlaps(index, { ...b, y0: b.y0 + 0.3 }) || placed.some(q => q.x0 < b.x1 && q.x1 > b.x0 && q.z0 < b.z1 && q.z1 > b.z0 && q.y0 < b.y1 && q.y1 > b.y0);
    if (boxes.some(hit)) return false;
    out.props.push(p); out.solids.push(...boxes); placed.push(...boxes);
    return true;
  };
  /** A kerb along a cell edge from (x0, z0) to (x1, z1) (square to the map), its top following the ground: a piece
   *  per ground cell, the ground straight along each. */
  const kerb = (x0: number, z0: number, x1: number, z1: number): void => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len > g.cell + 0.01) { const n = Math.round(len / g.cell); for (let i = 0; i < n; i++) kerb(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, x0 + ((x1 - x0) * (i + 1)) / n, z0 + ((z1 - z0) * (i + 1)) / n); return; }
    const ya = yAt(x0, z0), yb = yAt(x1, z1), lo = Math.min(ya, yb), hi = Math.max(ya, yb), alongX = z0 === z1;
    const [a0, b0, a1, b1] = alongX ? [Math.min(x0, x1), z0 - KW / 2, Math.max(x0, x1), z0 + KW / 2] : [x0 - KW / 2, Math.min(z0, z1), x0 + KW / 2, Math.max(z0, z1)];
    const up = alongX ? (yb > ya) === (x1 > x0) : (yb > ya) === (z1 > z0);
    out.solids.push(hi - lo < 0.02 ? solid(a0, lo - 0.3, b0, a1, lo + KH, b1, MAT.stone) : rampSolid(a0, lo - 0.3, b0, a1, b1, lo + KH, hi + KH, alongX ? (up ? 1 : 2) : (up ? 3 : 4), MAT.stone));
  };
  const feature = (kind: string, x: number, z: number, group: number, nx = 0, nz = 0) => out.features.push({ kind, x, y: yAt(x, z), z, group, nx, nz });

  const seen = new Uint8Array(mk.m.length);
  let parcels = 0;
  for (let k0 = 0; k0 < mk.m.length; k0++) {
    if (seen[k0] || (mk.m[k0] !== MARK.open && mk.m[k0] !== MARK.park)) continue;
    // The parcel: the open and park cells reached side by side.
    const cells: number[] = [k0];
    seen[k0] = 1;
    for (let q = 0; q < cells.length; q++) {
      const i = cells[q] % mk.w, j = Math.floor(cells[q] / mk.w);
      for (const n of [at(i - 1, j), at(i + 1, j), at(i, j - 1), at(i, j + 1)]) if (n >= 0 && !seen[n] && (mk.m[n] === MARK.open || mk.m[n] === MARK.park)) { seen[n] = 1; cells.push(n); }
    }
    const mine = new Set(cells), ci = (k: number) => k % mk.w, cj = (k: number) => Math.floor(k / mk.w), mid = (k: number): [number, number] => [(ci(k) + 0.5) * C, (cj(k) + 0.5) * C];
    const is = cells.map(ci), js = cells.map(cj), i0 = Math.min(...is), i1 = Math.max(...is), j0 = Math.min(...js), j1 = Math.max(...js);
    const ys = cells.map(k => yAt(...mid(k))), range = Math.max(...ys) - Math.min(...ys);
    const [cx, cz] = [((i0 + i1 + 1) / 2) * C, ((j0 + j1 + 1) / 2) * C], r = makeRng(hashString(`parcel${cx},${cz}`));
    // Beside a road: a cell's edge on a carriageway or its pavement.
    const roadside = cells.some(k => [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([a, b]) => [0.75, 1.25].some(d => { const [x, z] = mid(k), s = streetCells[Math.round((z + b * C * d) / g.cell) * g.w + Math.round((x + a * C * d) / g.cell)]; return s === 1 || s === 3; })));
    const park = cells.some(k => mk.m[k] === MARK.park), cyber = districtAt(cx, cz).cyber;
    // Parking where it's flat enough, mostly off a road but often behind the buildings along one (driven in through
    // a gap), fewer in the crowded centres.
    const flat = cells.length >= 12 && range <= 3, parking = flat && rand(r) < (roadside ? 0.9 : 0.45) * (cyber ? 0.4 : 1);
    const use = park || cells.length >= 40 ? 'park' : parking ? 'parking' : cells.length >= 8 ? (cyber || rand(r) < 0.5 ? 'plaza' : 'park') : null;
    if (!use) continue;
    parcels++;
    for (const k of cells) mk.m[k] = MARK.laid;
    feature(use, cx, cz, cells.length);

    if (use === 'park') {
      // Paths: the middle row and column (and every sixth on a big one); the rest lawn in kerbed beds.
      const midI = Math.round((i0 + i1) / 2), midJ = Math.round((j0 + j1) / 2);
      const path = (k: number) => ci(k) === midI || cj(k) === midJ || (i1 - i0 > 10 && (ci(k) - midI) % 6 === 0) || (j1 - j0 > 10 && (cj(k) - midJ) % 6 === 0);
      for (const k of cells) cover.m[k] = path(k) ? COVER.paving : COVER.lawn;
      for (const k of cells) {
        if (cover.m[k] !== COVER.lawn) continue;
        const i = ci(k), j = cj(k), x0 = i * C, z0 = j * C;
        // Kerbs on every edge the lawn doesn't carry on across; a hedge along the park's outer edge.
        const edges: [number, number, number, number, number][] = [[at(i - 1, j), x0, z0, x0, z0 + C], [at(i + 1, j), x0 + C, z0, x0 + C, z0 + C], [at(i, j - 1), x0, z0, x0 + C, z0], [at(i, j + 1), x0, z0 + C, x0 + C, z0 + C]];
        for (const [n, ax, az, bx, bz] of edges) {
          if (n >= 0 && mine.has(n) && cover.m[n] === COVER.lawn) continue;
          kerb(ax, az, bx, bz);
          const ex = (ax + bx) / 2, ez = (az + bz) / 2;
          if ((n < 0 || !mine.has(n)) && rand(r) < 0.35) put('shrub', ex + Math.sign(x0 + C / 2 - ex) * 0.9, ez + Math.sign(z0 + C / 2 - ez) * 0.9, rand(r) * 6.28);
        }
        // Beside a path: a tree every third cell, now and then a bench facing the path between them.
        const toPath = edges.find(([n]) => n >= 0 && mine.has(n) && cover.m[n] === COVER.paving);
        if (toPath) {
          const [, ax, az, bx, bz] = toPath, ex = (ax + bx) / 2, ez = (az + bz) / 2, ox = Math.sign(x0 + C / 2 - ex), oz = Math.sign(z0 + C / 2 - ez);
          if ((i + j) % 3 === 0) put(rand(r) < 0.3 ? 'figtree' : 'tree', ex + ox * 1.4, ez + oz * 1.4, rand(r) * 6.28);
          else if ((i + j) % 6 === 1 && rand(r) < 0.6) put('bench', ex + ox * 0.5, ez + oz * 0.5, Math.atan2(-ox, -oz));
        }
      }
      // A lamp every 20 m or so along the paths.
      for (const k of cells) if (cover.m[k] === COVER.paving && (ci(k) * 3 + cj(k) * 2) % 5 === 0 && (ci(k) + cj(k)) % 2 === 0) { const [x, z] = mid(k); put('lamppost', x + C / 2 - 0.3, z + C / 2 - 0.3, rand(r) * 6.28); }
    } else if (use === 'parking') {
      for (const k of cells) cover.m[k] = COVER.asphalt;
      // Rows of bays across the lot's long side: bays facing an aisle, the next row backing onto them.
      const alongX = i1 - i0 >= j1 - j0, [u0, u1, v0, v1] = alongX ? [i0 * C, (i1 + 1) * C, j0 * C, (j1 + 1) * C] : [j0 * C, (j1 + 1) * C, i0 * C, (i1 + 1) * C];
      const P = (u: number, v: number): [number, number] => (alongX ? [u, v] : [v, u]);
      const inLot = (u: number, v: number) => { const [x, z] = P(u, v), n = at(Math.floor(x / C), Math.floor(z / C)); return n >= 0 && mine.has(n); };
      const line = (ua: number, va: number, ub: number, vb: number) => {
        const [xa, za] = P(ua, va), [xb, zb] = P(ub, vb), y = yAt((xa + xb) / 2, (za + zb) / 2) + 0.075;
        const s = solid(Math.min(xa, xb) - 0.06, y - 0.03, Math.min(za, zb) - 0.06, Math.max(xa, xb) + 0.06, y, Math.max(za, zb) + 0.06, MAT.plaster);
        s.tint = 0xffffff; out.decor.push(s);
      };
      let bays = 0;
      for (let v = v0 + 0.6; v + BAY_D <= v1 - 0.4; v += BAY_D * 2 + AISLE + 0.6) for (const band of [0, 1]) {
        // The first band's bays open onto the aisle after them (+v), the second's onto the aisle before (-v).
        const b0 = band === 0 ? v : v + BAY_D + AISLE, face = band === 0 ? 1 : -1;
        if (b0 + BAY_D > v1 - 0.4) continue;
        for (let u = u0 + 0.6; u + BAY_W <= u1 - 0.6; u += BAY_W) {
          if (![[u, b0], [u + BAY_W, b0], [u, b0 + BAY_D], [u + BAY_W, b0 + BAY_D]].every(([a, b]) => inLot(a, b))) continue;
          line(u, b0, u, b0 + BAY_D); line(u + BAY_W, b0, u + BAY_W, b0 + BAY_D); line(u, face > 0 ? b0 : b0 + BAY_D, u + BAY_W, face > 0 ? b0 : b0 + BAY_D);
          const [x, z] = P(u + BAY_W / 2, b0 + BAY_D / 2), [nx, nz] = alongX ? [0, face] : [face, 0];
          feature('bay', x, z, bays++, nx, nz);
          if (rand(r) < 0.45) put(rand(r) < 0.12 ? 'van' : 'car', x, z, Math.atan2(nx, nz));
        }
      }
      // A booth at the corner nearest the middle of the lot's road side, lamps along the aisles.
      const edge = cells.find(k => [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([a, b]) => { const n = at(ci(k) + a, cj(k) + b); return n < 0 || !mine.has(n); }));
      if (edge !== undefined) { const [x, z] = mid(edge); put('kiosk', x, z, rand(r) * 4 > 2 ? 0 : Math.PI / 2); }
      for (let u = u0 + 8; u < u1 - 4; u += 16) { const [x, z] = P(u, v0 + BAY_D + AISLE / 2); if (inLot(u, v0 + BAY_D + AISLE / 2)) put('lamppost', x, z, 0); }
    } else {
      // A plaza: paving; trees in kerbed planters on a grid; a row of food stalls with stools out front near the
      // middle; benches by the planters; a kiosk and bins.
      for (const k of cells) cover.m[k] = COVER.paving;
      const off = (k: number) => { const [x, z] = mid(k); return Math.hypot(x - cx, z - cz); }, centre = cells.reduce((a, k) => (off(k) < off(a) ? k : a));
      for (const k of cells) {
        const i = ci(k), j = cj(k), [x, z] = mid(k);
        if (k === centre) continue;
        if (i % 3 === 1 && j % 3 === 1) {
          for (const [ax, az, bx, bz] of [[x - 1, z - 1, x + 1, z - 1], [x - 1, z + 1, x + 1, z + 1], [x - 1, z - 1, x - 1, z + 1], [x + 1, z - 1, x + 1, z + 1]]) kerb(ax, az, bx, bz);
          put(rand(r) < 0.3 ? 'figtree' : 'tree', x, z, rand(r) * 6.28);
          if (rand(r) < 0.6) put('bench', x + 1.8, z, Math.PI / 2);
        } else if (rand(r) < 0.15) put(['bin', 'pot', 'pot', 'bench', 'stools'][randInt(r, 5)], x + (rand(r) - 0.5) * 2, z + (rand(r) - 0.5) * 2, randInt(r, 4) * Math.PI / 2);
      }
      const [x, z] = mid(centre), yaw = randInt(r, 4) * Math.PI / 2, ux = Math.cos(yaw), uz = -Math.sin(yaw);
      for (let s = -1; s <= 1; s++) {
        put('stall', x + ux * s * 2, z + uz * s * 2, yaw);
        put('stools', x + ux * s * 2 + Math.sin(yaw) * 1.6, z + uz * s * 2 + Math.cos(yaw) * 1.6, rand(r) * 6.28);
      }
      put('kiosk', x + Math.sin(yaw) * 5, z + Math.cos(yaw) * 5, yaw + Math.PI);
    }
  }
  return out;
}
