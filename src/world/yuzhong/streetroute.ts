// The street layer between the district's key points (M3-21): the shortest way along the streets and stairs of the
// machines' nav graph (M4-02), laid out as the network's routes are: the start, each stretch's two ends, the end.
import { navPath } from '../../sim/nav';
import type { Nav, Route } from '../world';

type V3 = { x: number; y: number; z: number };

export function streetRoute(nav: Nav, id: string, from: V3, to: V3): Route | null {
  const p = navPath(nav, from, to, 'street');
  if (!p) return null;
  const out: Route = { id, kind: 'link', pts: [{ ...p.pts[0] }], on: [], ways: [] };
  for (let k = 0; k + 1 < p.pts.length; k++) { out.pts.push({ ...p.pts[k] }, { ...p.pts[k + 1] }); out.on.push('ground', 'ground'); out.ways.push('street'); }
  out.pts.push({ ...p.pts[p.pts.length - 1] }); out.on.push('ground');
  return out;
}
