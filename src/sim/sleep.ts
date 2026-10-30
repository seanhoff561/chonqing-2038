// Sleep is a time skip: needs, healing and injuries advance hour by hour while he's out.
import type { SimState } from './types';
import type { World } from '../world/world';
import { passTime, damage, die } from './body';
import { survival as S } from '../data/survival';
import { onInteract } from './interact';
import { onCmd } from './commands';
import { nextHour } from './clock';
import { claimBed } from './shelter';

/** Sleep until game time `until`. Heavy bleeding while asleep is fatal; light bleeds clot. */
export function sleepUntil(state: SimState, until: number, where: 'bed' | 'rough' | 'collapse') {
  const from = state.time, b = state.body;
  if (b.lightBleed >= 0) {
    damage(state, (S.bleed.clot - b.lightBleed) * S.bleed.light, 'bleeding');
    b.lightBleed = -1;
  }
  while (state.time < until && !state.dead) {
    const h = Math.min(1, (until - state.time) / 3600);
    if (b.heavyBleed && !b.tourniquet) damage(state, S.bleed.heavy * h * 90, 'bleeding');
    passTime(state, h, true, where === 'bed' ? 1 : S.roughRest);
    state.time += h * 3600;
  }
  state.events.push({ t: 'slept', from, to: state.time, where });
}

/** At zero energy he collapses where he stands until he has a little back. */
export function checkCollapse(state: SimState) {
  if (state.dead || state.body.energy > 0) return;
  sleepUntil(state, state.time + (S.collapse.wakeEnergy / (S.needs.energySleep * S.roughRest)) * 3600, 'collapse');
}

/** Hooks that run when he lies down (the lamp off), when he wakes (the save), and what may find him asleep: a fate
 *  is when, of what, and why (the start hideout given away, M3-72). */
export interface Fate { at: number; cause: string; why: string }
export const sleepHooks: { beforeSleep: ((s: SimState, until: number) => number)[]; afterWake: ((s: SimState) => void)[]; fates: ((s: SimState, until: number, w: World) => Fate | null)[] } = { beforeSleep: [], afterWake: [], fates: [] };

// A bed: E claims it as his shelter's (U-013) and opens the sleep menu.
onInteract('mattress', { now: (s, _w, it) => { claimBed(s, it); s.events.push({ t: 'sleep-menu', id: it.id }); } });

onCmd((s, c, w) => {
  if (c.c !== 'act' || c.name !== 'sleep' || s.dead) return;
  // In a bed if he's at one; otherwise rough, on whatever floor he stands on (U-013).
  const where = s.target ? 'bed' : s.player.mode === 'ground' ? 'rough' : null;
  if (!where) return;
  let until = nextHour(s.time, Number(c.arg));
  for (const h of sleepHooks.beforeSleep) until = Math.min(until, h(s, until));
  const fate = sleepHooks.fates.map(f => f(s, until, w)).filter(f => f && f.at < until).sort((a, b) => a!.at - b!.at)[0];
  sleepUntil(s, fate?.at ?? until, where);
  if (fate) { s.events.push({ t: 'msg', text: fate.why }); die(s, fate.cause); }
  if (!s.dead) for (const h of sleepHooks.afterWake) h(s);
});
