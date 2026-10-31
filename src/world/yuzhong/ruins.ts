// The ruins of the fighting (M3-56c, U-028, U-030): when the city fought the machines it blew up its own streets,
// and the rough ground by the buildings (the marks' ruins) is where that left its debris. Each patch gets rubble
// heaps, tipped slabs, rebar and broken walls, at least one piece however small; the big ones a collapsed
// building (a broken corner of wall, slabs piled against it, rubble round it); the steepest banks are retaining
// walls with fig roots hanging over them. What fell from the building beside a patch lies on it (M3-61, U-031):
// sections of its facade in its own material and colour, broken where they landed or tipped on the rubble, a column
// or a beam; boulders of broken concrete; rubble settled in the hollows. Debris has collision, so it is cover and
// something to climb.
import { overlaps, raycast, rampSolid, solid, turn, type Solid, type SolidIndex } from '../geom';
import { MAT } from '../mats';
import type { Feature } from '../world';
import { heightAt, type Heightfield } from '../heightfield';
import { makeRng, hashString, rand, type Rng } from '../../sim/rng';
import type { Prop } from '../world';
import { propBoxes } from './dressing';
import { MARK, type Marks } from './marks';

/** Patches this many cells and up hold a collapsed building. */
const BIG = 10;
/** What a building's walls are made of (not the ground's retaining walls or foundations). */
const WALLS = new Set<number>([MAT.facade, MAT.facadeTile, MAT.facadeBrick, MAT.facadeOpen, MAT.facadeBand, MAT.glass, MAT.plaster, MAT.brick, MAT.block, MAT.tile]);

export function ruins(index: SolidIndex, g: Heightfield, mk: Marks): { props: Prop[]; solids: Solid[]; features: Feature[] } {
  const props: Prop[] = [], solids: Solid[] = [], features: Feature[] = [];
  const put = (kind: string, x: number, z: number, yaw: number, extra: Partial<Prop> = {}) => {
    const y = heightAt(g, x, z);
    if (y === null) return false;
    const p: Prop = { kind, x, y, z, yaw, ...extra }, boxes = propBoxes(p);
    if (boxes.some(b => overlaps(index, { ...b, y0: b.y0 + 0.6 }) || solids.some(o => o.x0 < b.x1 && b.x0 < o.x1 && o.z0 < b.z1 && b.z0 < o.z1 && Math.abs(o.y0 - b.y0) < 2))) return false;
    props.push(p);
    solids.push(...boxes);
    return true;
  };
  /** Downhill across a cell (the way its debris slid), and its drop. */
  const fall = (i: number, j: number) => {
    const h = (a: number, b: number) => heightAt(g, (i + a) * mk.cell, (j + b) * mk.cell) ?? 0;
    const gx = h(1, 0.5) - h(0, 0.5), gz = h(0.5, 1) - h(0.5, 0);
    return { yaw: Math.atan2(-gx, -gz), drop: Math.hypot(gx, gz) };
  };
  const seen = new Uint8Array(mk.m.length);
  for (let k0 = 0; k0 < mk.m.length; k0++) {
    if (mk.m[k0] !== MARK.ruin || seen[k0]) continue;
    // The patch: its cells, four-connected.
    const cells = [k0];
    seen[k0] = 1;
    for (let n = 0; n < cells.length; n++) {
      const k = cells[n], i = k % mk.w, j = (k - i) / mk.w;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = (j + b) * mk.w + i + a;
        if (i + a >= 0 && i + a < mk.w && j + b >= 0 && j + b < mk.h && mk.m[q] === MARK.ruin && !seen[q]) { seen[q] = 1; cells.push(q); }
      }
    }
    const r = makeRng(hashString(`ruin${k0}`));
    let placed = 0;
    if (cells.length >= BIG) placed += collapse(cells[cells.length >> 1], r);
    // In the big heaps, floors come down onto their rubble with a crawl space under (M3-71, U-038): one or two.
    for (let m = 0, n = cells.length >= 3 * BIG ? 2 : cells.length >= BIG ? 1 : cells.length >= 4 && rand(r) < 0.5 ? 1 : 0; m < n; m++) { const k = cells[Math.floor(rand(r) * cells.length)], i = k % mk.w, j = (k - i) / mk.w; crawl((i + 0.5) * mk.cell, (j + 0.5) * mk.cell, rand(r) * 6.3, r); }
    for (const k of cells) {
      const i = k % mk.w, j = (k - i) / mk.w, x = (i + 0.2 + rand(r) * 0.6) * mk.cell, z = (j + 0.2 + rand(r) * 0.6) * mk.cell, q = rand(r), f = fall(i, j);
      if (q < 0.2) placed += +put('rubblepile', x, z, rand(r) * 6.3, { w: 1.5 + rand(r) * 2.5 });
      else if (q < 0.3) placed += +put('slab', x, z, f.yaw + (rand(r) - 0.5) * 0.6);
      else if (q < 0.34) placed += +put('rebar', x, z, rand(r) * 6.3);
      else if (q < 0.44) placed += +put('debris', x, z, rand(r) * 6.3);
      else if (q < 0.48) placed += +put('halfwall', x, z, f.yaw + Math.PI / 2, { w: 2 + rand(r) * 2, h: 1 + rand(r) * 2 });
      // Retaining walls with fig roots over the steepest banks, facing downhill from the foot of the bank.
      if (f.drop > 3 && rand(r) < 0.35) props.push({ kind: 'figroots', x: (i + 0.5) * mk.cell, y: (heightAt(g, (i + 0.5) * mk.cell, (j + 0.5) * mk.cell) ?? 0) - f.drop / 2, z: (j + 0.5) * mk.cell, yaw: f.yaw, w: 3, h: f.drop });
    }
    // However small the patch, something of the fighting lies on it.
    for (const k of cells) {
      if (placed) break;
      const i = k % mk.w, j = (k - i) / mk.w;
      for (const [kind, extra] of [['debris', {}], ['rubblepile', { w: 1.5 }], ['rebar', {}]] as const) if (put(kind, (i + 0.5) * mk.cell, (j + 0.5) * mk.cell, rand(r) * 6.3, extra)) { placed++; break; }
    }
    // What fell from the building beside it, and the boulders, among the rest (M3-61).
    if (cells.length >= 3) fallen(cells, r);
    boulders(cells, r);
  }
  return { props, solids, features };

  /** The ground under a turned piece (its corners, edges and middle): lowest and highest. */
  function under(b: Solid): [number, number] {
    const R = b.rot, hs: number[] = [];
    if (R) for (const u of [0, 0.5, 1]) for (const v of [0, 0.5, 1]) {
      const dx = R.x0 + (R.x1 - R.x0) * u - R.px, dz = R.z0 + (R.z1 - R.z0) * v - R.pz;
      hs.push(heightAt(g, R.px + dx * R.c - dz * R.s, R.pz + dx * R.s + dz * R.c) ?? -Infinity);
    }
    else hs.push(heightAt(g, b.x0, b.z0) ?? -Infinity);
    return [Math.min(...hs), Math.max(...hs)];
  }
  /** Whether a piece clears the world over the ground under it: a turned one point by point over its footprint
   *  (its box would catch the wall it fell from). */
  function clearOf(b: Solid): boolean {
    const R = b.rot;
    if (!R) { const hi = under(b)[1]; return !overlaps(index, { ...b, y0: hi + 0.3, y1: Math.max(b.y1, hi + 0.35) }); }
    const nu = Math.max(1, Math.ceil((R.x1 - R.x0) / 0.8)), nv = Math.max(1, Math.ceil((R.z1 - R.z0) / 0.8));
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const lx = R.x0 + ((R.x1 - R.x0) * i) / nu - R.px, lz = R.z0 + ((R.z1 - R.z0) * j) / nv - R.pz, x = R.px + lx * R.c - lz * R.s, z = R.pz + lx * R.s + lz * R.c, gy = heightAt(g, x, z) ?? b.y0;
      if (overlaps(index, { x0: x - 0.12, y0: gy + 0.3, z0: z - 0.12, x1: x + 0.12, y1: Math.max(b.y1, gy + 0.35), z1: z + 0.12 })) return false;
    }
    return true;
  }
  /** Pieces of debris (turned solids) laid if, over the ground, they clear the world and (unless it rests on the
   *  heap) what's laid already. */
  function lay(parts: Solid[], heap = false): boolean {
    if (parts.some(b => !clearOf(b)) || (!heap && parts.some(b => solids.some(o => o.x0 < b.x1 && b.x0 < o.x1 && o.z0 < b.z1 && b.z0 < o.z1 && Math.abs(o.y0 - b.y0) < 2)))) return false;
    solids.push(...parts);
    return true;
  }

  /** The building beside a patch: the nearest tall wall a ray from (x, z) meets, what it's made of and its colour,
   *  where the ray met it and which way it faces. */
  function beside(x: number, z: number) {
    const y = heightAt(g, x, z);
    let best: { mat: number; tint?: number; x: number; z: number; y: number; nx: number; nz: number; t: number } | null = null;
    if (y === null) return best;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4, dx = Math.cos(a), dz = Math.sin(a), h = raycast(index, x, y + 3, z, dx, 0, dz, 18);
      if (!h || h.id < 0 || (best && h.t >= best.t)) continue;
      const s = index.solids[h.id];
      if (s.y1 - s.y0 >= 5 && WALLS.has(s.mat)) best = { mat: s.mat, tint: s.tint, x: x + dx * h.t, z: z + dz * h.t, y: y + 3, nx: h.nx, nz: h.nz, t: h.t };
    }
    return best;
  }

  /** A long piece from a to b lying on the ground (its top `lift` over it at each end), w wide and t thick: a ramp
   *  following the slope, turned into place; null where the slope's too steep for it to lie. */
  function lying(ax: number, az: number, bx: number, bz: number, w: number, t: number, lift: [number, number], mat: number): Solid | null {
    const ya = heightAt(g, ax, az), yb = heightAt(g, bx, bz), L = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2;
    if (ya === null || yb === null || Math.abs(ya - yb) > L * 0.5) return null;
    // (Over a hump between its ends, up on it: its middle over the ground there too.)
    const ym = heightAt(g, cx, cz) ?? Math.min(ya, yb), up = Math.max(0, ym + Math.min(...lift) - (ya + yb + lift[0] + lift[1]) / 2);
    const ta = ya + lift[0] + up, tb = yb + lift[1] + up, lo = Math.min(ta, tb), hi = Math.max(ta, tb), foot = Math.min(ya, yb) - 0.15;
    const s = hi - lo < 0.02 ? solid(cx - L / 2, foot, cz - w / 2, cx + L / 2, hi, cz + w / 2, mat) : rampSolid(cx - L / 2, foot, cz - w / 2, cx + L / 2, cz + w / 2, Math.max(lo, foot + t), hi, tb > ta ? 1 : 2, mat);
    return turn([s], Math.atan2(bz - az, bx - ax), cx, cz)[0];
  }

  /** What fell from the building beside a patch, between its wall and the patch: sections of its facade, broken
   *  and standing where they landed or lying tipped on the rubble; a column, a beam. */
  function fallen(cells: number[], r: Rng) {
    const k = cells[Math.floor(rand(r) * cells.length)], i = k % mk.w, j = (k - i) / mk.w, b = beside((i + 0.5) * mk.cell, (j + 0.5) * mk.cell);
    if (!b) return;
    const ux = -b.nz, uz = b.nx, big = cells.length >= BIG;
    /** Out from the wall d, along it o. */
    const at = (d: number, o: number): [number, number] => [b.x + b.nx * d + ux * o, b.z + b.nz * d + uz * o];
    for (let m = 0, want = big ? 3 : 1; m < want; m++) for (let tries = 0; tries < 5; tries++) {
      const [x, z] = at(1.5 + rand(r) * Math.min(5, b.t + 1), (rand(r) - 0.5) * 7), w = 2.5 + rand(r) * 2, tip = rand(r) * 0.25;
      const yaw = Math.atan2(uz, ux) + (rand(r) - 0.5) * 0.7, c = Math.cos(yaw), sn = Math.sin(yaw);
      // Standing, broken off where it landed (its windows still in it); or lying tipped on the rubble, its face up.
      const stand = rand(r) < 0.55, d = stand ? 0.15 : 1 + rand(r);
      // (Standing only where the ground's near level across its foot.)
      const piece = stand ? (() => { const p = turn([solid(x - w / 2, 0, z - d, x + w / 2, 1, z + d, b.mat)], yaw, x, z)[0], [lo, hi] = under(p); p.y0 = lo - 0.3; p.y1 = hi + 1.8 + rand(r) * 1.6; return hi - lo < 1.2 ? p : null; })()
        : lying(x - sn * d, z + c * d, x + sn * d, z - c * d, w, 0.3, [0.05 + tip, 0.6 + rand(r) * 0.8], b.mat);
      if (!piece || !Number.isFinite(piece.y0)) continue;
      piece.tint = b.tint;
      if (!lay([piece])) continue;
      // (Where it lies, and the wall it came off.)
      const y = heightAt(g, x, z) ?? piece.y0, gi = features.length;
      features.push({ kind: 'fallen', x, y, z, group: gi, nx: -b.nx, nz: -b.nz }, { kind: 'fallenFrom', x: b.x, y: b.y, z: b.z, group: gi, nx: b.nx, nz: b.nz });
      break;
    }
    // On all but the small ones, a column come down away from the wall and a beam with one end up on the heap.
    for (const [L, beam] of [[4 + rand(r) * 2, false], [5 + rand(r) * 2, true]] as const) for (let tries = 0; tries < 5 && cells.length >= 6; tries++) {
      const [x, z] = at(1.2 + L / 2 + rand(r) * 2, (rand(r) - 0.5) * 6), yaw = Math.atan2(b.nz, b.nx) + (rand(r) - 0.5) * 1.6, dx = (Math.cos(yaw) * L) / 2, dz = (Math.sin(yaw) * L) / 2;
      const piece = beam ? lying(x - dx, z - dz, x + dx, z + dz, 0.3, 0.35, rand(r) < 0.5 ? [0.25, 1.05] : [1.05, 0.25], MAT.metal) : lying(x - dx, z - dz, x + dx, z + dz, 0.55, 0.55, [0.45, 0.45], MAT.concrete);
      if (piece && lay([piece], true)) break;
    }
  }

  /** Boulders of broken concrete sunk in the patch, and rubble settled into its hollows. */
  function boulders(cells: number[], r: Rng) {
    for (let m = Math.min(4, 1 + Math.floor(cells.length / 6)); m > 0; m--) {
      const k = cells[Math.floor(rand(r) * cells.length)], i = k % mk.w, j = (k - i) / mk.w, x = (i + 0.2 + rand(r) * 0.6) * mk.cell, z = (j + 0.2 + rand(r) * 0.6) * mk.cell;
      const a = 0.7 + rand(r) * 1.2, c = 0.6 + rand(r) * 1, h = 0.5 + rand(r) * 0.9, p = turn([solid(x - a / 2, 0, z - c / 2, x + a / 2, 1, z + c / 2, rand(r) < 0.7 ? MAT.concrete : MAT.stone)], rand(r) * 6.3, x, z)[0], [lo, hi] = under(p);
      if (!Number.isFinite(lo) || hi - lo > h) continue;
      p.y0 = lo - 0.25; p.y1 = lo + h;
      lay([p]);
    }
    for (const k of cells) {
      const i = k % mk.w, j = (k - i) / mk.w, h = (a: number, b: number) => heightAt(g, (i + 0.5 + a) * mk.cell, (j + 0.5 + b) * mk.cell) ?? -Infinity, y = h(0, 0);
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => h(a, b) > y + 0.3)) put('rubblepile', (i + 0.5) * mk.cell, (j + 0.5) * mk.cell, rand(r) * 6.3, { w: 3 + rand(r) * 1.5 });
    }
  }

  /** A floor slab come down on its rubble: a crawl space under it 0.6-0.8 m high, open at both ends, 3-5 m long. */
  function crawl(x: number, z: number, yaw: number, r: Rng) {
    const y = heightAt(g, x, z);
    if (y === null) return;
    const L = 3 + rand(r) * 2, h = 0.62 + rand(r) * 0.18;
    const parts = turn([solid(x - L / 2, y + h, z - 1.1, x + L / 2, y + h + 0.25, z + 1.1, MAT.concrete), solid(x - L / 2, y - 0.3, z - 1.1, x + L / 2, y + h, z - 0.6, MAT.rubble),
      solid(x - L / 2, y - 0.3, z + 0.6, x + L / 2, y + h, z + 1.1, MAT.rubble)], yaw, x, z);
    if (parts.some(b => overlaps(index, { ...b, y0: b.y0 + 0.6 }) || solids.some(o => o.x0 < b.x1 && b.x0 < o.x1 && o.z0 < b.z1 && b.z0 < o.z1 && Math.abs(o.y0 - b.y0) < 2))) return;
    solids.push(...parts);
    features.push({ kind: 'crawlspace', x, y, z, group: features.length, nx: Math.cos(yaw), nz: Math.sin(yaw) });
  }

  /** A collapsed building at cell k: a broken corner of wall, slabs piled against it, rubble round it. */
  function collapse(k: number, r: Rng): number {
    const i = k % mk.w, j = (k - i) / mk.w, cx = (i + 0.5) * mk.cell, cz = (j + 0.5) * mk.cell, yaw = fall(i, j).yaw, c = Math.cos(yaw), s = Math.sin(yaw);
    // In the heap's frame: u across the slope, v down it.
    const at = (u: number, v: number): [number, number] => [cx + u * c + v * s, cz - u * s + v * c];
    let n = 0;
    n += +put('halfwall', ...at(-2, -1.5), yaw, { w: 4 + rand(r) * 2, h: 2.5 + rand(r) * 2 });
    n += +put('halfwall', ...at(0.5, -3.5), yaw + Math.PI / 2, { w: 3 + rand(r) * 2, h: 1.5 + rand(r) * 2 });
    for (let m = 0; m < 3; m++) n += +put('slab', ...at(-0.5 + m * 1.6, 0.5 + rand(r)), yaw + (rand(r) - 0.5) * 0.8);
    for (let m = 0; m < 4; m++) n += +put('rubblepile', ...at((rand(r) - 0.5) * 7, 1 + rand(r) * 4), rand(r) * 6.3, { w: 2 + rand(r) * 2 });
    n += +put('rebar', ...at(1.5, -1), rand(r) * 6.3);
    return n;
  }
}
