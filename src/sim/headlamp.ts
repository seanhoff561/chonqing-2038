// The headlamp (U-019, DESIGN section 2): H cycles off, white, red while one is in the backpack. White lasts 8
// game hours on a charge, red 24; a battery pack (held, left mouse) recharges it. It goes off when he sleeps.
// The render puts a spot light on his head; perception reads player.lamp (white 1.0, red 0.4 light).
import { B, type InputFrame, type SimState } from './types';
import { GAME_PER_TICK } from './clock';
import { sfx } from './move';
import { onUseId } from './use';
import { consume } from './inventory';
import { sleepHooks } from './sleep';

export const LAMP_HOURS = { 1: 8, 2: 24 } as const;
const lamp = (s: SimState) => s.inv.pack.items.find(i => i.id === 'headlamp') ?? null;

export function stepLamp(s: SimState, input: InputFrame) {
  const p = s.player, st = lamp(s);
  if (input.pressed & B.HEADLAMP) {
    if (!st) s.events.push({ t: 'msg', text: 'no headlamp' });
    else if ((st.charge ?? 100) <= 0) s.events.push({ t: 'msg', text: 'the headlamp is dead' });
    else { p.lamp = ((p.lamp + 1) % 3) as 0 | 1 | 2; sfx(s, 'click'); }
  }
  if (!p.lamp) return;
  if (!st) { p.lamp = 0; return; }
  st.charge = Math.max(0, (st.charge ?? 100) - (100 * GAME_PER_TICK) / (LAMP_HOURS[p.lamp] * 3600));
  if (st.charge === 0) { p.lamp = 0; s.events.push({ t: 'msg', text: 'the headlamp dies' }); }
}

onUseId('battpack', s => {
  const st = lamp(s);
  if (!st) { s.events.push({ t: 'msg', text: 'nothing to charge' }); return; }
  st.charge = 100;
  consume(s.inv.pack, 'battpack');
  s.inv.held = 0;
  s.events.push({ t: 'msg', text: 'headlamp charged' });
});

sleepHooks.beforeSleep.push((s, until) => { s.player.lamp = 0; return until; });
