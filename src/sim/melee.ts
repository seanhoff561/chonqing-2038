// His knife and crowbar (M4-20, DESIGN section 6). A blow (left mouse) lands on the machine he's looking at within
// reach, on the place he aims at: a knife 40 (a patrol drone downed in one), a crowbar 55 but slower, ringing off the
// metal 20 m round. Behind a quadruped or humanoid that isn't Engaged (within 1.5 m, in its rear 120 degrees), the
// knife's a takedown instead: held 2 s, it shuts the machine down, heard 6 m round; let go or move off and it breaks
// free, Engaged.
import { B, DT, type InputFrame, type SimState } from './types';
import type { World } from '../world/world';
import { MELEE, TAKEDOWN } from '../data/units';
import { onUseId } from './use';
import { aimAt, hurtUnit } from './damage';
import { unitPose, isOff, type Unit } from './units';
import { resume } from './silent';
import { SCALE } from './clock';

function blow(s: SimState, w: World, kind: keyof typeof MELEE) {
  const p = s.player, M = MELEE[kind];
  if (p.swing > 0) return;
  p.swing = M.every;
  const hit = aimAt(s, w, M.reach);
  if (!hit) return;
  hurtUnit(s, w, hit.u, hit.zone, M.damage);
  s.events.push({ t: 'noise', x: hit.at.x, y: hit.at.y, z: hit.at.z, r: M.noise, kind: kind === 'crowbar' ? 'crowbar' : 'knife' });
}

/** The quadruped or humanoid he can take down from where he is, if any. */
function takeable(s: SimState, w: World): Unit | null {
  const p = s.player.pos;
  for (const u of s.units) {
    if ((u.kind !== 'quadruped' && u.kind !== 'humanoid') || u.state === 'engaged' || isOff(s, u)) continue;
    const q = unitPose(w, u, s.time), dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz);
    if (!q.active || d > TAKEDOWN.reach || d < 0.05 || Math.abs(p.y - q.y) > 1) continue;
    // In its rear arc: away from the way it faces by more than (180 - 120/2) degrees.
    if ((dx * Math.sin(q.yaw) + dz * Math.cos(q.yaw)) / d <= -Math.cos((TAKEDOWN.rear * Math.PI) / 360)) return u;
  }
  return null;
}

onUseId('knife', (s, w) => {
  const u = s.task ? null : takeable(s, w);
  if (!u) { blow(s, w, 'knife'); return; }
  // Held while it's done: out, so it reports nothing (a Suspicious one's silence is noticed all the same, M4-17).
  s.task = { id: `takedown:${u.id}`, t: 0, dur: TAKEDOWN.time };
  u.off = s.time + (TAKEDOWN.time + 1) * SCALE;
});
onUseId('crowbar', (s, w) => blow(s, w, 'crowbar'));

/** Every tick: his swing coming back, and a takedown going on or breaking. */
export function stepMelee(s: SimState, w: World, input: InputFrame) {
  const p = s.player;
  p.swing = Math.max(0, p.swing - DT);
  const t = s.task;
  if (!t || !t.id.startsWith('takedown:')) return;
  const u = s.units[Number(t.id.slice(9))], q = unitPose(w, u, s.time);
  if (!(input.buttons & B.USE) || Math.hypot(p.pos.x - q.x, p.pos.z - q.z) > TAKEDOWN.reach + 0.3 || p.mode === 'dead') {
    // It breaks free, and it knows.
    s.task = null;
    resume(s, u);
    u.aware = 1.2; u.seen = { ...p.pos }; u.saw = s.time;
    s.events.push({ t: 'msg', text: 'it broke free' });
    return;
  }
  t.t += DT;
  if (t.t < t.dur) return;
  s.task = null;
  u.shut = true;
  s.events.push({ t: 'noise', x: q.x, y: q.y, z: q.z, r: TAKEDOWN.noise, kind: 'takedown' }, { t: 'msg', text: 'shut down' });
}
