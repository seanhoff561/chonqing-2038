// Machines firing at him (DESIGN section 6: M4-11 the turrets, M4-18 the rest). An armed machine that's Engaged, or
// whose district is, fires while it has him in sight and reach: a turret six rounds a second, 70% hitting within 40 m
// and fewer on to 60; a humanoid's rifle bursts of three every 1.2 s, each hitting 0.55 x how well it sees him x
// (1 - 0.06 x his speed) x (1 - d/80); a hunter drone's SMG bursts of two every 0.8 s, 40%; a quadruped's prod at
// arm's length every 1.5 s, stunning him a second. A hit hurts: its damage, then 30% a heavy bleed or else a light
// one, and 15% a limb (a sprained leg, or a graze to an arm that only bleeds).
import type { SimState } from './types';
import type { World } from '../world/world';
import { UNITS, WEAPONS, SIGHT } from '../data/units';
import { sprainLeg } from './body';
import { rand } from './rng';
import { unitPose, isOff } from './units';
import { visibility } from './perception';
import { districtOf } from './district';
import { DT } from './types';

/** A hit: its damage (taken as the tick's body step reads the 'hurt'), a bleed, maybe a limb. */
export function hitHim(s: SimState, dmg: number, cause: string) {
  const b = s.body;
  if (rand(s.rng) < 0.3) b.heavyBleed = true;
  else if (b.lightBleed < 0) b.lightBleed = 0;
  if (rand(s.rng) < 0.15 && rand(s.rng) < 0.5) sprainLeg(s);
  s.events.push({ t: 'hurt', dmg, cause });
}

/** Every tick. */
export function stepFire(s: SimState, w: World) {
  const p = s.player, hot = new Set(Object.keys(s.hive.districts).filter(k => s.hive.districts[k].state === 'engaged'));
  for (const u of s.units) {
    const wpn = UNITS[u.kind].weapon;
    if (!wpn) continue;
    const at = isOff(s, u) || (u.reserve && !u.trip) ? null : unitPose(w, u, s.time);
    if (!at || !at.active || at.docked || (u.state !== 'engaged' && !(hot.size && hot.has(districtOf(at.x, at.z))))) { u.aim = false; u.fire = undefined; u.left = undefined; continue; }
    const W = WEAPONS[wpn], d = wpn === 'prod' ? Math.hypot(p.pos.x - at.x, p.pos.z - at.z) : Math.hypot(p.pos.x - at.x, p.pos.y + 1 - at.y, p.pos.z - at.z);
    // It looks for him along its gun ten times a second, as it sees.
    if ((u.id + s.tick) % 6 === 0) u.aim = d <= W.reach && visibility(s, w, u.kind, at) >= SIGHT.min;
    if (!u.aim) { u.fire = Math.max(0, (u.fire ?? 0) - DT); continue; }
    u.fire = (u.fire ?? 0) - DT;
    while (u.fire <= 0) {
      if (W.noise) s.events.push({ t: 'noise', x: at.x, y: at.y, z: at.z, r: W.noise, kind: 'gunfire' }, { t: 'shot', x: at.x, y: at.y, z: at.z });
      const speed = Math.hypot(p.vel.x, p.vel.z);
      const hit = wpn === 'rifle' ? W.accuracy * visibility(s, w, u.kind, at) * Math.max(0, 1 - 0.06 * speed) * Math.max(0, 1 - d / W.reach)
        : W.accuracy * (d <= W.sure ? 1 : Math.max(0, 1 - (d - W.sure) / (W.reach - W.sure)));
      if (rand(s.rng) < hit) { hitHim(s, W.damage, wpn); if (W.stun) p.stun = Math.max(p.stun, W.stun); }
      u.left = (u.left ?? W.burst) - 1;
      if (u.left > 0) u.fire += 0.1;
      else { u.left = W.burst; u.fire += W.every - 0.1 * (W.burst - 1); }
    }
  }
}
