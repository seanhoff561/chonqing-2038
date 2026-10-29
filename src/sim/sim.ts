// The deterministic simulation: one plain state object advanced at a fixed 60 Hz.
import { makeRng, hashString } from './rng';
import { createPlayer } from './player';
import type { InputFrame, SimState } from './types';
import type { World } from '../world/world';
import { stepPlayer } from './move';
import { GAME_PER_TICK } from './clock';
import { stepLamp } from './headlamp';
import { createBody, stepBody } from './body';
import { checkCollapse } from './sleep';
import { grid } from './inventory';
import { applyCmds } from './commands';
import { stepHeld } from './use';
import { stepInteract, allInters } from './interact';
import { stepWeather } from './weather';
import { stepContainers } from './containers';
import './loot';
import { syncWorld } from './doors';
import './food';
import './shelter';
import { survival } from '../data/survival';

export const STATE_VERSION = 5;

export function createState(seed: number, world: World): SimState {
  const s = world.spawn;
  const state: SimState = {
    version: STATE_VERSION,
    seed,
    rng: makeRng(seed),
    tick: 0,
    time: survival.startHour * 3600,
    player: createPlayer(s.x, s.y, s.z, s.yaw),
    body: createBody(),
    inv: { pack: grid(8, 6), hotbar: [null, null, null, null, null], held: 0 },
    containers: {},
    nextUid: 0,
    shelters: [],
    placed: [],
    openContainer: null,
    target: null,
    task: null,
    wstate: { searched: {}, open: {}, gone: {} },
    dead: null,
    events: [],
    flags: { god: false, noclip: false, rain: 0 },
    weather: { fog: 0, rain: 0 },
  };
  syncWorld(state, world);
  return state;
}

export function step(state: SimState, world: World, input: InputFrame): void {
  state.events.length = 0;
  applyCmds(state, world, input.cmds);
  stepInteract(state, world, input);
  stepPlayer(state, world, input);
  stepHeld(state, world, input);
  stepLamp(state, input);
  stepContainers(state, { inter: allInters(state, world) });
  stepWeather(state);
  stepBody(state);
  checkCollapse(state);
  state.tick++;
  state.time += GAME_PER_TICK;
}

/** Hash of the whole state, for determinism checks. */
export function stateHash(state: SimState): number {
  return hashString(JSON.stringify(state));
}
