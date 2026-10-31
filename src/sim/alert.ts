// Suspicion and investigation (M4-04, DESIGN section 5). A unit 0.3 aware of him is Suspicious: it leaves its beat
// and walks to where it last saw him (on the nav graph; a drone flies), looks about there for 8 s, and walks back to
// where it left its beat, picking it up there (its loop shifted by the time it was away, so its place stays a pure
// function of the time). Fully aware it's Engaged (what the hive does then is M4-12 on), still going to where it last
// saw him. And for a day after the hive has seen him somewhere, units whose beats pass within 200 m of the place go
// to check it as they pass, once a loop. (The columns keep marching: their members only notice. A camera that sees
// him sends the nearest unit on foot.)
import type { SimState } from './types';
import type { World } from '../world/world';
import { UNITS, SIGHT, STATIC, type UnitKind } from '../data/units';
import { navPath } from './nav';
import { unitPose, loopOf, type Unit } from './units';
import { SCALE } from './clock';
import { DT } from './types';

type V3 = { x: number; y: number; z: number };
export const ALERT = { suspicious: 0.3, engaged: 1, scan: 8, checkFor: 24 * 3600, checkWithin: 200 };

/** The way from a to b for a kind: its nav path on the ground, straight for a drone (8 m over the point) or without
 *  a nav graph. */
function way(w: World, kind: UnitKind, a: V3, b: V3): V3[] {
  if (kind === 'drone') return [{ x: b.x, y: b.y + 8, z: b.z }];
  const p = w.nav ? navPath(w.nav, a, b, kind) : null;
  return p ? [...p.pts.slice(1), b] : [b];
}

function leave(s: SimState, w: World, u: Unit, kind: 'look' | 'check', to: V3) {
  const at = unitPose(w, u, s.time);
  u.trip = { kind, path: way(w, u.kind, at, to), i: 0, pos: { x: at.x, y: at.y, z: at.z }, yaw: at.yaw, scan: 0, back: false, left: { x: at.x, y: at.y, z: at.z }, leftAt: s.time };
}

/** A tick along the trip: walking (running when Engaged), looking about at the far end, back, and onto the beat. */
function walk(s: SimState, w: World, u: Unit) {
  const t = u.trip!, speed = u.state === 'engaged' ? UNITS[u.kind].chase : UNITS[u.kind].patrol;
  if (t.i >= t.path.length) {
    if (!t.back) {
      // Looking about, a slow sweep either way.
      t.scan += DT;
      t.yaw += Math.sin((t.scan / ALERT.scan) * Math.PI * 4) * 0.03;
      if (t.scan >= ALERT.scan) { t.back = true; t.path = way(w, u.kind, t.pos, t.left); t.i = 0; }
      return;
    }
    // Back where it left: on with the beat, its loop shifted by the time away.
    u.phase -= (s.time - t.leftAt) / SCALE;
    u.trip = undefined;
    return;
  }
  let step = speed * DT;
  while (step > 0 && t.i < t.path.length) {
    const q = t.path[t.i], dx = q.x - t.pos.x, dy = q.y - t.pos.y, dz = q.z - t.pos.z, d = Math.hypot(dx, dy, dz);
    if (d > 0.01) t.yaw = Math.atan2(dx, dz);
    if (d <= step) { t.pos = { ...q }; t.i++; step -= d; } else { t.pos = { x: t.pos.x + (dx / d) * step, y: t.pos.y + (dy / d) * step, z: t.pos.z + (dz / d) * step }; step = 0; }
  }
}

export function stepAlert(s: SimState, w: World) {
  const think = s.tick % 6;
  for (const u of s.units) {
    const a = u.aware ?? 0;
    if (a >= ALERT.engaged && u.state !== 'engaged') { u.state = 'engaged'; s.hive.seen.push({ ...(u.seen ?? s.player.pos), t: s.time }); }
    else if (a >= ALERT.suspicious && u.state === 'unaware') u.state = 'suspicious';
    if (u.convoy) { if (a < ALERT.suspicious) u.state = 'unaware'; continue; }
    if (STATIC.has(u.kind)) {
      // A camera that's caught sight of him sends the nearest unit on foot within 150 m to look (M4-07).
      if (a < ALERT.suspicious) u.state = 'unaware';
      else if (u.seen && u.checked === undefined) { u.checked = s.time; sendNearest(s, w, u, u.seen); }
      if (a < SIGHT.min) u.checked = undefined;
      continue;
    }
    if (u.trip) {
      // Still seeing him while it goes: on to where he is now.
      if (!u.trip.back && u.trip.kind === 'look' && u.seen && (u.id + s.tick) % 6 === 0 && a >= SIGHT.min) {
        const end = u.trip.path[u.trip.path.length - 1];
        if (end && Math.hypot(end.x - u.seen.x, end.z - u.seen.z) > 2) { u.trip.path = way(w, u.kind, u.trip.pos, u.seen); u.trip.i = 0; u.trip.scan = 0; }
      }
      walk(s, w, u);
      continue;
    }
    if (u.state !== 'unaware') {
      if (a < ALERT.suspicious) u.state = 'unaware';
      else if (u.seen) { leave(s, w, u, 'look', u.seen); continue; }
    }
    // Checking where the hive saw him, as it passes nearest the place on its beat (each unit in turn).
    if ((u.id + think) % 6 || u.state !== 'unaware') continue;
    const at = unitPose(w, u, s.time);
    if (!at.active || (u.checked !== undefined && s.time - u.checked < loopOf(w, u) * SCALE)) continue;
    for (const h of s.hive.seen) {
      if (s.time - h.t > ALERT.checkFor || Math.hypot(h.x - at.x, h.z - at.z) > ALERT.checkWithin) continue;
      if (nearestOnBeat(w, u, h) > Math.hypot(h.x - at.x, h.z - at.z) - 3) { u.checked = s.time; leave(s, w, u, 'check', h); break; }
    }
  }
}

/** The nearest unit on its beat within 150 m of a camera: sent to look at where the camera saw him. */
function sendNearest(s: SimState, w: World, cam: Unit, to: V3) {
  const c = unitPose(w, cam, s.time);
  let best: Unit | null = null, bd = 150;
  for (const u of s.units) {
    if (u === cam || u.convoy || STATIC.has(u.kind) || u.trip || u.state !== 'unaware') continue;
    const p = unitPose(w, u, s.time), d = Math.hypot(p.x - c.x, p.z - c.z);
    if (p.active && d < bd) { bd = d; best = u; }
  }
  if (best) { best.aware = Math.max(best.aware ?? 0, ALERT.suspicious + 0.05); best.seen = { ...to }; }
}

/** How near its beat comes to a place. */
function nearestOnBeat(w: World, u: Unit, h: V3) {
  return Math.min(...w.patrols[u.patrol].pts.map(q => Math.hypot(q.x - h.x, q.z - h.z)));
}
