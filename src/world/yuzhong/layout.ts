// The parks (M3-60, U-031, U-033, U-034): green only in the city's few big real parks, laid inside their real outlines. A
// lawn edged all round with a kerb; paths across it from side to side through its middle (drawn and kerbed like
// the other walkways); trees along its edge and its paths, benches and lamps by the paths. The rest of the open
// ground is buildings (lots.ts fills it) or what fill makes of the yards left between them.
import { solid, rampSolid, turn, overlaps, type Solid, type SolidIndex } from '../geom';
import { heightAt, type Heightfield } from '../heightfield';
import { MAT } from '../mats';
import { makeRng, hashString, rand } from '../../sim/rng';
import { GEO } from '../geo';
import type { Feature, Plot, Prop, StreetLine } from '../world';
import { propBoxes } from './dressing';
import { MARK, keptPark, type Marks } from './marks';
import { streetCells } from './ground';
import { minRect, points, inside, polyArea, type P2 } from './shapes';

export interface Layout { lawns: P2[][]; paths: StreetLine[]; solids: Solid[]; decor: Solid[]; props: Prop[]; features: Feature[] }

/** Kerb height over the ground and width; a park path's width. */
const KH = 0.15, KW = 0.2, PATH = 2.4;

/** land: 1 on the peninsula (the far banks' parks aren't laid out). */
export function layout(index: SolidIndex, g: Heightfield, mk: Marks, land: Uint8Array): Layout {
  const out: Layout = { lawns: [], paths: [], solids: [], decor: [], props: [], features: [] };
  const yAt = (x: number, z: number) => heightAt(g, x, z) ?? 0;
  /** Whether a street (its carriageway, pavement or path) runs at (x, z): parks keep off them. */
  const street = (x: number, z: number) => streetCells[Math.round(z / g.cell) * g.w + Math.round(x / g.cell)] !== 0;
  const put = (kind: string, x: number, z: number, yaw: number) => {
    const y = heightAt(g, x, z);
    if (y === null || street(x, z)) return false;
    const p: Prop = { kind, x, y, z, yaw }, boxes = propBoxes(p);
    if (boxes.some(b => overlaps(index, { ...b, y0: b.y0 + 0.3 }))) return false;
    out.props.push(p); out.solids.push(...boxes);
    return true;
  };
  /** A kerb along the outline from a to b, in pieces no longer than a ground cell, each's top following it. */
  const kerb = ([ax, az]: P2, [bx, bz]: P2) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / g.cell)), yaw = Math.atan2(bz - az, bx - ax);
    for (let i = 0; i < n; i++) {
      const x0 = ax + ((bx - ax) * i) / n, z0 = az + ((bz - az) * i) / n, x1 = ax + ((bx - ax) * (i + 1)) / n, z1 = az + ((bz - az) * (i + 1)) / n;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, l = len / n / 2 + 0.05, y0 = yAt(x0, z0), y1 = yAt(x1, z1), lo = Math.min(y0, y1), hi = Math.max(y0, y1);
      // Where a street crosses the edge it runs on through: no kerb across it.
      if (street(cx, cz)) continue;
      const s = hi - lo < 0.02 ? solid(cx - l, lo - 0.3, cz - KW / 2, cx + l, lo + KH, cz + KW / 2, MAT.stone) : rampSolid(cx - l, lo - 0.3, cz - KW / 2, cx + l, cz + KW / 2, lo + KH, hi + KH, y1 > y0 ? 1 : 2, MAT.stone);
      out.solids.push(turn([s], yaw, cx, cz)[0]);
    }
  };

  for (const [kind, , flat] of GEO.areas) {
    if (!keptPark(kind, flat)) continue;
    const poly = points(flat, 0.1), area = polyArea(poly), o = minRect(poly);
    const k = Math.round(o.cz / g.cell) * g.w + Math.round(o.cx / g.cell);
    if (land[k] !== 1) continue;
    const r = makeRng(hashString(`park${Math.round(o.cx)},${Math.round(o.cz)}`)), at = (x: number, z: number) => inside(poly, x, z);
    out.lawns.push(poly);
    out.features.push({ kind: 'park', x: o.cx, y: yAt(o.cx, o.cz), z: o.cz, group: Math.round(area), nx: 0, nz: 0 });
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      kerb(a, b);
      // Trees along the edge, 2.5 m in, every 9 m or so.
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / (len || 1), nz = (b[0] - a[0]) / (len || 1);
      for (let t = 4; t < len - 2; t += 8 + rand(r) * 3) for (const s of [1, -1]) {
        const x = a[0] + ((b[0] - a[0]) * t) / len + nx * s * 2.5, z = a[1] + ((b[1] - a[1]) * t) / len + nz * s * 2.5;
        if (at(x, z)) { put(rand(r) < 0.3 ? 'figtree' : 'tree', x, z, rand(r) * 6.28); break; }
      }
      // A hedge along the edge between them, 1.2 m in.
      for (let t = 2; t < len - 1; t += 4) for (const s of [1, -1]) {
        const x = a[0] + ((b[0] - a[0]) * t) / len + nx * s * 1.2, z = a[1] + ((b[1] - a[1]) * t) / len + nz * s * 1.2;
        if (at(x, z)) { if (rand(r) < 0.6) put('shrub', x, z, rand(r) * 6.28); break; }
      }
    }
    // Paths along its two axes through the middle, from edge to edge: the longest stretch inside it.
    const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
    for (const [ux, uz, half] of [[c, s, o.hw], [-s, c, o.hd]] as const) {
      if (half < 12) continue;
      let best: [number, number] = [0, 0], start = NaN;
      for (let t = -half; t <= half + 1; t += 1) {
        const inn = t <= half && at(o.cx + ux * t, o.cz + uz * t);
        if (inn && isNaN(start)) start = t;
        if (!inn && !isNaN(start)) { if (t - start > best[1] - best[0]) best = [start, t - 1]; start = NaN; }
      }
      if (best[1] - best[0] < 12) continue;
      const pa: P2 = [o.cx + ux * best[0], o.cz + uz * best[0]], pb: P2 = [o.cx + ux * best[1], o.cz + uz * best[1]];
      out.paths.push({ kind: 'footway', w: PATH, steps: false, pts: [pa, pb] });
      // Trees either side every 10 m, a bench now and then facing the path, a lamp every 20 m.
      for (let t = best[0] + 5, n = 0; t < best[1] - 3; t += 10, n++) {
        const x = o.cx + ux * t, z = o.cz + uz * t, side = n % 2 ? 1 : -1, px = -uz * side, pz = ux * side;
        put(rand(r) < 0.3 ? 'figtree' : 'tree', x + px * 3, z + pz * 3, rand(r) * 6.28);
        if (n % 2 === 0 && rand(r) < 0.6) put('bench', x - px * (PATH / 2 + 0.6), z - pz * (PATH / 2 + 0.6), Math.atan2(px, pz));
        if (n % 2 === 1) put('lamppost', x - px * (PATH / 2 + 0.4), z - pz * (PATH / 2 + 0.4), 0);
      }
    }
    // Groves inside, clear of the paths: a tree at most points of a 9 m grid square to the park.
    for (let a = -o.hw + 6; a < o.hw - 4; a += 9) for (let b = -o.hd + 6; b < o.hd - 4; b += 9) {
      if (Math.abs(a) < 4 || Math.abs(b) < 4 || rand(r) > 0.7) continue;
      const x = o.cx + c * a - s * b + (rand(r) - 0.5) * 3, z = o.cz + s * a + c * b + (rand(r) - 0.5) * 3;
      if (at(x, z)) put(rand(r) < 0.3 ? 'figtree' : 'tree', x, z, rand(r) * 6.28);
    }
    // Its ground is laid: the green and the fill leave it alone.
    for (let j = 0; j < mk.h; j++) for (let i = 0; i < mk.w; i++) if (mk.m[j * mk.w + i] === MARK.park && at((i + 0.5) * mk.cell, (j + 0.5) * mk.cell)) mk.m[j * mk.w + i] = MARK.laid;
  }
  return out;
}

/** Paths from the doors of the enterable buildings set back from the streets (U-033: every walkway runs from
 *  somewhere to somewhere): straight out to the edge of the nearest street, 2.5-25 m off, where nothing built
 *  stands in the way and no bank rises between. Their ground is marked a path, so the fill keeps off them. */
export function doorPaths(g: Heightfield, plots: Plot[], streets: StreetLine[]): StreetLine[] {
  const B = 16, key = (i: number, j: number) => i * 65536 + j, W = 1.8;
  const file = <T>(m: Map<number, T[]>, x0: number, z0: number, x1: number, z1: number, v: T) => {
    for (let i = Math.floor(x0 / B); i <= Math.floor(x1 / B); i++) for (let j = Math.floor(z0 / B); j <= Math.floor(z1 / B); j++) { const a = m.get(key(i, j)); if (a) a.push(v); else m.set(key(i, j), [v]); }
  };
  const lots = new Map<number, Plot[]>(), segs = new Map<number, number[][]>();
  for (const p of plots) if (!p.far) { const xs = p.corners.map(c => c[0]), zs = p.corners.map(c => c[1]); file(lots, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), p); }
  for (const s of streets) for (let k = 0; k + 1 < s.pts.length; k++) {
    const [[ax, az], [bx, bz]] = [s.pts[k], s.pts[k + 1]];
    file(segs, Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), [ax, az, bx, bz, s.w / 2]);
  }
  const side = (p: Plot, x: number, z: number) => p.corners.map((c, i) => { const d = p.corners[(i + 1) % 4]; return Math.sign((d[0] - c[0]) * (z - c[1]) - (d[1] - c[1]) * (x - c[0])); });
  const built = (x: number, z: number) => (lots.get(key(Math.floor(x / B), Math.floor(z / B))) ?? []).some(p => { const s = side(p, x, z); return s.every(v => v >= 0) || s.every(v => v <= 0); });
  const out: StreetLine[] = [];
  for (const p of plots) {
    if (p.far || !p.route) continue;
    const { x: dx, z: dz } = p.route[0];
    let best: number[] | null = null, bd = 25;
    for (let i = Math.floor((dx - 25) / B); i <= Math.floor((dx + 25) / B); i++) for (let j = Math.floor((dz - 25) / B); j <= Math.floor((dz + 25) / B); j++)
      for (const [ax, az, bx, bz, hw] of segs.get(key(i, j)) ?? []) {
        const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((dx - ax) * vx + (dz - az) * vz) / (vx * vx + vz * vz || 1)));
        const px = ax + vx * t, pz = az + vz * t, d = Math.hypot(dx - px, dz - pz) - hw;
        if (d < bd) { bd = d; best = [px, pz, hw]; }
      }
    if (!best || bd < 2.5) continue;
    // To just inside the street's edge.
    const [px, pz, hw] = best, l = Math.hypot(dx - px, dz - pz), ux = (dx - px) / l, uz = (dz - pz) / l, ex = px + ux * (hw - 0.3), ez = pz + uz * (hw - 0.3);
    // Walkable all the way: no bank to climb (a rise of 0.4 m in a metre at most).
    let clear = true, y = heightAt(g, dx, dz) ?? NaN;
    for (let t = 0.6; t < l - hw && clear; t += 0.5) for (const o of [-W / 2, 0, W / 2]) clear &&= !built(dx - ux * t - uz * o, dz - uz * t + ux * o);
    for (let t = 1; t <= l - hw + 0.3 && clear; t += 1) { const h = heightAt(g, dx - ux * t, dz - uz * t) ?? NaN; clear = Math.abs(h - y) <= 0.4; y = h; }
    if (!clear) continue;
    out.push({ kind: 'footway', w: W, steps: false, pts: [[dx, dz], [ex, ez]] });
    // Its ground a path, where no street is.
    const n = Math.ceil(l / (g.cell / 2));
    for (let k = 0; k <= n; k++) {
      const x = dx + ((ex - dx) * k) / n, z = dz + ((ez - dz) * k) / n, c = Math.round(z / g.cell) * g.w + Math.round(x / g.cell);
      if (c >= 0 && c < streetCells.length && !streetCells[c]) streetCells[c] = 4;
    }
  }
  return out;
}
