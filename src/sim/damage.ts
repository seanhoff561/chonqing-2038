// Machines hurt (M4-19, DESIGN section 6). A hit to a place on a machine takes that place's share of its damage off
// the machine's HP: a humanoid's armour a tenth, its back battery double. Enough to its sensor head blinds it (it sees
// nothing, though it still hears); a knee broken slows a humanoid, both immobilise it (it stands, and still shoots);
// its battery gone shuts it down for good; its HP gone, it's destroyed, a wreck (a drone falls). Hit, a machine knows
// he's about: at least Suspicious, looking his way.
import type { SimState } from './types';
import type { World } from '../world/world';
import { UNITS, ZONES, BREAKS } from '../data/units';
import { unitPose, isOff, type Unit } from './units';

export function hurtUnit(s: SimState, w: World, u: Unit, zone: string, dmg: number) {
  if (u.dead) return;
  const Z = ZONES[u.kind], B = BREAKS[u.kind] ?? {}, d = dmg * (Z[zone] ?? Z.body), hits = (u.hits ??= {});
  hits[zone] = (hits[zone] ?? 0) + d;
  u.hp = (u.hp ?? UNITS[u.kind].hp) - d;
  if (B.head && (hits.head ?? 0) >= B.head) u.blind = true;
  if (B.knee) { const broken = +((hits.kneeL ?? 0) >= B.knee) + +((hits.kneeR ?? 0) >= B.knee); if (broken) u.limp = true; if (broken === 2) u.lame = true; }
  if (B.battery && (hits.battery ?? 0) >= B.battery) u.shut = true;
  if (u.hp <= 0) u.dead = true;
  s.events.push({ t: 'hit', id: u.id, zone, dmg: d });
  if (isOff(s, u)) return;
  // Immobilised, it stands where it is.
  if (u.lame && !u.stop) { const p = unitPose(w, u, s.time); u.stop = { x: p.x, y: p.y, z: p.z, yaw: p.yaw, t: s.time }; }
  u.aware = Math.max(u.aware ?? 0, 0.35);
  u.seen = { ...s.player.pos };
}
