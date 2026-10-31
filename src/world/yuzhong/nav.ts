// The machines' ways about on foot (M4-02): every street in stretches of 4 m or less, each walkable as the finished
// world stands (a clear way at body height somewhere across it, not steeper than a stair: a parked car doesn't close
// it, a wall across it or a building does), the stepped streets' stretches marked stairs; joined where streets meet
// (the map's simplified lines don't share junction points). And the walks recorded under the ground (the stepped
// streets' descents, the metro's way, the underground city's), stitched to the streets and to each other where their
// points come within a few metres at much the same height.
import { raycast, type SolidIndex } from '../geom';
import { heightAt, type Heightfield } from '../heightfield';
import { onGround, type Street } from './ground';
import { NAV, type Nav } from '../world';

type V3 = { x: number; y: number; z: number };

/** Whether a stretch w wide from p to q has a clear way at 1 m up somewhere across it. */
export function clearAcross(idx: SolidIndex, p: V3, q: V3, w: number): boolean {
  const h = Math.hypot(q.x - p.x, q.z - p.z) || 1, L = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z), lx = -(q.z - p.z) / h, lz = (q.x - p.x) / h;
  if (L < 0.01) return true;
  return [0, -w / 3, w / 3].some(o => !raycast(idx, p.x + lx * o, p.y + 1, p.z + lz * o, (q.x - p.x) / L, (q.y - p.y) / L, (q.z - p.z) / L, L));
}

export function buildNav(sts: Street[], g: Heightfield, idx: SolidIndex, walks: V3[][]): Nav {
  const ids = new Map<string, number>(), pts: V3[] = [], adj: [number, number, number][][] = [], of: number[] = [], width: number[] = [];
  const node = (x: number, y: number, z: number) => {
    const k = `${Math.round(x * 2)},${Math.round(y)},${Math.round(z * 2)}`;
    let i = ids.get(k);
    if (i === undefined) { i = pts.length; ids.set(k, i); pts.push({ x, y, z }); adj.push([]); }
    return i;
  };
  const link = (a: number, b: number, kind: number) => {
    if (a === b) return;
    const d = Math.hypot(pts[b].x - pts[a].x, pts[b].y - pts[a].y, pts[b].z - pts[a].z);
    adj[a].push([b, d, kind]); adj[b].push([a, d, kind]);
  };
  const walkable = (a: number, b: number, w: number) => Math.abs(pts[b].y - pts[a].y) <= Math.hypot(pts[b].x - pts[a].x, pts[b].z - pts[a].z) * 0.9 + 0.3 && clearAcross(idx, pts[a], pts[b], w);
  sts.forEach((s, si) => {
    if (!onGround(s)) return;
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 4));
      for (let i = 0; i < n; i++) {
        const x0 = ax + ((bx - ax) * i) / n, z0 = az + ((bz - az) * i) / n, x1 = ax + ((bx - ax) * (i + 1)) / n, z1 = az + ((bz - az) * (i + 1)) / n;
        const a = node(x0, heightAt(g, x0, z0) ?? 0, z0), b = node(x1, heightAt(g, x1, z1) ?? 0, z1);
        for (const q of [a, b]) { of[q] ??= si; width[q] = Math.max(width[q] ?? 0, s.w); }
        if (a !== b && walkable(a, b, s.w)) link(a, b, s.steps ? NAV.stairs : NAV.street);
      }
    }
  });
  // Where streets meet: each point joins the nearest of every other street's within half the wider one's width, at
  // much its height (not one that passes over or under it).
  const cell = new Map<number, number[]>(), ck = (x: number, z: number) => Math.floor(x / 8) * 100003 + Math.floor(z / 8);
  pts.forEach((p, i) => { const k = ck(p.x, p.z); (cell.get(k) ?? cell.set(k, []).get(k)!).push(i); });
  const streetPts = pts.length;
  for (let i = 0; i < streetPts; i++) {
    const p = pts[i], best = new Map<number, [number, number]>();
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const j of cell.get(ck(p.x + dx * 8, p.z + dz * 8)) ?? []) {
      if (of[j] === of[i]) continue;
      const d = Math.hypot(pts[j].x - p.x, pts[j].z - p.z), b = best.get(of[j]);
      if (d < Math.max(width[i], width[j]) / 2 + 0.5 && Math.abs(pts[j].y - p.y) < 0.5 + d * 0.4 && (!b || d < b[1])) best.set(of[j], [j, d]);
    }
    for (const [j] of best.values()) if ((j > i || !best.has(of[i])) && walkable(i, j, Math.min(width[i], width[j]))) link(i, j, NAV.street);
  }
  // The walks under the ground, each a chain; then each bend stitched to the nearest point of the streets or another
  // walk within 6 m and 1.5 m of height, and each end to the streets within 30 m where the way there is clear (a
  // descent's mouth opens off a street).
  const walkPts: number[][] = walks.filter(wk => wk.length > 1).map(wk => wk.map(q => node(q.x, q.y, q.z)));
  for (const chain of walkPts) for (let k = 0; k + 1 < chain.length; k++) link(chain[k], chain[k + 1], NAV.tunnel);
  walkPts.forEach((chain, c) => {
    for (const i of [chain[0], chain[chain.length - 1]]) {
      let best = -1, bd = 30;
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) for (const j of cell.get(ck(pts[i].x + dx * 8, pts[i].z + dz * 8)) ?? []) {
        const d = Math.hypot(pts[j].x - pts[i].x, pts[j].z - pts[i].z);
        if (d < bd && walkable(i, j, 1.5)) { bd = d; best = j; }
      }
      if (best >= 0) link(i, best, NAV.street);
    }
    for (const i of chain) {
      let best = -1, bd = 6;
      const own = new Set(chain);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const j of cell.get(ck(pts[i].x + dx * 8, pts[i].z + dz * 8)) ?? []) {
        const d = Math.hypot(pts[j].x - pts[i].x, pts[j].z - pts[i].z);
        if (d < bd && Math.abs(pts[j].y - pts[i].y) < 1.5) { bd = d; best = j; }
      }
      for (const [o, other] of walkPts.entries()) if (o !== c) for (const j of other) {
        const d = Math.hypot(pts[j].x - pts[i].x, pts[j].z - pts[i].z);
        if (!own.has(j) && d < bd && Math.abs(pts[j].y - pts[i].y) < 1.5) { bd = d; best = j; }
      }
      if (best >= 0) link(i, best, NAV.tunnel);
    }
  });
  return { pts, adj };
}

/** The walks recorded under the ground, from the world's features: each stepped street's descent, the metro's way
 *  to the friends' chamber, the underground city's route; in order. */
export function walksOf(features: { kind: string; x: number; y: number; z: number; group: number }[]): V3[][] {
  const out = new Map<string, { g: number; p: V3 }[]>();
  for (const f of features) {
    if (f.kind !== 'descentRoute' && f.kind !== 'metroRoute' && f.kind !== 'underRoute') continue;
    const k = f.kind === 'descentRoute' ? `d${Math.floor(f.group / 100)}` : f.kind;
    (out.get(k) ?? out.set(k, []).get(k)!).push({ g: f.group, p: { x: f.x, y: f.y, z: f.z } });
  }
  return [...out.values()].map(l => l.sort((a, b) => a.g - b.g).map(q => q.p));
}
