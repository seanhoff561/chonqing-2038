// His pistol (M4-21, DESIGN section 6). Left mouse fires a round along his look, thrown off it by the spread: wide
// from the hip, tight aimed down the sights (right mouse held) but swaying with his breath, wider for moving, tighter
// crouched or lying; each shot kicks his aim up, settling in a fraction of a second. It hits the machine the round
// meets first, on the place it meets: 25, three to a quadruped's sensor head blinding it. Every shot is a hostile
// noise heard 150 m round. Fifteen to a magazine; R reloads in 2.2 s from the fullest magazine in his pack, the one in
// the gun going back with what it still holds.
import { B, DT, type InputFrame, type SimState } from './types';
import { PISTOL } from '../data/units';
import { onUseId, heldStack } from './use';
import { aimAt, hurtUnit } from './damage';
import { addItem } from './inventory';
import { rand } from './rng';

const RAD = Math.PI / 180;

/** His spread just now, degrees. */
export function spreadOf(s: SimState, aimed: boolean) {
  const p = s.player, S = PISTOL.spread;
  return ((aimed ? S.aim : S.hip) + S.move * Math.hypot(p.vel.x, p.vel.z)) * (p.posture === 'stand' ? 1 : S.low);
}

onUseId('pistol', (s, w, st, input) => {
  const p = s.player;
  if (p.swing > 0 || s.task) return;
  if (!st.charge) { p.swing = 0.25; s.events.push({ t: 'msg', text: 'click: empty' }); return; }
  st.charge--;
  p.swing = PISTOL.every;
  // Thrown off his look by the spread (about a bell curve), his breathing's sway aimed, and the kick so far.
  const aimed = (input.buttons & B.AIM) !== 0, sp = spreadOf(s, aimed), bell = () => (rand(s.rng) + rand(s.rng) + rand(s.rng) - 1.5) / 1.5;
  const t = s.time / 3600, sway = aimed ? PISTOL.sway * RAD : 0;
  const hit = aimAt(s, w, PISTOL.reach, { yaw: bell() * sp * RAD + Math.sin(t * 9.1) * sway, pitch: bell() * sp * RAD + Math.sin(t * 6.3) * sway * 0.6 + p.kick });
  p.kick += PISTOL.kick;
  s.events.push({ t: 'noise', x: p.pos.x, y: p.pos.y + 1.4, z: p.pos.z, r: PISTOL.noise, kind: 'pistol' }, { t: 'fire', id: 'pistol' });
  if (hit) hurtUnit(s, w, hit.u, hit.zone, PISTOL.damage);
});

/** Every tick: the kick settling; R starting a reload, and the reload going on. */
export function stepGun(s: SimState, input: InputFrame) {
  const p = s.player, st = heldStack(s);
  p.kick *= Math.exp(-PISTOL.settle * DT);
  if (s.task?.id === 'reload') {
    if (st?.id !== 'pistol') { s.task = null; return; }
    s.task.t += DT;
    if (s.task.t < s.task.dur) return;
    s.task = null;
    const mags = s.inv.pack.items.filter(i => i.id === 'mag9').sort((a, b) => (b.charge ?? PISTOL.mag) - (a.charge ?? PISTOL.mag)), m = mags[0];
    if (!m) return;
    const left = st.charge ?? 0;
    st.charge = m.charge ?? PISTOL.mag;
    if (--m.n <= 0) s.inv.pack.items.splice(s.inv.pack.items.indexOf(m), 1);
    if (left > 0) addItem(s, s.inv.pack, 'mag9', 1, { charge: left });
    s.events.push({ t: 'msg', text: `reloaded: ${st.charge}` });
    return;
  }
  if ((input.pressed & B.RELOAD) && st?.id === 'pistol' && !s.task && (st.charge ?? 0) < PISTOL.mag && s.inv.pack.items.some(i => i.id === 'mag9')) {
    s.task = { id: 'reload', t: 0, dur: PISTOL.reload };
    s.events.push({ t: 'sfx', id: 'reload' });
  }
}
