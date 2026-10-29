// Sleep is a time skip: needs, healing and injuries advance hour by hour while he's out.
import type { SimState } from './types';
import { passTime, damage } from './body';
import { survival as S } from '../data/survival';

/** Sleep until game time `until`. Heavy bleeding while asleep is fatal; light bleeds clot. */
export function sleepUntil(state: SimState, until: number, where: 'bed' | 'collapse') {
  const from = state.time, b = state.body;
  if (b.lightBleed >= 0) {
    damage(state, (S.bleed.clot - b.lightBleed) * S.bleed.light, 'bleeding');
    b.lightBleed = -1;
  }
  while (state.time < until && !state.dead) {
    const h = Math.min(1, (until - state.time) / 3600);
    if (b.heavyBleed && !b.tourniquet) damage(state, S.bleed.heavy * h * 90, 'bleeding');
    passTime(state, h, true);
    state.time += h * 3600;
  }
  state.events.push({ t: 'slept', from, to: state.time, where });
}

/** At zero energy he collapses where he stands until he has a little back. */
export function checkCollapse(state: SimState) {
  if (state.dead || state.body.energy > 0) return;
  sleepUntil(state, state.time + (S.collapse.wakeEnergy / S.needs.energySleep) * 3600, 'collapse');
}
