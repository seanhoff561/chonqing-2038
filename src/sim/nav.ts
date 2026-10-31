// Pathing on the machines' ways (M4-02): A* over the nav graph between the points nearest two places, each kind
// of unit on the stretches it can take (a delivery robot no stairs and nothing steep; the others everything).
import { NAV, type Nav } from '../world/world';
import type { UnitKind } from '../data/units';

type V3 = { x: number; y: number; z: number };
export interface NavPath { pts: V3[]; kinds: number[]; length: number }

/** Which stretches a kind of unit can take. */
export function canTake(kind: UnitKind | 'street', e: [number, number, number], from: V3, to: V3): boolean {
  if (kind === 'street') return e[2] !== NAV.tunnel;
  if (kind === 'delivery' || kind === 'carrier') return e[2] === NAV.street && Math.abs(to.y - from.y) <= 0.15 * e[1] + 0.1;
  return true;
}

/** The nav point nearest a place, within r, that has a way out of it. */
export function nearestNav(nav: Nav, p: V3, r = 60): number {
  let best = -1, bd = r;
  nav.pts.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.z - p.z) + Math.abs(q.y - p.y) * 2; if (nav.adj[i].length && d < bd) { bd = d; best = i; } });
  return best;
}

/** The shortest way between two places for a kind of unit ('street': along the streets and stairs only), or null. */
export function navPath(nav: Nav, from: V3, to: V3, kind: UnitKind | 'street'): NavPath | null {
  const a = nearestNav(nav, from), b = nearestNav(nav, to), P = nav.pts;
  if (a < 0 || b < 0) return null;
  const dist = new Float64Array(P.length).fill(Infinity), prev = new Int32Array(P.length).fill(-1), via = new Int8Array(P.length), heap: [number, number][] = [];
  const hd = (i: number) => Math.hypot(P[i].x - P[b].x, P[i].y - P[b].y, P[i].z - P[b].z);
  const push = (f: number, i: number) => { heap.push([f, i]); for (let k = heap.length - 1; k > 0;) { const q = (k - 1) >> 1; if (heap[q][0] <= heap[k][0]) break; [heap[q], heap[k]] = [heap[k], heap[q]]; k = q; } };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) { heap[0] = last; for (let k = 0; ;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } }
    return top;
  };
  dist[a] = 0; push(hd(a), a);
  while (heap.length) {
    const [f, i] = pop();
    if (i === b) break;
    if (f - hd(i) > dist[i] + 1e-9) continue;
    for (const e of nav.adj[i]) {
      const j = e[0], c = dist[i] + e[1];
      if (c < dist[j] && canTake(kind, e, P[i], P[j])) { dist[j] = c; prev[j] = i; via[j] = e[2]; push(c + hd(j), j); }
    }
  }
  if (!Number.isFinite(dist[b])) return null;
  const way: number[] = [];
  for (let i = b; i >= 0; i = prev[i]) way.unshift(i);
  return { pts: way.map(i => ({ ...P[i] })), kinds: way.slice(1).map(i => via[i]), length: dist[b] };
}
