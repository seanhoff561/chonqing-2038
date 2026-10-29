import { createState, step } from '../../src/sim/sim';
import { emptyInput, type InputFrame, type SimState } from '../../src/sim/types';
import { makeWorld, type WorldParts, type World } from '../../src/world/world';
import { solid, type Solid } from '../../src/world/geom';

export const floor = (y = 0, size = 200): Solid => solid(-size, y - 1, -size, size, y, size);

export function setup(solids: Solid[], spawn = { x: 0, y: 0, z: 0, yaw: 0 }, extra: Partial<WorldParts> = {}) {
  const world = makeWorld({ name: 'test', solids, spawn, ...extra });
  const state = createState(1, world);
  return { world, state };
}

/** Run n ticks with an input built per tick. `pressed` bits fire only on the first tick of the run. */
export function run(state: SimState, world: World, n: number, inp: Partial<InputFrame> = {}, each?: (s: SimState, i: number) => void) {
  for (let i = 0; i < n; i++) {
    const f = { ...emptyInput(), yaw: state.player.yaw, ...inp };
    if (i > 0) f.pressed = 0;
    step(state, world, f);
    each?.(state, i);
  }
}

export const hspeed = (s: SimState) => Math.hypot(s.player.vel.x, s.player.vel.z);
export const secs = (t: number) => Math.round(t * 60);
