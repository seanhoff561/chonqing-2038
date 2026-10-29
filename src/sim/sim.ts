// The deterministic simulation: one plain state object advanced at a fixed 60 Hz.
import { makeRng, hashString } from './rng';
import { createPlayer } from './player';
import type { InputFrame, SimState } from './types';
import type { World } from '../world/world';
import { stepPlayer } from './move';

export const STATE_VERSION = 1;

export function createState(seed: number, world: World): SimState {
  const s = world.spawn;
  return {
    version: STATE_VERSION,
    seed,
    rng: makeRng(seed),
    tick: 0,
    player: createPlayer(s.x, s.y, s.z, s.yaw),
    events: [],
    flags: { god: false, noclip: false, rain: 0 },
  };
}

export function step(state: SimState, world: World, input: InputFrame): void {
  state.events.length = 0;
  stepPlayer(state, world, input);
  state.tick++;
}

/** Hash of the whole state, for determinism checks. */
export function stateHash(state: SimState): number {
  return hashString(JSON.stringify(state));
}
