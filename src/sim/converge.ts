// Convergence and escalation (M4-14, DESIGN section 5): told where he is, the machines on the ground within 250 m of
// it run there and the drones within 400 m fly there, after him as the network's word of him moves; each dock within
// 500 m launches a hunter drone at once and another every 20 s while the district stays Engaged, its three at most;
// 45 s Engaged, the garage nearest him sends out its squad of two humanoids. Each, done looking, goes home.
import type { SimState } from './types';
import type { World } from '../world/world';
import { UNITS, STATIC, CONVERGE } from '../data/units';
import { unitPose, isOff, type Unit } from './units';
import { leave, way } from './alert';
import { districtOf } from './district';
import { SCALE } from './clock';

type V3 = { x: number; y: number; z: number };

/** Off after him at a run, from wherever it is; on its way already, the way changed to where he is now. */
function after(s: SimState, w: World, u: Unit, to: V3) {
  const t = u.trip;
  if (!t) { leave(s, w, u, 'hunt', to); if (u.reserve) u.sent = s.time; return; }
  Object.assign(t, { kind: 'hunt', path: way(w, u.kind, t.pos, to), i: 0, scan: 0, back: false, visits: undefined, cover: undefined });
}

/** Ten times a second, just after the network has heard. */
export function stepConverge(s: SimState, w: World) {
  const k = s.hive.lkp;
  if (s.tick % 6 || !k) return;
  const to = { x: k.x, y: k.y, z: k.z };
  // Those told just now: the ones near enough go (a reserve that's out goes wherever he is).
  for (const u of s.units) {
    if (u.told !== s.time || u.convoy || STATIC.has(u.kind) || isOff(s, u) || (u.reserve && !u.trip)) continue;
    const t = u.trip, end = t && !t.back && t.kind !== 'check' ? t.path[t.path.length - 1] : undefined;
    if (end && Math.hypot(end.x - to.x, end.z - to.z) < 3) continue;
    const p = unitPose(w, u, s.time);
    if (!u.reserve && Math.hypot(p.x - to.x, p.z - to.z) > (UNITS[u.kind].fly ? CONVERGE.fly : CONVERGE.ground)) continue;
    // (On its way already, it takes the new way at most once a second.)
    if (end && (u.id + s.tick / 6) % 10) continue;
    after(s, w, u, to);
  }
  const D = s.hive.districts[districtOf(k.x, k.z)];
  if (!D || D.state !== 'engaged') return;
  const fresh = (u: Unit) => !u.trip && !isOff(s, u) && (u.sent === undefined || u.sent < D.since);
  // The docks near him: one hunter now, one more every 20 s.
  w.docks.forEach((dk, i) => {
    if (Math.hypot(dk.x - to.x, dk.z - to.z) > CONVERGE.dock) return;
    const mine = s.units.filter(u => u.reserve?.dock === i), last = Math.max(-Infinity, ...mine.filter(u => u.sent !== undefined && u.sent >= D.since).map(u => u.sent!));
    const h = mine.find(fresh);
    if (h && (s.time - last) / SCALE >= CONVERGE.every) after(s, w, h, to);
  });
  // Engaged 45 s: the nearest garage's squad.
  if ((s.time - D.since) / SCALE < CONVERGE.squadAfter || !w.garages.length) return;
  let g = 0;
  w.garages.forEach((q, i) => { if (Math.hypot(q.x - to.x, q.z - to.z) < Math.hypot(w.garages[g].x - to.x, w.garages[g].z - to.z)) g = i; });
  for (const u of s.units) if (u.reserve?.garage === g && fresh(u)) after(s, w, u, to);
}
