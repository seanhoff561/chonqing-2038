// The ant-hill route network (M3-37, U-014, U-021, U-023, U-037, U-038): the city's ways off the streets as a
// graph and the routes along it. Its nodes are the roofs; its edges what joins them: the connections (crossings,
// cable bundles, bars, walkways, skybridges) and the jumps and drops between roofs within the movement envelope.
// Main routes run like highways between the districts' centres, branches off them to the shelters; where the graph
// doesn't join up a makeshift crossing is laid. Along a route the way reads: a path worn across each roof, a rag
// tied where it crosses. Machines' beats are laid against the routes (M4 walks them): street patrols, drone
// corridors over the routes by night, and one of each over the start hideout's grate. And now and then a cache
// reached only one way, with a tool (U-037): a roof none of its neighbours reach, no hold on its walls, a grappling
// hook's anchor on its edge toward a roof across the way.
import { solid } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand, type Rng } from '../../sim/rng';
import { ENVELOPE as E } from '../../data/envelope';
import { heightAt, type Heightfield } from '../heightfield';
import type { Feature, Plot, Site, Route, Patrol, Gate, Inter, Prop } from '../world';
import { ROAD, type Street } from './ground';
import { minRect, obbOverlap, type Obb } from './shapes';
import { BARE } from '../city/climb';
import { member, cord } from './crossings';
import type { Vertical } from './vertical';
import type { Plan } from './lots';

type V3 = { x: number; y: number; z: number };
const PARAPET = 0.6;
/** The connections that join two roofs or two walls, by their features' kind. */
const JOINS = ['crossPlank', 'crossBeam', 'crossCord', 'cord', 'walkway', 'gapBar', 'skybridge'];

/** Caches reached only by grappling hook (U-037), chosen before anything is built: a block none of its neighbours'
 *  roofs reach (none within a running jump that isn't 4 m and more below it), with a roof 7-16 m off to shoot from.
 *  Marked sheer: no holds, nothing joining it. Returns [cache, from]. */
export function pickGates(plans: Plan[], r: Rng, count = 5): [Plan, Plan][] {
  const live = plans.filter(p => !p.far && p.kind !== 'tower'), out: [Plan, Plan][] = [];
  const cands = live.filter(p => p.kind === 'res' && !p.osm && p.wall - p.base >= 15 && p.wall - p.base <= 45 && Math.min(p.obb.hw, p.obb.hd) >= 3);
  for (let t = 0; t < 4000 && out.length < count; t++) {
    const p = cands[Math.floor(rand(r) * cands.length)];
    if (!p || p.sheer || out.some(([c]) => Math.hypot(c.obb.cx - p.obb.cx, c.obb.cz - p.obb.cz) < 250)) continue;
    const near = live.filter(q => q !== p && Math.hypot(q.obb.cx - p.obb.cx, q.obb.cz - p.obb.cz) < 60);
    if (near.some(q => obbOverlap(p.obb, q.obb, E.runningJump.max / 2 + 0.3) && q.wall > p.wall - 4.5)) continue;
    const from = near.find(q => obbOverlap(p.obb, q.obb, 8) && !obbOverlap(p.obb, q.obb, E.runningJump.max / 2 + 0.3) && Math.abs(q.wall - p.wall) <= 4);
    if (!from) continue;
    p.sheer = true; p.noEnter = true;
    out.push([p, from]);
  }
  return out;
}

/** Whether a cache is still out of every roof's reach once the roofs are final (the connections may set some to
 *  meet after the caches are chosen). */
export const isolated = ([p]: [Plan, Plan], plans: Plan[]) =>
  !plans.some(q => q !== p && !q.far && obbOverlap(p.obb, q.obb, E.runningJump.max / 2 + 0.3) && q.wall > p.wall - 4.5);

/** Each cache, once built: a crate on its roof (key supplies, a container), a steel post on its parapet toward the
 *  roof it's reached from, to hook. */
export function placeGates(pairs: [Plan, Plan][], out: Vertical & { inter: Inter[]; props: Prop[] }): Gate[] {
  return pairs.map(([p, q], n) => {
    const dx = q.obb.cx - p.obb.cx, dz = q.obb.cz - p.obb.cz, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
    const y = p.wall;
    // Its edge toward q, where the line between them leaves it.
    const ext = exit(p.obb, ux, uz), ax = p.obb.cx + ux * (ext - 0.25), az = p.obb.cz + uz * (ext - 0.25);
    out.solids.push(solid(ax - 0.08, y, az - 0.08, ax + 0.08, y + PARAPET + 0.9, az + 0.08, MAT.metal));
    out.features.push({ kind: 'grapple', x: ax, y: y + PARAPET + 0.8, z: az, group: out.features.length, nx: ux, nz: uz });
    out.solids.push(solid(p.obb.cx - 0.5, y, p.obb.cz - 0.4, p.obb.cx + 0.5, y + 0.8, p.obb.cz + 0.4, MAT.hidden));
    out.props.push({ kind: 'f:crate', x: p.obb.cx, y, z: p.obb.cz, yaw: p.obb.yaw, w: 1.0, h: 0.8, d: 0.8 });
    out.inter.push({ id: `cache${n}`, kind: 'container', x: p.obb.cx, y: y + 0.5, z: p.obb.cz + 0.45, r: 0.8, zh: '储藏箱', en: 'Cache', data: { type: 'crate', loot: 'medicine' } });
    const qe = exit(q.obb, ux, uz);
    return { tool: 'grapple', x: ax, y: y + PARAPET + 0.8, z: az, from: { x: q.obb.cx - ux * (qe - 0.5), y: q.wall + 0.05, z: q.obb.cz - uz * (qe - 0.5) } };
  });
}

/** The graph, the routes, their marks and the beats. `grate` is the start hideout's way out. */
export function network(plots: Plot[], features: Feature[], sites: Site[], sts: Street[], g: Heightfield, anchors: V3[][], grate: V3, out: Vertical, gates: Gate[]): { routes: Route[]; patrols: Patrol[] } {
  const r = makeRng(hashString('network'));
  const nodes = plots.filter(p => !p.far), obb = nodes.map(p => minRect(p.corners)), n = nodes.length;
  const edges: { a: number; b: number; w: number; kind: string; pa: V3; pb: V3 }[][] = nodes.map(() => []);
  const link = (a: number, b: number, w: number, kind: string, pa: V3, pb: V3) => { edges[a].push({ a, b, w, kind, pa, pb }); edges[b].push({ a: b, b: a, w, kind, pa: pb, pb: pa }); };
  const cells = new Map<string, number[]>(), key = (x: number, z: number) => `${Math.floor(x / 48)},${Math.floor(z / 48)}`;
  obb.forEach((o, i) => (cells.get(key(o.cx, o.cz)) ?? cells.set(key(o.cx, o.cz), []).get(key(o.cx, o.cz))!).push(i));
  const around = (x: number, z: number) => { const out: number[] = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push(...(cells.get(`${Math.floor(x / 48) + i},${Math.floor(z / 48) + j}`) ?? [])); return out; };
  /** The roof a point stands on or against: inside a footprint grown 1.5 m, the nearest centre. */
  const owner = (x: number, z: number): number => {
    let best = -1, bd = Infinity;
    for (const i of around(x, z)) {
      const o = obb[i], c = Math.cos(o.yaw), s = Math.sin(o.yaw), dx = x - o.cx, dz = z - o.cz, u = Math.abs(dx * c + dz * s), v = Math.abs(-dx * s + dz * c);
      if (u > o.hw + 1.5 || v > o.hd + 1.5) continue;
      const d = Math.hypot(dx, dz);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const roof = (i: number): V3 => ({ x: obb[i].cx, y: nodes[i].wall, z: obb[i].cz });
  // Edges: the connections' two ends.
  const groups = new Map<number, Feature[]>();
  for (const f of features) if (JOINS.includes(f.kind)) (groups.get(f.group) ?? groups.set(f.group, []).get(f.group)!).push(f);
  for (const fs of groups.values()) {
    if (fs.length !== 2) continue;
    const a = owner(fs[0].x, fs[0].z), b = owner(fs[1].x, fs[1].z);
    if (a >= 0 && b >= 0 && a !== b) link(a, b, 1, fs[0].kind, fs[0], fs[1]);
  }
  // And the jumps and drops between roofs within the envelope: across a running jump, up a mantle, down a safe drop.
  for (let i = 0; i < n; i++) for (const j of around(obb[i].cx, obb[i].cz)) {
    if (j <= i || !obbOverlap(obb[i], obb[j], E.runningJump.comfortable / 2) || obbOverlap(obb[i], obb[j], 0.2)) continue;
    const dh = nodes[j].top - nodes[i].top;
    if (Math.abs(dh) <= 1.2) link(i, j, 2, 'jump', roof(i), roof(j));
    else if (Math.abs(dh) <= E.safeDropRoll.comfortable) {
      // One way: down. (Up is a climb, a way of its own.)
      const [hi, lo] = dh > 0 ? [j, i] : [i, j];
      edges[hi].push({ a: hi, b: lo, w: 4, kind: 'drop', pa: roof(hi), pb: roof(lo) });
    }
  }
  const sheer = new Set(gates.map(q => owner(q.x, q.z)));
  type Edge = (typeof edges)[number][number];
  // Shortest ways (Dijkstra on a binary heap), never through a gated cache: the edges from `from` to `to`.
  const path = (from: number, to: number): Edge[] | null => {
    const dist = new Float64Array(n).fill(Infinity), prev = new Array<Edge | null>(n).fill(null), heap: [number, number][] = [[0, from]];
    const push = (d: number, i: number) => { heap.push([d, i]); for (let k = heap.length - 1; k > 0;) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; for (let k = 0; ;) { const l = 2 * k + 1, rr = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    dist[from] = 0;
    while (heap.length) {
      const [d, i] = pop();
      if (d > dist[i]) continue;
      if (i === to) break;
      for (const e of edges[i]) if (!sheer.has(e.b) && d + e.w < dist[e.b]) { dist[e.b] = d + e.w; prev[e.b] = e; push(dist[e.b], e.b); }
    }
    if (!Number.isFinite(dist[to])) return null;
    const steps: Edge[] = [];
    for (let i = to; prev[i]; i = prev[i]!.a) steps.unshift(prev[i]!);
    return steps;
  };
  /** The roof for a place: the nearest roof within 150 m that joins the most others. */
  const nodeAt = (p: V3) => {
    let best = -1, score = -Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(obb[i].cx - p.x, obb[i].cz - p.z);
      if (d > 150 || sheer.has(i)) continue;
      const s = edges[i].length * 10 - d;
      if (s > score) { score = s; best = i; }
    }
    return best;
  };
  // Where the graph doesn't join up (across a street, mostly), a crossing could be laid: between roofs 30 m or less
  // apart, their tops close enough for a plank, a beam or a cable, high enough over the ground between. Paths may
  // use these at a cost; the ones they use are built.
  for (let i = 0; i < n; i++) for (const j of around(obb[i].cx, obb[i].cz)) {
    if (j <= i || sheer.has(i) || sheer.has(j) || !obbOverlap(obb[i], obb[j], 17.5) || obbOverlap(obb[i], obb[j], E.runningJump.comfortable / 2)) continue;
    const pi = edgeTo(obb[i], obb[j]), pj = edgeTo(obb[j], obb[i]), gap = Math.hypot(pj.x - pi.x, pj.z - pi.z), ya = nodes[i].top, yb = nodes[j].top;
    const ground = Math.max(...[0.25, 0.5, 0.75].map(t => heightAt(g, pi.x + (pj.x - pi.x) * t, pi.z + (pj.z - pi.z) * t) ?? 0));
    // (A plank or a beam level-ish; a cable bundle may climb, a third of its length at most.)
    if (gap > 35 || Math.abs(ya - yb) > (gap > 14 ? Math.min(12, gap / 3) : Math.min(4, gap * 0.4)) || Math.min(ya, yb) - ground < BARE + 1 + gap * 0.02) continue;
    link(i, j, 25 + gap, 'build', { x: pi.x, y: ya, z: pi.z }, { x: pj.x, y: yb, z: pj.z });
  }
  /** Lay a crossing a path chose: a plank to 7 m, an I-beam to 14, a cable bundle past that. */
  const lay = (e: Edge): string => {
    const A3: [number, number, number] = [e.pa.x, e.pa.y, e.pa.z], B3: [number, number, number] = [e.pb.x, e.pb.y, e.pb.z], gap = Math.hypot(B3[0] - A3[0], B3[2] - A3[2]);
    const kind = gap <= 7 ? 'crossPlank' : gap <= 14 ? 'crossBeam' : 'crossCord';
    if (kind === 'crossPlank') out.solids.push(member(A3, B3, 0.7, 0.08, MAT.wood));
    else if (kind === 'crossBeam') { out.solids.push(member(A3, B3, 0.3, 0.04, MAT.metal)); out.decor.push(member([A3[0], A3[1] - 0.04, A3[2]], [B3[0], B3[1] - 0.04, B3[2]], 0.04, 0.28, MAT.metal)); }
    else cord(A3, B3, 0.25 + gap * 0.02, r, out, true);
    out.features.push({ kind: 'routeLink', x: A3[0], y: A3[1], z: A3[2], group: out.features.length, nx: (B3[0] - A3[0]) / gap, nz: (B3[2] - A3[2]) / gap });
    // Built now: cheap for the paths after, both ways.
    for (const [x, y] of [[e.a, e.b], [e.b, e.a]]) for (const f of edges[x]) if (f.b === y && f.kind === 'build') { f.kind = kind; f.w = 1; }
    return kind;
  };
  const routes: Route[] = [];
  const along = (id: string, kind: Route['kind'], a: number, b: number) => {
    const p = path(a, b);
    if (!p || !p.length) return;
    const pts: V3[] = [], ways: string[] = [];
    for (const e of p) { pts.push({ ...e.pa }, { ...e.pb }); ways.push(e.kind === 'build' ? lay(e) : e.kind); }
    routes.push({ id, kind, pts, ways });
    // The way read on the ground (U-014): a path worn across each roof between where it comes on and goes off it,
    // a rag tied on a stake where it leaves a roof onto a connection.
    for (let k = 0; k + 1 < p.length; k++) {
      const i = p[k].b, y = nodes[i].wall, on = k === 0 ? roof(p[0].a) : p[k].pb, offAt = p[k + 1].pa, l = Math.hypot(offAt.x - on.x, offAt.z - on.z);
      for (let t = 0; t < l && l < 60; t += 1.5) {
        const x = on.x + ((offAt.x - on.x) * t) / l, z = on.z + ((offAt.z - on.z) * t) / l, w = 0.3 + rand(r) * 0.2;
        out.decor.push(solid(x - w, y + 0.004, z - w, x + w, y + 0.008, z + w, MAT.asphalt));
      }
      if (p[k + 1].kind !== 'jump' && p[k + 1].kind !== 'drop') {
        const x = offAt.x, z = offAt.z;
        out.decor.push(solid(x - 0.02, y, z - 0.02, x + 0.02, y + 1.1, z + 0.02, MAT.wood));
        const rag = solid(x - 0.02, y + 0.7, z - 0.15, x + 0.02, y + 1.05, z + 0.15, MAT.cloth);
        rag.tint = 0xb02a1e;
        out.decor.push(rag);
      }
    }
  };
  // Main routes: chains of the districts' centres.
  anchors.forEach((chain, c) => { for (let k = 0; k + 1 < chain.length; k++) { const a = nodeAt(chain[k]), b = nodeAt(chain[k + 1]); if (a >= 0 && b >= 0 && a !== b) along(`main${c}.${k}`, 'main', a, b); } });
  // Branches: from the main routes to the shelters within 300 m of them (one in three, up to 30).
  const onMain = new Set<number>();
  for (const rt of routes) for (const q of rt.pts) { const i = owner(q.x, q.z); if (i >= 0) onMain.add(i); }
  let branches = 0;
  const reached = new Set<number>();
  for (const st of sites) {
    if (branches >= 30 || rand(r) > 0.35) continue;
    const t = nodeAt({ x: st.x, y: st.y, z: st.z });
    if (t < 0 || onMain.has(t) || reached.has(t)) continue;
    reached.add(t);
    let best = -1, bd = 300;
    for (const i of onMain) { const d = Math.hypot(obb[i].cx - obb[t].cx, obb[i].cz - obb[t].cz); if (d < bd) { bd = d; best = i; } }
    if (best >= 0) { const before = routes.length; along(`branch${branches}`, 'branch', best, t); if (routes.length > before) branches++; }
  }
  return { routes, patrols: beats(routes, sts, g, grate) };
}

/** How far from a footprint's centre the line along (ux, uz) leaves it. */
const exit = (a: Obb, ux: number, uz: number) => { const c = Math.cos(a.yaw), s = Math.sin(a.yaw), pu = Math.abs(ux * c + uz * s), pv = Math.abs(-ux * s + uz * c); return Math.min(pu > 1e-6 ? a.hw / pu : Infinity, pv > 1e-6 ? a.hd / pv : Infinity); };
/** Where a footprint's edge meets the line to another's centre (a step in from it). */
function edgeTo(a: Obb, b: Obb) {
  const dx = b.cx - a.cx, dz = b.cz - a.cz, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, t = exit(a, ux, uz);
  return { x: a.cx + ux * (t - 0.3), z: a.cz + uz * (t - 0.3) };
}

/** The machines' beats against the routes (laid here, walked in M4): patrols along the main roads day and night,
 *  drone corridors over the main routes by night, and one of each over the start hideout's grate at night (U-018). */
function beats(routes: Route[], sts: Street[], g: Heightfield, grate: V3): Patrol[] {
  const out: Patrol[] = [], gy = (x: number, z: number) => heightAt(g, x, z) ?? 0;
  const roads = sts.filter(s => ROAD.has(s.kind) && s.pts.length > 1).map(s => ({ s, len: s.pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - s.pts[i - 1][0], p[1] - s.pts[i - 1][1]) : 0), 0) })).sort((a, b) => b.len - a.len);
  for (const { s } of roads.slice(0, 10)) out.push({ kind: 'street', pts: s.pts.map(([x, z]) => ({ x, y: gy(x, z) + 1, z })), hours: [0, 24] });
  for (const rt of routes.filter(q => q.kind === 'main')) {
    const top = Math.max(...rt.pts.map(p => p.y));
    out.push({ kind: 'drone', pts: rt.pts.filter((_, i) => i % 4 === 0).map(p => ({ x: p.x, y: top + 12, z: p.z })), hours: [19, 6] });
  }
  // Over the grate: the nearest road's patrol turned down past it, and a drone line across it.
  let near: [number, number] = [grate.x + 40, grate.z], bd = Infinity;
  for (const { s } of roads) for (const [x, z] of s.pts) { const d = Math.hypot(x - grate.x, z - grate.z); if (d < bd) { bd = d; near = [x, z]; } }
  out.push({ kind: 'street', pts: [{ x: near[0], y: gy(near[0], near[1]) + 1, z: near[1] }, { x: grate.x, y: grate.y + 1, z: grate.z }, { x: 2 * grate.x - near[0], y: gy(2 * grate.x - near[0], 2 * grate.z - near[1]) + 1, z: 2 * grate.z - near[1] }], hours: [21, 5] });
  out.push({ kind: 'drone', pts: [{ x: grate.x - 120, y: grate.y + 25, z: grate.z - 40 }, { x: grate.x, y: grate.y + 18, z: grate.z }, { x: grate.x + 120, y: grate.y + 25, z: grate.z + 40 }], hours: [20, 6] });
  return out;
}
