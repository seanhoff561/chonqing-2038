// Health, bleeding, injuries, hunger, thirst, fatigue, sickness and healing (DESIGN section 4).
import { DT, type SimState } from './types';
import { survival as S } from '../data/survival';
import { movement as M } from '../data/movement';
import { GAME_PER_TICK, hourOf } from './clock';
import { rand } from './rng';

export interface Body {
  hp: number;
  /** seconds a light bleed has run, or -1 */
  lightBleed: number;
  heavyBleed: boolean;
  tourniquet: boolean;
  leg: 'ok' | 'sprain' | 'fracture';
  legSplint: boolean;
  /** game time the leg injury heals (Infinity while an unsplinted fracture) */
  legHealAt: number;
  arm: 'ok' | 'fracture';
  armSplint: boolean;
  armHealAt: number;
  satiety: number;
  hydration: number;
  energy: number;
  sickUntil: number;
  nextVomit: number;
  painkillerUntil: number;
}

/** What his body lets him do this tick; movement code reads it. */
export interface Limits { sprint: boolean; sprintScale: number; jumpScale: number; maxMantle: number; wallRun: boolean; climb: boolean; climbScale: number; speedCap: number; regenScale: number }

export function createBody(): Body {
  return {
    hp: S.hp, lightBleed: -1, heavyBleed: false, tourniquet: false,
    leg: 'ok', legSplint: false, legHealAt: 0, arm: 'ok', armSplint: false, armHealAt: 0,
    satiety: 80, hydration: 80, energy: 90, sickUntil: 0, nextVomit: 0, painkillerUntil: 0,
  };
}

export function limits(state: SimState): Limits {
  const b = state.body, pk = state.time < b.painkillerUntil;
  const L: Limits = { sprint: true, sprintScale: 1, jumpScale: 1, maxMantle: M.mantle.max, wallRun: true, climb: true, climbScale: 1, speedCap: Infinity, regenScale: 1 };
  const sprained = b.leg === 'sprain' || (b.leg === 'fracture' && b.legSplint);
  if (b.leg === 'fracture' && !b.legSplint) {
    L.sprint = false; L.jumpScale = 0; L.maxMantle = S.injury.fractureMantle; L.wallRun = false; L.speedCap = pk ? 2.5 : M.speed.limp;
  } else if (sprained && !pk) {
    L.sprint = false; L.jumpScale = 0.5;
  }
  if (b.leg === 'fracture' && b.legSplint) { L.jumpScale = 0; L.wallRun = false; }
  if (b.arm === 'fracture') { if (b.armSplint) L.climbScale = 0.5; else L.climb = false; }
  if (b.energy < S.needs.low) L.sprintScale = 0.8;
  if (b.hydration < S.needs.low) L.regenScale *= 0.7;
  if (b.satiety < S.needs.low) L.regenScale *= 0.7;
  return L;
}

export function damage(state: SimState, dmg: number, cause: string) {
  if (state.flags.god || state.dead) return;
  state.body.hp -= dmg;
  if (state.body.hp <= 0) die(state, cause);
}

export function die(state: SimState, cause: string) {
  if (state.flags.god || state.dead) return;
  state.body.hp = 0;
  state.dead = cause;
  state.player.mode = 'dead';
  state.player.act = null;
}

export function sprainLeg(state: SimState) {
  const b = state.body;
  if (b.leg !== 'ok') return;
  b.leg = 'sprain';
  b.legHealAt = state.time + S.injury.sprainHours * 3600;
}

export function breakBone(state: SimState, arm: boolean) {
  const b = state.body;
  if (arm) { b.arm = 'fracture'; b.armSplint = false; b.armHealAt = Infinity; }
  else { b.leg = 'fracture'; b.legSplint = false; b.legHealAt = Infinity; }
}

/** Apply this tick's events, then bleeding, needs, sickness and healing. */
export function stepBody(state: SimState) {
  const b = state.body;
  if (state.dead) return;
  for (const e of state.events) {
    if (e.t === 'land') {
      const o = e.outcome;
      if (o.lethal) { die(state, 'fall'); return; }
      if (o.damage > 0) damage(state, o.damage, 'fall');
      if (o.sprain) sprainLeg(state);
      if (o.fracture) breakBone(state, o.arm);
      if (o.damage >= 10 && rand(state.rng) < 0.3 && b.lightBleed < 0) b.lightBleed = 0;
    } else if (e.t === 'hurt') damage(state, e.dmg, e.cause);
  }
  if (state.dead) return;
  // Bleeding runs in real seconds.
  if (b.lightBleed >= 0) {
    damage(state, S.bleed.light * DT, 'bleeding');
    b.lightBleed += DT;
    if (b.lightBleed >= S.bleed.clot) b.lightBleed = -1;
  }
  if (b.heavyBleed && !b.tourniquet) damage(state, S.bleed.heavy * DT, 'bleeding');
  passTime(state, GAME_PER_TICK / 3600, false);
}

/** Advance needs, sickness, healing and injury recovery by `hours` of game time (awake or asleep). */
export function passTime(state: SimState, hours: number, asleep: boolean) {
  const b = state.body, N = S.needs;
  const sprinting = !asleep && Math.hypot(state.player.vel.x, state.player.vel.z) > 5;
  const hot = hourOf(state.time) >= 12 && hourOf(state.time) < 17 ? N.hotMul : 1;
  const act = sprinting ? N.sprintMul : 1;
  b.satiety = Math.max(0, b.satiety - (asleep ? N.satietySleep : N.satiety * act) * hours);
  b.hydration = Math.max(0, b.hydration - (asleep ? N.hydrationSleep : N.hydration * act * hot) * hours);
  b.energy = asleep ? Math.min(100, b.energy + N.energySleep * hours) : Math.max(0, b.energy - N.energy * hours);
  if (b.satiety <= 0) damage(state, N.starveHp * hours, 'starvation');
  if (b.hydration <= 0) damage(state, N.thirstHp * hours, 'thirst');
  const sick = state.time < b.sickUntil;
  if (sick && state.time >= b.nextVomit) {
    b.nextVomit = state.time + S.injury.vomitEveryHours * 3600;
    b.satiety = Math.max(0, b.satiety - S.injury.vomitLoss);
    b.hydration = Math.max(0, b.hydration - S.injury.vomitLoss);
    state.events.push({ t: 'msg', text: 'vomit' });
  }
  const fed = b.satiety >= S.heal.minNeeds && b.hydration >= S.heal.minNeeds;
  const bleeding = b.lightBleed >= 0 || (b.heavyBleed && !b.tourniquet);
  if (fed && !sick && !bleeding && !state.dead) b.hp = Math.min(S.hp, b.hp + (asleep ? S.heal.asleep : S.heal.awake) * hours);
  if (b.leg !== 'ok' && state.time >= b.legHealAt) { b.leg = 'ok'; b.legSplint = false; }
  if (b.arm !== 'ok' && state.time >= b.armHealAt) { b.arm = 'ok'; b.armSplint = false; }
}
