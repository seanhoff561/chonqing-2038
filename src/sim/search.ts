// The search (M4-15, DESIGN section 5). Contact lost, the hive works out where he can be: from his last known
// position p, heading h and a top speed of 7 m/s, a disc centred on p + h x 7 x 2 s, its radius 6 + 3t m (t the
// seconds since contact), 140 m at most. The machines that came for him, done looking where he was, go on to points in
// the disc one after another while the district is Searching, picked toward the hiding places, the ways up and down
// (stairs, ladders, tunnel mouths) and the way he was going. A machine passing within 1.5 m of a hiding place checks it,
// three times in five (seeded): if he's curled up in it, it has him.
import type { SimState } from './types';
import type { World } from '../world/world';
import { NAV } from '../world/world';
import { STATIC } from '../data/units';
import { unitPose, isOff, type Unit } from './units';
import { way } from './alert';
import { alertOf, districtOf } from './district';
import { rand } from './rng';
import { SCALE } from './clock';

type V3 = { x: number; y: number; z: number };
export const SEARCH = { speed: 7, lead: 2, r0: 6, grow: 3, max: 140, check: 1.5, chance: 0.6, weight: { hide: 3, level: 2, ground: 1 }, cell: 32 };

/** The disc he can be in, t real seconds after contact was lost. */
export function searchArea(lkp: { x: number; z: number; hx: number; hz: number }, t: number, max = SEARCH.max) {
  const lead = SEARCH.speed * SEARCH.lead;
  return { x: lkp.x + lkp.hx * lead, z: lkp.z + lkp.hz * lead, r: Math.min(max, SEARCH.r0 + SEARCH.grow * Math.max(0, t)) };
}

/** The places worth looking (each with its weight) filed by 32 m cell, once per world; and the hiding places by 4 m cell. */
type Spot = V3 & { w: number };
const spotsOf = new WeakMap<World, { cells: Map<string, Spot[]>; hides: Map<string, number[]> }>();
function spots(w: World) {
  let hit = spotsOf.get(w);
  if (hit) return hit;
  const cells = new Map<string, Spot[]>(), hides = new Map<string, number[]>(), C = SEARCH.cell;
  const add = (p: V3, wt: number) => { const k = `${Math.floor(p.x / C)},${Math.floor(p.z / C)}`; let a = cells.get(k); if (!a) cells.set(k, (a = [])); a.push({ x: p.x, y: p.y, z: p.z, w: wt }); };
  w.hides.forEach((h, i) => {
    const c = { x: (h.inner.x0 + h.inner.x1) / 2, y: h.inner.y0, z: (h.inner.z0 + h.inner.z1) / 2 }, k = `${Math.floor(c.x / 4)},${Math.floor(c.z / 4)}`;
    add(c, SEARCH.weight.hide);
    let a = hides.get(k);
    if (!a) hides.set(k, (a = []));
    a.push(i);
  });
  for (const f of w.features) if (f.kind === 'ladder' || f.kind.startsWith('way:') || f.kind === 'escalator' || f.kind === 'shafthead') add(f, SEARCH.weight.level);
  if (w.nav) w.nav.pts.forEach((p, i) => add(p, w.nav!.adj[i].some(e => e[2] !== NAV.street) ? SEARCH.weight.level : SEARCH.weight.ground));
  spotsOf.set(w, (hit = { cells, hides }));
  return hit;
}

/** A point to look at in the disc: a weighted pick of the places in it, those ahead of where he was going counting up
 *  to twice; anywhere in it where there are none. */
export function searchPoint(s: SimState, w: World, lkp: V3 & { hx: number; hz: number }, area: { x: number; z: number; r: number }): V3 {
  const { cells } = spots(w), C = SEARCH.cell, pool: Spot[] = [];
  let total = 0;
  for (let i = Math.floor((area.x - area.r) / C); i <= Math.floor((area.x + area.r) / C); i++)
    for (let j = Math.floor((area.z - area.r) / C); j <= Math.floor((area.z + area.r) / C); j++)
      for (const q of cells.get(`${i},${j}`) ?? []) {
        if (Math.hypot(q.x - area.x, q.z - area.z) > area.r) continue;
        const dx = q.x - lkp.x, dz = q.z - lkp.z, d = Math.hypot(dx, dz), ahead = d > 0.5 ? Math.max(0, (dx * lkp.hx + dz * lkp.hz) / d) : 0;
        const wt = q.w * (1 + ahead);
        pool.push({ ...q, w: wt });
        total += wt;
      }
  if (!pool.length) { const a = rand(s.rng) * Math.PI * 2, r = Math.sqrt(rand(s.rng)) * area.r; return { x: area.x + Math.cos(a) * r, y: lkp.y, z: area.z + Math.sin(a) * r }; }
  let x = rand(s.rng) * total;
  for (const q of pool) if ((x -= q.w) <= 0) return { x: q.x, y: q.y, z: q.z };
  const q = pool[pool.length - 1];
  return { x: q.x, y: q.y, z: q.z };
}

/** Ten times a second: the searchers sent on to their next points; and every machine out looking checks the hiding
 *  places it passes. */
export function stepSearch(s: SimState, w: World) {
  if (s.tick % 6) return;
  const k = s.hive.lkp, d = k && s.hive.districts[districtOf(k.x, k.z)];
  const searching = !!k && alertOf(s, districtOf(k.x, k.z)) === 'searching';
  for (const u of s.units) {
    const t = u.trip;
    if (!t || isOff(s, u) || STATIC.has(u.kind)) continue;
    // Done looking where it went for him: on to another point while the district searches.
    if (searching && t.back && (t.kind === 'hunt' || t.kind === 'search')) {
      const area = searchArea(k!, (s.time - d!.contact) / SCALE, d!.cap), to = searchPoint(s, w, k!, area);
      Object.assign(t, { kind: 'search', back: false, path: way(w, u.kind, t.pos, to), i: 0, scan: 0, visits: [] });
    }
    // The search over (M4-16): back it goes, from wherever it's got to.
    else if (!searching && t.kind === 'search' && !t.back) Object.assign(t, { back: true, path: way(w, u.kind, t.pos, t.left), i: 0 });
    checkHides(s, w, u);
  }
}

/** A machine out looking passing within 1.5 m of a hiding place checks it, three times in five; once each time it comes. */
export function checkHides(s: SimState, w: World, u: Unit) {
  const at = unitPose(w, u, s.time), { hides } = spots(w);
  let near = -1;
  for (let i = Math.floor((at.x - SEARCH.check) / 4); i <= Math.floor((at.x + SEARCH.check) / 4) && near < 0; i++)
    for (let j = Math.floor((at.z - SEARCH.check) / 4); j <= Math.floor((at.z + SEARCH.check) / 4) && near < 0; j++)
      for (const h of hides.get(`${i},${j}`) ?? []) {
        const b = w.hides[h].inner;
        if (Math.hypot((b.x0 + b.x1) / 2 - at.x, (b.z0 + b.z1) / 2 - at.z) <= SEARCH.check && Math.abs(b.y0 - at.y) < 2.5) { near = h; break; }
      }
  if (near < 0 || near === u.near) { if (near < 0) u.near = undefined; return; }
  u.near = near;
  if (rand(s.rng) >= SEARCH.chance) return;
  const p = s.player;
  if (p.mode === 'hidden' && p.hideId === near) {
    u.aware = 1.2; u.seen = { ...p.pos }; u.saw = s.time;
    s.events.push({ t: 'msg', text: 'found!' });
  }
}
