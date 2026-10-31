// Machines firing at him (M4-11: the turrets; M4-18 brings the rest). A hit hurts: its damage, then 30% a heavy
// bleed or else a light one, and one in seven a limb (a sprained leg, or a graze to an arm that only bleeds).
import type { SimState } from './types';
import type { World } from '../world/world';
import { SENSORS, SIGHT } from '../data/units';
import { damage, sprainLeg } from './body';
import { rand } from './rng';
import { unitPose } from './units';
import { visibility } from './perception';
import { DT } from './types';

export function hitHim(s: SimState, dmg: number, cause: string) {
  damage(s, dmg, cause);
  const b = s.body;
  if (rand(s.rng) < 0.3) b.heavyBleed = true;
  else if (b.lightBleed < 0) b.lightBleed = 0;
  if (rand(s.rng) < 0.15 && rand(s.rng) < 0.5) sprainLeg(s);
  s.events.push({ t: 'hurt', dmg, cause });
}

/** Every tick: an Engaged turret that can see him fires six rounds a second, each hitting 70% within 40 m and less
 *  on to 60, heard 150 m round. */
export function stepFire(s: SimState, w: World) {
  const T = SENSORS.turret;
  for (const u of s.units) {
    if (u.kind !== 'turret') continue;
    if (u.state !== 'engaged') { u.fire = 0; u.aim = false; continue; }
    // It looks for him along its gun ten times a second, as it sees.
    const at = unitPose(w, u, s.time), d = Math.hypot(s.player.pos.x - at.x, s.player.pos.y + 1 - at.y, s.player.pos.z - at.z);
    if ((u.id + s.tick) % 6 === 0) u.aim = d <= T.reach && visibility(s, w, 'turret', at) >= SIGHT.min;
    if (!u.aim) { u.fire = 0; continue; }
    const was = Math.floor(u.fire ?? 0);
    u.fire = (u.fire ?? 0) + T.rate * DT;
    for (let k = was; k < Math.floor(u.fire); k++) {
      s.events.push({ t: 'noise', x: at.x, y: at.y, z: at.z, r: T.noise, kind: 'gunfire' }, { t: 'shot', x: at.x, y: at.y, z: at.z });
      if (rand(s.rng) < T.accuracy * (d <= T.sure ? 1 : Math.max(0, 1 - (d - T.sure) / (T.reach - T.sure)))) hitHim(s, T.damage, 'turret');
    }
  }
}
