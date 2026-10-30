// The ant-hill route network (M3-37, M3-76, U-014, U-021, U-023, U-037, U-038, U-043): the city's ways off the
// streets as a graph and the routes along it, a three-dimensional ant hill mostly through buildings. Its nodes are
// the insides of the buildings with rooms, their roofs, the ground at the ways in and down, and the underground; its
// edges the ways between them: window to window across a narrow way, out of a window onto a roof (and back up in),
// up a stairwell to the roof, in by a hole broken low from an alley or a street door, down to the underground; and
// roof to roof the connections (crossings, cable bundles, bars, walkways, skybridges), the jumps and the drops. Each
// within what he can do (data/reach.ts); each place costing what it's worth to be there: inside and underground
// cheap, roofs and open ground dangerous (U-038), so the routes keep inside and go out only to cross. Main routes
// run like highways between the districts' centres, branches off them to the shelters and the caches; where the
// roofs don't join a makeshift crossing is laid. Nothing marks the way: he finds it (U-043). Machines' beats are laid
// against the routes (M4 walks them): street patrols, drone corridors over the routes by night, and one of each
// over the start hideout's grate. And now and then a cache reached only one way, with a tool (U-037): a roof none of
// its neighbours reach, no hold on its walls, a grappling hook's anchor on its edge toward a roof across the way.
import { solid } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand, type Rng } from '../../sim/rng';
import { ENVELOPE as E } from '../../data/envelope';
import { REACH } from '../../data/reach';
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

type Place = 'inside' | 'roof' | 'under' | 'ground';
interface Node { place: Place; x: number; y: number; z: number }
interface Edge { a: number; b: number; w: number; kind: string; pa: V3; pb: V3 }
const WINS = new Set(['win:open', 'win:glass']);

/** The graph, the routes and the beats. `grate` is the start hideout's way out. */
export function network(plots: Plot[], features: Feature[], sites: Site[], sts: Street[], g: Heightfield, anchors: V3[][], grate: V3, out: Vertical, gates: Gate[]): { routes: Route[]; patrols: Patrol[] } {
  const r = makeRng(hashString('network'));
  const lots = plots.filter(p => !p.far), obb = lots.map(p => minRect(p.corners)), n = lots.length;
  const cells = new Map<string, number[]>(), key = (x: number, z: number) => `${Math.floor(x / 48)},${Math.floor(z / 48)}`;
  obb.forEach((o, i) => (cells.get(key(o.cx, o.cz)) ?? cells.set(key(o.cx, o.cz), []).get(key(o.cx, o.cz))!).push(i));
  const around = (x: number, z: number) => { const out: number[] = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push(...(cells.get(`${Math.floor(x / 48) + i},${Math.floor(z / 48) + j}`) ?? [])); return out; };
  /** The building a point is in, on or against: inside its footprint grown `pad`, the nearest centre. */
  const owner = (x: number, z: number, pad = 1.5): number => {
    let best = -1, bd = Infinity;
    for (const i of around(x, z)) {
      const o = obb[i], c = Math.cos(o.yaw), s = Math.sin(o.yaw), dx = x - o.cx, dz = z - o.cz, u = Math.abs(dx * c + dz * s), v = Math.abs(-dx * s + dz * c);
      if (u > o.hw + pad || v > o.hd + pad) continue;
      const d = Math.hypot(dx, dz);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  // The nodes: every roof; the inside of every building with rooms; the ground at its ways in and at the ways down;
  // the underground at those.
  const nodes: Node[] = lots.map((p, i) => ({ place: 'roof', x: obb[i].cx, y: p.wall, z: obb[i].cz }));
  const inside = new Int32Array(n).fill(-1), roomY = new Map<number, number[]>();
  for (const f of features) if (f.kind.startsWith('inside:')) { const i = owner(f.x, f.z, 0); if (i >= 0) (roomY.get(i) ?? roomY.set(i, []).get(i)!).push(f.y); }
  for (const [i, ys] of roomY) { inside[i] = nodes.length; nodes.push({ place: 'inside', x: obb[i].cx, y: ys.reduce((a, b) => a + b, 0) / ys.length, z: obb[i].cz }); }
  const edges: Edge[][] = nodes.map(() => []);
  const add = (q: Node) => { nodes.push(q); edges.push([]); return nodes.length - 1; };
  const far = (k: number, p: V3) => Math.hypot(p.x - nodes[k].x, p.y - nodes[k].y, p.z - nodes[k].z) * REACH.cost[nodes[k].place];
  /** A way between two nodes: what it costs to take (its own length at what the place it crosses costs: a tunnel's
   *  the underground's, a street's the open ground's, anything else in the open), plus half the way across each
   *  node to and from it. */
  const link = (a: number, b: number, base: number, kind: string, pa: V3, pb: V3, both = true, back = kind) => {
    const C = REACH.cost, w = base + Math.hypot(pb.x - pa.x, pb.y - pa.y, pb.z - pa.z) * (kind === 'tunnel' || kind === 'sewer' ? C.under : kind === 'street' ? C.ground : C.roof) + 0.5 * (far(a, pa) + far(b, pb));
    edges[a].push({ a, b, w, kind, pa, pb });
    if (both) edges[b].push({ a: b, b: a, w, kind: back, pa: pb, pb: pa });
  };
  // Window to window across a narrow way, from sill to sill (the best pair between two buildings).
  const wins = features.filter(f => WINS.has(f.kind)), wcell = new Map<number, Feature[]>(), wk = (x: number, z: number) => Math.floor(x / 4) * 100003 + Math.floor(z / 4);
  for (const q of wins) { const k = wk(q.x, q.z), a = wcell.get(k); if (a) a.push(q); else wcell.set(k, [q]); }
  const pairs = new Map<string, [number, number, Feature, Feature, number]>();
  for (const w of wins) {
    const i = owner(w.x - w.nx! * 0.5, w.z - w.nz! * 0.5, 0);
    if (i < 0 || inside[i] < 0) continue;
    for (const dx of [-4, 0, 4]) for (const dz of [-4, 0, 4]) for (const q of wcell.get(wk(w.x + dx, w.z + dz)) ?? []) {
      const d = Math.hypot(q.x - w.x, q.z - w.z);
      if (d > REACH.window.across || Math.abs(q.y - w.y) > REACH.window.rise || q.nx! * w.nx! + q.nz! * w.nz! > -0.8) continue;
      const j = owner(q.x - q.nx! * 0.5, q.z - q.nz! * 0.5, 0);
      if (j < 0 || j === i || inside[j] < 0) continue;
      const k = i < j ? `${i},${j}` : `${j},${i}`, had = pairs.get(k);
      if (!had || d < had[4]) pairs.set(k, [i, j, w, q, d]);
    }
  }
  for (const [i, j, w, q] of pairs.values()) link(inside[i], inside[j], 3, 'window', w, q);
  // Out of a window onto a roof across or below: level with the sill, both ways; within a climb, down and back up;
  // further down (a roll), only down.
  for (const w of wins) {
    const i = owner(w.x - w.nx! * 0.5, w.z - w.nz! * 0.5, 0);
    if (i < 0 || inside[i] < 0) continue;
    for (let t = 0.8; t <= REACH.drop.across; t += 0.5) {
      const x = w.x + w.nx! * t, z = w.z + w.nz! * t, j = owner(x, z, 0);
      if (j < 0 || j === i) continue;
      const dy = w.y - lots[j].wall, pb = { x, y: lots[j].wall, z };
      if (Math.abs(dy) <= REACH.jump.rise) link(inside[i], j, 3, 'window', w, pb);
      else if (dy > 0 && dy <= REACH.climb.up) link(inside[i], j, 3, 'drop', w, pb, true, 'climb');
      else if (dy > 0 && dy <= REACH.drop.down) link(inside[i], j, 4, 'drop', w, pb, false);
      break;
    }
  }
  // Up the stairwell to the roof, where it has one.
  lots.forEach((p, i) => { if (inside[i] >= 0 && p.route?.length) link(inside[i], i, 5, 'stairs', { ...nodes[inside[i]] }, p.route[p.route.length - 1]); });
  // In from the ground: the holes broken in low from the alleys, the street doors; the ground at the ways down to the
  // underground, the underground between them; open ground between any of these near each other, dearly.
  const ground: number[] = [];
  for (const f of features) if (f.kind === 'burrow') {
    const i = owner(f.x - f.nx! * 0.5, f.z - f.nz! * 0.5, 0);
    if (i < 0 || inside[i] < 0) continue;
    const k = add({ place: 'ground', x: f.x + f.nx! * 0.5, y: f.y, z: f.z + f.nz! * 0.5 });
    ground.push(k); link(k, inside[i], 3, 'burrow', nodes[k], f);
  }
  lots.forEach((p, i) => { if (inside[i] >= 0 && p.route?.length) { const k = add({ place: 'ground', ...p.route[0] }); ground.push(k); link(k, inside[i], 3, 'door', nodes[k], p.route[1] ?? p.route[0]); } });
  const unders: number[] = [];
  for (const f of features) if (f.kind.startsWith('way:')) {
    const k = add({ place: 'ground', x: f.x, y: f.y, z: f.z }), u = add({ place: 'under', x: f.x, y: f.y - 6, z: f.z });
    ground.push(k); unders.push(u); link(k, u, 4, 'way', nodes[k], nodes[u]);
  }
  for (const a of unders) for (const b of unders) if (a < b && Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z) < 400) link(a, b, 0, 'tunnel', nodes[a], nodes[b]);
  // The sewers (M3-73a): down a basement's manhole to its shaft's foot, along the runs between shafts, and through a
  // grate into the underground city.
  const shafts = new Map<string, number>(), sk = (x: number, z: number) => `${Math.round(x)},${Math.round(z)}`;
  for (const f of features) if (f.kind === 'sewer') {
    const i = owner(f.x, f.z, 0);
    if (i < 0 || inside[i] < 0) continue;
    const k = add({ place: 'under', x: f.x, y: f.y - 4, z: f.z });
    shafts.set(sk(f.x, f.z), k); link(inside[i], k, 3, 'manhole', f, nodes[k]);
  }
  const runs = new Map<number, Feature[]>();
  for (const f of features) if (f.kind === 'drain') (runs.get(f.group) ?? runs.set(f.group, []).get(f.group)!).push(f);
  for (const [a, b] of runs.values()) {
    const end = (f: Feature) => shafts.get(sk(f.x, f.z)) ?? (() => {
      // Into the city: the walk there, joined to its nearest way down.
      const k = add({ place: 'under', x: f.x, y: f.y, z: f.z }), u = unders.reduce((m, q) => (m < 0 || Math.hypot(nodes[q].x - f.x, nodes[q].z - f.z) < Math.hypot(nodes[m].x - f.x, nodes[m].z - f.z) ? q : m), -1);
      if (u >= 0) link(k, u, 0, 'tunnel', nodes[k], nodes[u]);
      return k;
    })();
    if (b) link(end(a), end(b), 0, 'sewer', a, b);
  }
  for (const a of ground) for (const b of ground) if (a < b && Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z) < 60) link(a, b, 0, 'street', nodes[a], nodes[b]);
  // Roof to roof: the connections' two ends; jumps and drops within reach; a line ridden or walked.
  const groups = new Map<number, Feature[]>();
  for (const f of features) if (JOINS.includes(f.kind)) (groups.get(f.group) ?? groups.set(f.group, []).get(f.group)!).push(f);
  for (const fs of groups.values()) {
    if (fs.length !== 2) continue;
    const a = owner(fs[0].x, fs[0].z), b = owner(fs[1].x, fs[1].z);
    if (a >= 0 && b >= 0 && a !== b) link(a, b, 2, fs[0].kind === 'cord' || fs[0].kind === 'crossCord' ? 'line' : fs[0].kind, fs[0], fs[1]);
  }
  // Through a breach from one building's floor into the next's.
  const holes = new Map<number, Feature[]>();
  for (const f of features) if (f.kind === 'breach') (holes.get(f.group) ?? holes.set(f.group, []).get(f.group)!).push(f);
  for (const [a, b] of holes.values()) {
    const i = owner(a.x, a.z, 0), j = owner(b.x, b.z, 0);
    if (i >= 0 && j >= 0 && i !== j && inside[i] >= 0 && inside[j] >= 0) link(inside[i], inside[j], 1, 'breach', a, b);
  }
  for (let i = 0; i < n; i++) for (const j of around(obb[i].cx, obb[i].cz)) {
    if (j <= i || !obbOverlap(obb[i], obb[j], REACH.jump.across / 2) || obbOverlap(obb[i], obb[j], 0.2)) continue;
    const dh = lots[j].wall - lots[i].wall, pi = edgeTo(obb[i], obb[j]), pj = edgeTo(obb[j], obb[i]);
    if (Math.hypot(pj.x - pi.x, pj.z - pi.z) > REACH.jump.across) continue;
    const A = { x: pi.x, y: lots[i].wall, z: pi.z }, B = { x: pj.x, y: lots[j].wall, z: pj.z };
    if (Math.abs(dh) <= REACH.jump.rise) link(i, j, 3, 'jump', A, B);
    else if (Math.abs(dh) <= REACH.drop.down) { if (dh > 0) link(j, i, 4, 'drop', B, A, false); else link(i, j, 4, 'drop', A, B, false); }
  }
  const sheer = new Set(gates.map(q => owner(q.x, q.z)));
  // Shortest ways (Dijkstra on a binary heap), never through a gated cache unless it's where the way goes.
  const N = nodes.length;
  const path = (from: number, to: number): Edge[] | null => {
    const dist = new Float64Array(N).fill(Infinity), prev = new Array<Edge | null>(N).fill(null), heap: [number, number][] = [[0, from]];
    const push = (d: number, i: number) => { heap.push([d, i]); for (let k = heap.length - 1; k > 0;) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; for (let k = 0; ;) { const l = 2 * k + 1, rr = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    dist[from] = 0;
    while (heap.length) {
      const [d, i] = pop();
      if (d > dist[i]) continue;
      if (i === to) break;
      for (const e of edges[i]) if ((e.b === to || !sheer.has(e.b)) && d + e.w < dist[e.b]) { dist[e.b] = d + e.w; prev[e.b] = e; push(dist[e.b], e.b); }
    }
    if (!Number.isFinite(dist[to])) return null;
    const steps: Edge[] = [];
    for (let i = to; prev[i]; i = prev[i]!.a) steps.unshift(prev[i]!);
    return steps;
  };
  /** The node for a place: the inside of a building near it that joins the most others, else a roof. */
  const nodeAt = (p: V3) => {
    let best = -1, score = -Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(obb[i].cx - p.x, obb[i].cz - p.z);
      if (d > 150 || sheer.has(i)) continue;
      const k = inside[i] >= 0 ? inside[i] : i, s = edges[k].length * 10 - d + (inside[i] >= 0 ? 50 : 0);
      if (s > score) { score = s; best = k; }
    }
    return best;
  };
  // Where the roofs don't join up (across a street, mostly), a crossing could be laid between roofs 30 m or less
  // apart, their tops close enough for a plank, a beam or a cable, high enough over the ground between. Paths may
  // use these at a cost; the ones they use are built.
  for (let i = 0; i < n; i++) for (const j of around(obb[i].cx, obb[i].cz)) {
    if (j <= i || sheer.has(i) || sheer.has(j) || !obbOverlap(obb[i], obb[j], 17.5) || obbOverlap(obb[i], obb[j], REACH.jump.across / 2)) continue;
    const pi = edgeTo(obb[i], obb[j]), pj = edgeTo(obb[j], obb[i]), gap = Math.hypot(pj.x - pi.x, pj.z - pi.z), ya = lots[i].top, yb = lots[j].top;
    const gnd = Math.max(...[0.25, 0.5, 0.75].map(t => heightAt(g, pi.x + (pj.x - pi.x) * t, pi.z + (pj.z - pi.z) * t) ?? 0));
    // (A plank or a beam level-ish; a cable bundle may climb, a third of its length at most.)
    if (gap > REACH.span.across || Math.abs(ya - yb) > (gap > 14 ? Math.min(12, gap / 3) : Math.min(4, gap * 0.4)) || Math.min(ya, yb) - gnd < BARE + 1 + gap * 0.02) continue;
    link(i, j, 25 + gap, 'build', { x: pi.x, y: ya, z: pi.z }, { x: pj.x, y: yb, z: pj.z });
  }
  /** Lay a crossing a path chose: a plank to 7 m, an I-beam to 14, a cable bundle past that. */
  const lay = (e: Edge): string => {
    const A3: [number, number, number] = [e.pa.x, e.pa.y, e.pa.z], B3: [number, number, number] = [e.pb.x, e.pb.y, e.pb.z], gap = Math.hypot(B3[0] - A3[0], B3[2] - A3[2]);
    const kind = gap <= 7 ? 'crossPlank' : gap <= 14 ? 'crossBeam' : 'line';
    if (kind === 'crossPlank') out.solids.push(member(A3, B3, 0.7, 0.08, MAT.wood));
    else if (kind === 'crossBeam') { out.solids.push(member(A3, B3, 0.3, 0.04, MAT.metal)); out.decor.push(member([A3[0], A3[1] - 0.04, A3[2]], [B3[0], B3[1] - 0.04, B3[2]], 0.04, 0.28, MAT.metal)); }
    else cord(A3, B3, 0.25 + gap * 0.02, r, out, true);
    out.features.push({ kind: 'routeLink', x: A3[0], y: A3[1], z: A3[2], group: out.features.length, nx: (B3[0] - A3[0]) / gap, nz: (B3[2] - A3[2]) / gap });
    // Built now: cheap for the paths after, both ways.
    for (const [x, y] of [[e.a, e.b], [e.b, e.a]]) for (const f of edges[x]) if (f.b === y && f.kind === 'build') { f.kind = kind; f.w = 2 + gap * REACH.cost.roof + 0.5 * (far(f.a, f.pa) + far(f.b, f.pb)); }
    return kind;
  };
  // A grappling hook's leg to each cache, from the roof it's reached from (U-037).
  for (const q of gates) { const a = owner(q.from.x, q.from.z), b = owner(q.x, q.z); if (a >= 0 && b >= 0) link(a, b, 30, 'grapple', q.from, q, false); }
  const routes: Route[] = [];
  /** A route: the way's points, where each stretch between them is, and the ways taken (unmarked, U-043). */
  const along = (id: string, kind: Route['kind'], a: number, b: number) => {
    const p = path(a, b);
    if (!p || !p.length) return;
    const pts: V3[] = [{ x: nodes[a].x, y: nodes[a].y, z: nodes[a].z }], on: Route['on'] = [], ways: string[] = [];
    for (const e of p) {
      pts.push({ ...e.pa }); on.push(nodes[e.a].place);
      const k = e.kind === 'build' ? lay(e) : e.kind;
      pts.push({ ...e.pb }); on.push(k === 'tunnel' || k === 'sewer' || k === 'manhole' ? 'under' : k === 'street' ? 'ground' : 'gap'); ways.push(k);
    }
    const z = nodes[b];
    pts.push({ x: z.x, y: z.y, z: z.z }); on.push(z.place);
    routes.push({ id, kind, pts, on, ways });
  };
  // Main routes: chains of the districts' centres.
  anchors.forEach((chain, c) => { for (let k = 0; k + 1 < chain.length; k++) { const a = nodeAt(chain[k]), b = nodeAt(chain[k + 1]); if (a >= 0 && b >= 0 && a !== b) along(`main${c}.${k}`, 'main', a, b); } });
  // Branches: from the main routes to the shelters within 300 m of them (one in three, up to 30), and to the caches.
  const onMain = new Set<number>();
  for (const rt of routes) for (const q of rt.pts) { const i = owner(q.x, q.z); if (i >= 0) onMain.add(inside[i] >= 0 ? inside[i] : i); }
  const nearest = (t: number) => { let best = -1, bd = 300; for (const i of onMain) { const d = Math.hypot(nodes[i].x - nodes[t].x, nodes[i].z - nodes[t].z); if (d < bd) { bd = d; best = i; } } return best; };
  let branches = 0;
  const reached = new Set<number>();
  for (const st of sites) {
    if (branches >= 30 || rand(r) > 0.35) continue;
    const t = nodeAt({ x: st.x, y: st.y, z: st.z });
    if (t < 0 || onMain.has(t) || reached.has(t)) continue;
    reached.add(t);
    const best = nearest(t);
    if (best >= 0) { const before = routes.length; along(`branch${branches}`, 'branch', best, t); if (routes.length > before) branches++; }
  }
  gates.forEach((q, k) => { const t = owner(q.x, q.z), best = t >= 0 ? nearest(t) : -1; if (best >= 0) along(`cache${k}`, 'branch', best, t); });
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
