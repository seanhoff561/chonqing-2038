// The sewer maze (M3-73a, U-038): under the city an ant hill of sewers and crawlways joining the basements' manholes
// to their nearest neighbours and, now and then through a grate to pry open, to the underground city's walks. Each
// manhole's shaft drops straight from the basement floor (an iron ladder up it) to the deepest run off it. A run is
// level and square to the map, in one or two straight legs, deep enough under the ground's shell, the foundations
// and the basements along it; most are sewers (1.6 m wide, 2 m high), some crawl-high (0.9), and some dip where a
// sump has flooded to the roof, to be swum through under water. Lined in brick; every bore cuts every lining it
// meets, and the underground's own walls where it runs into them (square to the map too). Runs that would cross
// the old tunnels (turned to their own line) aren't dug.
import { solid, carve, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand } from '../../sim/rng';
import { heightAt, type Heightfield } from '../heightfield';
import type { Climbable, Feature, Plot, Zone, Prop, Inter } from '../world';
import { door } from '../city/access';
import { inside } from './shapes';
import { WATER_Y } from './ground';

type V3 = { x: number; y: number; z: number };
export interface Sewers { solids: Solid[]; decor: Solid[]; climbables: Climbable[]; water: Box[]; zones: Zone[]; features: Feature[]; props: Prop[]; inter: Inter[] }

/** A sewer's and a crawlway's width and height; the lining; the shaft's half width; how far a run reaches; how deep
 *  a sump dips. */
const SEWER = { w: 1.6, h: 2 }, CRAWL = { w: 0.9, h: 0.9 }, T = 0.3, SHAFT = 0.6, REACH = 180, DIP = 2.4;

/** manholes: the basements' 'sewer' features; walks: the underground city's walk to join now and then; avoid: the
 *  old tunnels' spaces; under: the underground's solids (cut where a run meets them) and its spaces (no run's lining
 *  stands in them). */
export function sewers(manholes: Feature[], plots: Plot[], g: Heightfield, walks: V3[], avoid: Box[], under: Solid[], spaces: Box[]): Sewers {
  const r = makeRng(hashString('sewers'));
  const out: Sewers = { solids: [], decor: [], climbables: [], water: [], zones: [], features: [], props: [], inter: [] };
  const nodes: V3[] = manholes.map(f => ({ x: f.x, y: f.y, z: f.z }));
  // Plots by 32 m cell, for the depth under foundations and basements.
  const cells = new Map<number, Plot[]>(), key = (x: number, z: number) => Math.floor(x / 32) * 100003 + Math.floor(z / 32);
  for (const p of plots) { if (p.far) continue; const xs = p.corners.map(c => c[0]), zs = p.corners.map(c => c[1]); for (let x = Math.min(...xs); x <= Math.max(...xs) + 32; x += 32) for (let z = Math.min(...zs); z <= Math.max(...zs) + 32; z += 32) { const k = key(x, z); (cells.get(k) ?? cells.set(k, []).get(k)!).push(p); } }
  /** The highest a run's floor may be at a point: under the ground's shell, any foundation and any basement. */
  const ceil = (x: number, z: number) => {
    // (Where the ground is holed under a building, a basement's, the building's foundation is what to keep under;
    // holed anywhere else, a stairway's or a culvert's mouth, it's open air: no run there.)
    const h = heightAt(g, x, z);
    let y = h === null ? Infinity : h - g.thick - SEWER.h - 1, under = false;
    for (const p of cells.get(key(x, z)) ?? []) if (inside(p.corners, x, z)) { y = Math.min(y, p.found - SEWER.h - 1, p.base - 7); under = true; }
    return h === null && !under ? -Infinity : y;
  };
  /** A run's two legs square to the map: along x from a, then along z to b. */
  const legs = (a: V3, b: V3): [V3, V3][] => { const m = { x: b.x, y: a.y, z: a.z }; return [[a, m], [m, b]]; };
  const boxOf = ([a, b]: [V3, V3], y0: number, y1: number, hw: number): Box => ({ x0: Math.min(a.x, b.x) - hw, y0, z0: Math.min(a.z, b.z) - hw, x1: Math.max(a.x, b.x) + hw, y1, z1: Math.max(a.z, b.z) + hw });
  const hits = (b: Box) => avoid.some(q => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0 && b.z0 < q.z1 && b.z1 > q.z0);
  /** The level of a run between a and b: under everything along it, and under both ends' basements. */
  const level = (a: V3, b: V3) => {
    let y = Math.min(a.y, b.y) - 4;
    for (const [p, q] of legs(a, b)) { const l = Math.hypot(q.x - p.x, q.z - p.z); for (let t = 0; t <= l; t += 3) y = Math.min(y, ceil(p.x + ((q.x - p.x) * t) / (l || 1), p.z + ((q.z - p.z) * t) / (l || 1))); }
    return y;
  };
  const bores: Box[] = [], lining: Solid[] = [], deepest = nodes.map(q => q.y);
  /** A lined space. */
  const space = (b: Box, roof = true) => {
    bores.push(b);
    lining.push(solid(b.x0 - T, b.y0 - T, b.z0 - T, b.x1 + T, b.y0, b.z1 + T, MAT.brick), solid(b.x0 - T, b.y0, b.z0 - T, b.x0, b.y1, b.z1 + T, MAT.brick), solid(b.x1, b.y0, b.z0 - T, b.x1 + T, b.y1, b.z1 + T, MAT.brick),
      solid(b.x0, b.y0, b.z0 - T, b.x1, b.y1, b.z0, MAT.brick), solid(b.x0, b.y0, b.z1, b.x1, b.y1, b.z1 + T, MAT.brick));
    if (roof) lining.push(solid(b.x0 - T, b.y1, b.z0 - T, b.x1 + T, b.y1 + T, b.z1 + T, MAT.brick));
    out.zones.push({ kind: 'under', box: { ...b, y0: b.y0 - 0.5 } });
  };
  /** Dig a run from node i's shaft to b at level y; a sewer, a crawlway, or a sewer with a flooded sump in its first
   *  leg. Returns whether it was dug. */
  const dig = (i: number, b: V3, y: number, kind: 'sewer' | 'crawl' | 'sump') => {
    // (Never down at the river's level: under it everything is flooded.)
    if (y - (kind === 'sump' ? DIP : 0) < WATER_Y + 1) return false;
    const a = { ...nodes[i], y }, z = kind === 'crawl' ? CRAWL : SEWER, ls = legs(a, { ...b, y });
    if (ls.some(l => hits(boxOf(l, y - DIP - T, y + z.h + T, z.w / 2 + T)))) return false;
    for (const l of ls) space(boxOf(l, y, y + z.h, z.w / 2));
    if (kind === 'sump') {
      // The first leg's middle third dips DIP under the floor, full to above it: a shaft down at each end, under
      // water between.
      const [p, q] = ls[0], len = Math.abs(q.x - p.x), sx = Math.sign(q.x - p.x) || 1, x0 = p.x + sx * len / 3, x1 = p.x + sx * (2 * len) / 3;
      const dip = { x0: Math.min(x0, x1), y0: y - DIP, z0: p.z - z.w / 2, x1: Math.max(x0, x1), y1: y - DIP + z.h, z1: p.z + z.w / 2 };
      space(dip);
      for (const e of [dip.x0, dip.x1 - 1]) bores.push({ x0: e, y0: y - DIP, z0: dip.z0, x1: e + 1, y1: y + z.h, z1: dip.z1 });
      out.water.push({ x0: dip.x0, y0: y - DIP, z0: dip.z0, x1: dip.x1, y1: y + 0.2, z1: dip.z1 });
      out.features.push({ kind: 'sump', x: (dip.x0 + dip.x1) / 2, y: y - DIP, z: p.z, group: out.features.length });
    }
    if (kind === 'crawl') out.features.push({ kind: 'crawlway', x: (ls[0][0].x + ls[0][1].x) / 2, y, z: ls[0][0].z, group: out.features.length });
    // A gutter down the middle of a sewer.
    if (kind !== 'crawl') for (const [p, q] of ls) out.decor.push({ ...solid(Math.min(p.x, q.x) - 0.15, y, Math.min(p.z, q.z) - 0.15, Math.max(p.x, q.x) + 0.15, y + 0.02, Math.max(p.z, q.z) + 0.15, MAT.water), inner: true });
    deepest[i] = Math.min(deepest[i], y);
    return true;
  };
  // Each manhole to its three nearest within reach, once each way.
  const done = new Set<string>();
  nodes.forEach((a, i) => {
    const near = nodes.map((b, j) => [j, Math.hypot(b.x - a.x, b.z - a.z)] as const).filter(([j, d]) => j !== i && d < REACH).sort((p, q) => p[1] - q[1]).slice(0, 3);
    for (const [j] of near) {
      const k = i < j ? `${i},${j}` : `${j},${i}`;
      if (done.has(k)) continue;
      done.add(k);
      const y = level(a, nodes[j]), q = rand(r), kind = q < 0.25 ? 'crawl' : q < 0.35 && Math.abs(nodes[j].x - a.x) > 30 ? 'sump' : 'sewer';
      if (dig(i, nodes[j], y, kind)) {
        deepest[j] = Math.min(deepest[j], y);
        out.features.push({ kind: 'drain', x: a.x, y, z: a.z, group: out.features.length }, { kind: 'drain', x: nodes[j].x, y, z: nodes[j].z, group: out.features.length });
      }
    }
  });
  // Now and then into the underground city: a run from a manhole to its walk, a grate to pry open where it comes in.
  let n = 0;
  for (const w of walks.filter((_, k) => k % 2 === 0)) {
    const near = nodes.map((b, j) => [j, Math.hypot(b.x - w.x, b.z - w.z)] as const).filter(([, d]) => d < 70).sort((p, q) => p[1] - q[1])[0];
    // (At the walk's own level: deep enough there under everything along the way and the manhole's basement.)
    if (!near || level(nodes[near[0]], { ...w, y: Infinity }) < w.y - 0.05 || !dig(near[0], w, w.y, 'sewer')) continue;
    // The grate stands in the run's last leg where it comes out of the underground's spaces into them (a leg that
    // never leaves them gets none: the way stays open).
    const [p, q] = legs({ ...nodes[near[0]], y: w.y }, w)[1], dz = Math.sign(q.z - p.z) || 1, len = Math.abs(q.z - p.z);
    const inSpace = (z: number) => spaces.some(b => q.x > b.x0 - 0.5 && q.x < b.x1 + 0.5 && z > b.z0 - 0.5 && z < b.z1 + 0.5 && w.y + 1 > b.y0 && w.y + 1 < b.y1);
    let t = 1;
    while (t < len - 1 && inSpace(q.z - dz * t)) t += 0.5;
    if (t >= len - 1) continue;
    const gz = q.z - dz * (t + 0.5);
    const id = `sewer-grate${n++}`;
    door(id, solid(q.x - SEWER.w / 2, w.y, gz - 0.03, q.x + SEWER.w / 2, w.y + SEWER.h, gz + 0.03, MAT.hidden), [q.x - SEWER.w / 2, gz], [1, 0], SEWER.w, 'jammed',
      out as unknown as Parameters<typeof door>[6], ['铁栅', 'Grate']);
    out.features.push({ kind: 'grate', x: q.x, y: w.y, z: gz, group: out.features.length }, { kind: 'drain', x: nodes[near[0]].x, y: w.y, z: nodes[near[0]].z, group: out.features.length + 1 }, { kind: 'drain', x: w.x, y: w.y, z: w.z, group: out.features.length + 1 });
  }
  // The shafts: from each manhole's basement floor down to its deepest run, a ladder up the west wall.
  nodes.forEach((a, i) => {
    if (deepest[i] >= a.y) return;
    space({ x0: a.x - SHAFT, y0: deepest[i], z0: a.z - SHAFT, x1: a.x + SHAFT, y1: a.y - T, z1: a.z + SHAFT }, false);
    bores.push({ x0: a.x - SHAFT, y0: a.y - T - 0.01, z0: a.z - SHAFT, x1: a.x + SHAFT, y1: a.y + 0.01, z1: a.z + SHAFT });
    out.climbables.push({ kind: 'ladder', x: a.x - SHAFT, z: a.z, y0: deepest[i], y1: a.y + 1, nx: 1, nz: 0 });
  });
  // Every bore cuts every lining, and the underground's walls it runs into.
  // (Underground, drawn near only.)
  for (const q of lining) q.inner = true;
  let lin = lining;
  for (const b of bores.concat(spaces.filter(q => bores.some(b => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0 && b.z0 < q.z1 && b.z1 > q.z0)))) lin = carve(lin, b);
  out.solids.push(...lin);
  for (const b of bores) {
    const cut = carve(under.filter(s => !s.rot && !s.ramp && b.x0 < s.x1 && b.x1 > s.x0 && b.y0 < s.y1 && b.y1 > s.y0 && b.z0 < s.z1 && b.z1 > s.z0), b);
    if (cut.length || under.some(s => !s.rot && !s.ramp && b.x0 < s.x1 && b.x1 > s.x0 && b.y0 < s.y1 && b.y1 > s.y0 && b.z0 < s.z1 && b.z1 > s.z0)) {
      const keep = under.filter(s => s.rot || s.ramp || !(b.x0 < s.x1 && b.x1 > s.x0 && b.y0 < s.y1 && b.y1 > s.y0 && b.z0 < s.z1 && b.z1 > s.z0));
      under.length = 0; under.push(...keep, ...cut);
    }
  }
  return out;
}

