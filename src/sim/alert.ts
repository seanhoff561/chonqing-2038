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
import { raycast } from '../world/geom';
import { unitPose, loopOf, type Unit } from './units';
import { callOut, flankPoint, searchSpots, coverNear, SQUAD } from './squad';
import { remember } from './hive';
import { SCALE } from './clock';
import { DT } from './types';

type V3 = { x: number; y: number; z: number };
/** How far up or down each kind steps without a stair: a quadruped's metre's jump; nothing climbs (M4-09). */
const STEP: Record<UnitKind, number> = { quadruped: 1, humanoid: 0.5, drone: 99, delivery: 0.2, carrier: 0.3, camera: 0, sweeper: 0, lamppost: 0, turret: 0, pir: 0, tripwire: 0, acoustic: 0 };
export const ALERT = { suspicious: 0.3, engaged: 1, scan: 8, checkFor: 24 * 3600, checkWithin: 200 };

/** The way from a to b for a kind: its nav path on the ground, then on to the point itself if that's within its step
 *  up or down (a quadruped's metre's jump, half a metre for the rest: none climbs) with nothing in the way; straight
 *  for a drone (8 m over the point) or without a nav graph. */
function way(w: World, kind: UnitKind, a: V3, b: V3): V3[] {
  if (kind === 'drone') return [{ x: b.x, y: b.y + 8, z: b.z }];
  const p = w.nav ? navPath(w.nav, a, b, kind) : null;
  if (!p) return Math.abs(b.y - a.y) <= STEP[kind] ? [b] : [];
  const end = p.pts[p.pts.length - 1], d = Math.hypot(b.x - end.x, b.y - end.y, b.z - end.z);
  const reach = Math.abs(b.y - end.y) <= STEP[kind] && (d < 0.1 || !raycast(w.index, end.x, end.y + 0.5, end.z, (b.x - end.x) / d, (b.y - end.y) / d, (b.z - end.z) / d, d));
  return [...p.pts.slice(1), ...(reach ? [b] : [])];
}

function leave(s: SimState, w: World, u: Unit, kind: 'look' | 'check', to: V3) {
  const at = unitPose(w, u, s.time);
  // A humanoid coming to a place others are already making for comes round it from a side (M4-10).
  const side = u.kind === 'humanoid' ? flankPoint(s, w, u, at, to) : null, path = side ? [...way(w, u.kind, at, side), ...way(w, u.kind, side, to)] : way(w, u.kind, at, to);
  u.trip = { kind, path, i: 0, pos: { x: at.x, y: at.y, z: at.z }, yaw: at.yaw, scan: 0, back: false, left: { x: at.x, y: at.y, z: at.z }, leftAt: s.time };
}

/** A tick along the trip: walking (running when Engaged), looking about at the far end, back, and onto the beat. */
function walk(s: SimState, w: World, u: Unit) {
  const t = u.trip!, speed = u.state === 'engaged' ? UNITS[u.kind].chase : UNITS[u.kind].patrol;
  if (t.i >= t.path.length) {
    if (!t.back) {
      // Holding its cover while it can see him (M4-10).
      if (t.cover) return;
      // Looking about, a slow sweep either way, 8 s (M4-04); then a humanoid goes through the hiding places near the
      // place one by one, looking briefly at each (M4-10).
      const look = t.visits ? SQUAD.look : ALERT.scan;
      t.scan += DT;
      t.yaw += Math.sin((t.scan / look) * Math.PI * 4) * 0.03;
      if (t.scan >= look) {
        if (u.kind === 'humanoid' && !t.visits) t.visits = searchSpots(w, t.pos);
        const next = t.visits?.shift();
        if (next) { t.path = way(w, u.kind, t.pos, next); t.i = 0; t.scan = 0; return; }
        t.back = true; t.path = way(w, u.kind, t.pos, t.left); t.i = 0;
      }
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
    const was = u.state;
    if (a >= ALERT.engaged && u.state !== 'engaged') { u.state = 'engaged'; remember(s, u.seen ?? s.player.pos); }
    else if (a >= ALERT.suspicious && u.state === 'unaware') u.state = 'suspicious';
    // A humanoid that's just noticed him calls the others near it (M4-10).
    if (was === 'unaware' && u.state !== 'unaware' && u.kind === 'humanoid' && !u.convoy && u.seen) callOut(s, w, u);
    if (u.convoy) { if (a < ALERT.suspicious) u.state = 'unaware'; continue; }
    if (STATIC.has(u.kind)) {
      // A camera that's caught sight of him sends the nearest unit on foot within 150 m to look (M4-07).
      if (a < ALERT.suspicious) u.state = 'unaware';
      else if (u.seen && u.checked === undefined) { u.checked = s.time; sendNearest(s, w, u, u.seen); }
      if (a < SIGHT.min) u.checked = undefined;
      continue;
    }
    if (u.trip) {
      // Still seeing him while it goes: on to where he is now; a humanoid fighting him makes for cover where it can
      // still see him, and holds it while it can (M4-10).
      const t = u.trip;
      if (!t.back && t.kind === 'look' && u.seen && (u.id + s.tick) % 6 === 0 && a >= SIGHT.min) {
        const seesNow = Math.hypot(u.seen.x - s.player.pos.x, u.seen.z - s.player.pos.z) < 0.5;
        if (u.kind === 'humanoid' && u.state === 'engaged' && seesNow) {
          if (!t.cover || (u.id + s.tick) % 60 === 0) { const c = coverNear(s, w, t.pos); if (c) { t.cover = c; t.path = way(w, u.kind, t.pos, c); t.i = 0; t.scan = 0; } }
        } else t.cover = undefined;
        const end = t.path[t.path.length - 1];
        if (!t.cover && (!end || Math.hypot(end.x - u.seen.x, end.z - u.seen.z) > 2)) { t.path = way(w, u.kind, t.pos, u.seen); t.i = 0; t.scan = 0; t.visits = undefined; }
      } else if (t.cover && a < SIGHT.min) t.cover = undefined;
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
