// Silent machines (M4-17, DESIGN section 5). A machine that goes out (switched off, jammed, destroyed) stops where it
// is; if it was Suspicious or Engaged, or had word of him still to send, the hive notices the silence and 12 s later
// sends the nearest drone and the nearest machine on the ground to look there. A machine on the ground that comes
// within 6 m of a wreck it can see has found it: a small search there (its disc 40 m at most), and Heightened after.
import type { SimState } from './types';
import type { World } from '../world/world';
import { STATIC } from '../data/units';
import { unitPose, isOff, type Unit } from './units';
import { leave, way } from './alert';
import { districtOf } from './district';
import { remember } from './hive';
import { raycast } from '../world/geom';
import { SCALE } from './clock';

type V3 = { x: number; y: number; z: number };
export const SILENT = { after: 12, find: 6, cap: 40 };

/** Ten times a second, before the network hears what the machines have to tell it. */
export function stepSilent(s: SimState, w: World) {
  if (s.tick % 6) return;
  for (const u of s.units) {
    const off = isOff(s, u);
    if (off && !u.stop) {
      const p = unitPose(w, u, s.time);
      u.stop = { x: p.x, y: p.y, z: p.z, yaw: p.yaw, t: s.time };
      // (A mounted one's silence is looked into from the ground under it.)
      const down = STATIC.has(u.kind) ? raycast(w.index, p.x, p.y - 0.3, p.z, 0, -1, 0, 30) : null, y = down ? p.y - 0.3 - down.t : p.y;
      if (u.state !== 'unaware' || (u.cast !== undefined && s.time < u.cast)) s.hive.silent.push({ x: p.x, y, z: p.z, t: s.time });
    } else if (!off && u.stop) {
      // Back on, knowing nothing: on with its trip, or its beat from where it stopped (its loop shifted by the time out).
      if (!u.trip) u.phase -= (s.time - u.stop.t) / SCALE;
      u.stop = undefined; u.aware = 0; u.state = 'unaware';
    }
  }
  // Silences 12 s old: someone goes to look.
  s.hive.silent = s.hive.silent.filter(q => {
    if ((s.time - q.t) / SCALE < SILENT.after) return true;
    for (const fly of [true, false]) {
      const u = nearest(s, w, q, fly);
      if (u) { leave(s, w, u, 'look', q); u.aware = Math.max(u.aware ?? 0, 0.35); u.seen = { x: q.x, y: q.y, z: q.z }; }
    }
    return false;
  });
  // Wrecks found.
  for (const d of s.units) {
    if (!d.dead || !d.stop || d.found) continue;
    for (const u of s.units) {
      if (u === d || u.convoy || STATIC.has(u.kind) || isOff(s, u) || UNITS_FLY.has(u.kind)) continue;
      const p = unitPose(w, u, s.time), dx = d.stop.x - p.x, dy = d.stop.y - p.y, dz = d.stop.z - p.z, r = Math.hypot(dx, dy, dz);
      if (!p.active || r > SILENT.find || (r > 0.5 && raycast(w.index, p.x, p.y + 1, p.z, dx / r, dy / r, dz / r, r - 0.5))) continue;
      d.found = true;
      smallSearch(s, w, d.stop, u);
      break;
    }
  }
}

const UNITS_FLY = new Set<string>(['drone', 'hunter']);

/** The nearest machine free to go: a drone in the air, or one on the ground on its beat. */
function nearest(s: SimState, w: World, at: V3, fly: boolean): Unit | null {
  let best: Unit | null = null, bd = Infinity;
  for (const u of s.units) {
    if (UNITS_FLY.has(u.kind) !== fly || u.convoy || u.reserve || u.trip || STATIC.has(u.kind) || isOff(s, u)) continue;
    const p = unitPose(w, u, s.time), d = Math.hypot(p.x - at.x, p.z - at.z);
    if (p.active && !p.docked && d < bd) { bd = d; best = u; }
  }
  return best;
}

/** A wreck found: the district searches round it, the finder first (after him already, the finder just looks). */
function smallSearch(s: SimState, w: World, at: V3, finder: Unit) {
  const k = districtOf(at.x, at.z), D = (s.hive.districts[k] ??= { state: 'unaware', since: s.time, contact: -1, until: 0 });
  if (D.state === 'engaged' || D.state === 'searching') { if (!finder.trip) leave(s, w, finder, 'look', at); return; }
  s.hive.lkp = { x: at.x, y: at.y, z: at.z, t: s.time, hx: 0, hz: 0, ax: at.x, az: at.z };
  remember(s, at);
  Object.assign(D, { state: 'searching', since: s.time, contact: s.time, cap: SILENT.cap });
  if (finder.trip) Object.assign(finder.trip, { kind: 'hunt', back: false, path: way(w, finder.kind, finder.trip.pos, at), i: 0, scan: 0 });
  else leave(s, w, finder, 'hunt', at);
}
