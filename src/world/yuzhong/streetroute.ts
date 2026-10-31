// The street layer between the district's key points (M3-21): along the streets' lines on the ground, junction to
// junction, every stretch of 8 m or less walkable as the world stands (a clear way at body height somewhere across
// the street: a parked car or a stall doesn't close it, a wall across it or a building does).
import { raycast, type SolidIndex } from '../geom';
import { heightAt, type Heightfield } from '../heightfield';
import { onGround, type Street } from './ground';
import type { Route } from '../world';

type V3 = { x: number; y: number; z: number };

/** Whether a stretch of street w wide from p to q has a clear way at 1 m up somewhere across it. */
export function clearAcross(idx: SolidIndex, p: V3, q: V3, w: number): boolean {
  const L = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z), lx = -(q.z - p.z) / (Math.hypot(q.x - p.x, q.z - p.z) || 1), lz = (q.x - p.x) / (Math.hypot(q.x - p.x, q.z - p.z) || 1);
  if (L < 0.01) return true;
  return [0, -w / 3, w / 3].some(o => !raycast(idx, p.x + lx * o, p.y + 1, p.z + lz * o, (q.x - p.x) / L, (q.y - p.y) / L, (q.z - p.z) / L, L));
}

/** The streets as a graph of walkable stretches; returns the way along them between two points (from the street
 *  points nearest them, within 60 m), laid out as the network's routes are. */
export function streetGraph(sts: Street[], g: Heightfield, idx: SolidIndex): (id: string, from: V3, to: V3) => Route | null {
  const ids = new Map<string, number>(), pts: V3[] = [], adj: [number, number][][] = [];
  const node = (x: number, z: number) => {
    const k = `${Math.round(x * 2)},${Math.round(z * 2)}`;
    let i = ids.get(k);
    if (i === undefined) { i = pts.length; ids.set(k, i); pts.push({ x, y: heightAt(g, x, z) ?? 0, z }); adj.push([]); }
    return i;
  };
  const join = (a: number, b: number, w: number) => {
    // (Not where the ground falls steeper than a stair: a street over a drop the map's heights put there.)
    if (a === b || Math.abs(pts[b].y - pts[a].y) > Math.hypot(pts[b].x - pts[a].x, pts[b].z - pts[a].z) * 0.9 + 0.3 || !clearAcross(idx, pts[a], pts[b], w)) return;
    const d = Math.hypot(pts[b].x - pts[a].x, pts[b].y - pts[a].y, pts[b].z - pts[a].z);
    adj[a].push([b, d]); adj[b].push([a, d]);
  };
  // Each street in stretches of 4 m or less.
  const of: number[] = [], width: number[] = [];
  sts.forEach((s, si) => {
    if (!onGround(s)) return;
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 4));
      for (let i = 0; i < n; i++) {
        const a = node(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n), b = node(ax + ((bx - ax) * (i + 1)) / n, az + ((bz - az) * (i + 1)) / n);
        for (const q of [a, b]) { of[q] ??= si; width[q] = Math.max(width[q] ?? 0, s.w); }
        join(a, b, s.w);
      }
    }
  });
  // Where streets meet: the map's lines are simplified, so a junction's streets needn't share a point. Each point
  // joins the nearest of every other street's within half the wider one's width, at much its height (not one that
  // passes over or under it).
  const cell = new Map<number, number[]>(), ck = (x: number, z: number) => Math.floor(x / 8) * 100003 + Math.floor(z / 8);
  pts.forEach((p, i) => { const k = ck(p.x, p.z); (cell.get(k) ?? cell.set(k, []).get(k)!).push(i); });
  pts.forEach((p, i) => {
    const best = new Map<number, [number, number]>();
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const j of cell.get(ck(p.x + dx * 8, p.z + dz * 8)) ?? []) {
      if (of[j] === of[i]) continue;
      const d = Math.hypot(pts[j].x - p.x, pts[j].z - p.z), b = best.get(of[j]);
      if (d < Math.max(width[i], width[j]) / 2 + 0.5 && Math.abs(pts[j].y - p.y) < 0.5 + d * 0.4 && (!b || d < b[1])) best.set(of[j], [j, d]);
    }
    for (const [j] of best.values()) if (j > i || !best.has(of[i])) join(i, j, Math.min(width[i], width[j]));
  });
  const nearest = (p: V3) => { let best = -1, bd = 60; pts.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.z - p.z); if (adj[i].length && d < bd) { bd = d; best = i; } }); return best; };
  return (id, from, to) => {
    const a = nearest(from), b = nearest(to);
    if (a < 0 || b < 0) return null;
    // A* on a binary heap.
    const dist = new Float64Array(pts.length).fill(Infinity), prev = new Int32Array(pts.length).fill(-1), heap: [number, number][] = [];
    const hd = (i: number) => Math.hypot(pts[i].x - pts[b].x, pts[i].z - pts[b].z);
    const push = (f: number, i: number) => { heap.push([f, i]); for (let k = heap.length - 1; k > 0;) { const q = (k - 1) >> 1; if (heap[q][0] <= heap[k][0]) break; [heap[q], heap[k]] = [heap[k], heap[q]]; k = q; } };
    const pop = () => {
      const top = heap[0], last = heap.pop()!;
      if (heap.length) { heap[0] = last; for (let k = 0; ;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } }
      return top;
    };
    dist[a] = 0; push(hd(a), a);
    while (heap.length) {
      const [, i] = pop();
      if (i === b) break;
      for (const [j, d] of adj[i]) if (dist[i] + d < dist[j]) { dist[j] = dist[i] + d; prev[j] = i; push(dist[j] + hd(j), j); }
    }
    if (!Number.isFinite(dist[b])) return null;
    const way: number[] = [];
    for (let i = b; i >= 0; i = prev[i]) way.unshift(i);
    // As the network's routes are laid out: the start, each stretch's two ends, the end.
    const out: Route = { id, kind: 'link', pts: [{ ...pts[a] }], on: [], ways: [] };
    for (let k = 0; k + 1 < way.length; k++) { out.pts.push({ ...pts[way[k]] }, { ...pts[way[k + 1]] }); out.on.push('ground', 'ground'); out.ways.push('street'); }
    out.pts.push({ ...pts[b] }); out.on.push('ground');
    return out;
  };
}
