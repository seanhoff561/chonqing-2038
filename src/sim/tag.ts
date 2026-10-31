// Tracking tags (M4-22, DESIGN section 6). A quadruped that's after him and can see him out past its prod's reach
// fires its tag launcher every 6 s: three times in five a tracking tag sticks to his clothes (he feels the thump,
// no more), and it stays there, giving his way home away (M4-23), until he finds it with an SDR dongle and picks it
// off, 3 s.
import { DT, type SimState } from './types';
import type { World } from '../world/world';
import { TAG, SIGHT } from '../data/units';
import { visibility } from './perception';
import { onUseId } from './use';
import { rand } from './rng';
import type { Pose, Unit } from './units';

/** Every tick, for a quadruped that's after him (fire.ts): its launcher. */
export function launcher(s: SimState, w: World, u: Unit, at: Pose, d: number) {
  u.tagIn = Math.max(0, (u.tagIn ?? 0) - DT);
  if (u.tagIn > 0 || (u.id + s.tick) % 6 || d <= TAG.near || d > TAG.reach || u.blind || visibility(s, w, u.kind, at) < SIGHT.min) return;
  u.tagIn = TAG.every;
  s.events.push({ t: 'noise', x: at.x, y: at.y + 0.8, z: at.z, r: TAG.noise, kind: 'tag' });
  if (rand(s.rng) >= TAG.chance) return;
  s.player.tag = true;
  s.events.push({ t: 'msg', text: 'something thumped into your jacket' });
}

// The SDR dongle (M4-22): its chirp finds a tag on him, and he picks it off.
onUseId('sdr', s => {
  if (s.task) return;
  if (!s.player.tag) { s.events.push({ t: 'msg', text: 'the dongle hears no tracker on you' }); return; }
  s.task = { id: 'untag', t: 0, dur: TAG.remove };
  s.events.push({ t: 'msg', text: 'a tracker chirping on your jacket: picking it off' });
});

/** Every tick: picking a tag off, if he is. */
export function stepTag(s: SimState) {
  if (s.task?.id !== 'untag') return;
  s.task.t += DT;
  if (s.task.t < s.task.dur) return;
  s.task = null;
  s.player.tag = false;
  s.events.push({ t: 'msg', text: 'tracking tag off and crushed' });
}
