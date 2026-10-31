// Machines hurt (M4-19, DESIGN section 6). A hit to a place on a machine takes that place's share of its damage off
// the machine's HP: a humanoid's armour a tenth, its back battery double. Enough to its sensor head blinds it (it sees
// nothing, though it still hears); a knee broken slows a humanoid, both immobilise it (it stands, and still shoots);
// its battery gone shuts it down for good; its HP gone, it's destroyed, a wreck (a drone falls). Hit, a machine knows
// he's about: at least Suspicious, looking his way.
import type { SimState } from './types';
import type { World } from '../world/world';
import { UNITS, ZONES, BREAKS } from '../data/units';
import { eyeOf } from './player';
import { unitPose, isOff, type Unit } from './units';
import type { UnitKind } from '../data/units';
import { raycast } from '../world/geom';

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

/** Each kind's body as a standing cylinder about where it is: its bottom and top (from its pose) and radius. */
const BODY: Record<UnitKind, [number, number, number]> = {
  quadruped: [0, 1, 0.5], humanoid: [0, 1.9, 0.35], drone: [-0.15, 0.15, 0.45], hunter: [-0.2, 0.2, 0.55], delivery: [0, 0.7, 0.45], carrier: [0, 1.8, 1],
  camera: [-0.2, 0.2, 0.25], sweeper: [-0.2, 0.2, 0.25], lamppost: [-0.2, 0.2, 0.25], turret: [-0.5, 0.4, 0.5], pir: [-0.1, 0.1, 0.15], tripwire: [0, 0, 0], acoustic: [-0.2, 0.2, 0.2],
};

/** The machine his look ray (from his eye, along his yaw and pitch, turned by `spread`) meets first within reach,
 *  where on it, and which place that is; none if a wall's in the way. */
export type Aim = { u: Unit; t: number; zone: string; at: { x: number; y: number; z: number } };
export function aimAt(s: SimState, w: World, reach: number, spread = { yaw: 0, pitch: 0 }): Aim | null {
  const p = s.player, yaw = p.yaw + spread.yaw, pitch = p.pitch + spread.pitch, e = eyeOf(p);
  const d = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) }, h2 = d.x * d.x + d.z * d.z;
  let best = null as Aim | null;
  if (h2 < 1e-6) return null;
  for (const u of s.units) {
    if (u.dead || u.kind === 'tripwire' || (u.reserve && !u.trip)) continue;
    const q = unitPose(w, u, s.time), [y0, y1, r] = BODY[u.kind];
    if (!q.active && !u.stop) continue;
    const t = ((q.x - e.x) * d.x + (q.z - e.z) * d.z) / h2, x = e.x + d.x * t, y = e.y + d.y * t, z = e.z + d.z * t;
    if (t < 0 || t > reach + r || Math.hypot(x - q.x, z - q.z) > r || y < q.y + y0 || y > q.y + y1 || (best && t >= best.t)) continue;
    best = { u, t, zone: zoneOf(u.kind, q, { x, y, z }, d), at: { x, y, z } };
  }
  if (best && raycast(w.index, e.x, e.y, e.z, d.x, d.y, d.z, Math.max(0, best.t - 0.4))) return null;
  return best;
}

/** Which place on a machine a blow or round along d meets at a point. */
export function zoneOf(kind: UnitKind, q: { x: number; y: number; z: number; yaw: number }, at: { x: number; y: number; z: number }, d: { x: number; y: number; z: number }) {
  const fx = Math.sin(q.yaw), fz = Math.cos(q.yaw), ly = at.y - q.y, lx = (at.x - q.x) * fz - (at.z - q.z) * fx, from = d.x * fx + d.z * fz;
  switch (kind) {
    case 'drone': case 'hunter': return ly > 0.03 || Math.hypot(at.x - q.x, at.z - q.z) > 0.25 ? 'rotors' : 'body';
    case 'quadruped': return d.y > 0.5 && ly < 0.6 ? 'battery' : ly < 0.5 ? 'legs' : from < -0.3 && ly > 0.6 ? 'head' : 'body';
    case 'humanoid': return ly > 1.62 ? 'head' : ly < 0.65 ? (lx < 0 ? 'kneeL' : 'kneeR') : from > 0.3 && ly > 1 && ly < 1.5 ? 'battery' : 'body';
    case 'turret': return from < -0.3 ? 'head' : 'body';
    default: return 'body';
  }
}
