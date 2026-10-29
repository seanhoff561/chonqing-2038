import { describe, it, expect } from 'vitest';
import { setup, run, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';
import type { SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';

/** Near platform z in [0, 40], gap toward -z, far platform beyond. Sprint and jump at the edge. */
export function gapJump(gap: number) {
  const { world, state } = setup([
    solid(-5, -1, 0, 5, 0, 40), solid(-5, -1, -40, 5, 0, -gap), solid(-20, -12, -60, 20, -10, 60),
  ], { x: 0, y: 0, z: 30, yaw: 0 });
  sprintJumpAt(state, world, 0.05);
  run(state, world, secs(1.5), { my: 1, buttons: B.SPRINT });
  return state;
}

export function sprintJumpAt(state: SimState, world: World, z: number) {
  let jumped = false;
  for (let i = 0; i < secs(10) && !jumped; i++) {
    const at = state.player.pos.z <= z;
    run(state, world, 1, { my: 1, buttons: B.SPRINT | (at ? B.JUMP : 0), pressed: at ? B.JUMP : 0 });
    jumped = at;
  }
}

describe('jump', () => {
  it('standing jump apex is 0.4-0.55 m', () => {
    const { world, state } = setup([solid(-5, -1, -5, 5, 0, 5)]);
    run(state, world, 5);
    let apex = 0;
    run(state, world, secs(1), { pressed: B.JUMP }, s => { apex = Math.max(apex, s.player.pos.y); });
    expect(apex).toBeGreaterThan(0.4);
    expect(apex).toBeLessThan(0.55);
  });
  it('a sprinting jump clears a 4.5 m gap', () => {
    const s = gapJump(4.5);
    expect(s.player.pos.y).toBeCloseTo(0, 2);
    expect(s.player.pos.z).toBeLessThan(-4.5);
  });
  it('a 5.2 m gap is not cleared to a standing landing', () => {
    const s = gapJump(5.2);
    expect(s.player.pos.y).toBeLessThan(-0.5);
  });
  it('air control is limited', () => {
    const { world, state } = setup([solid(-50, -1, -50, 50, 0, 50)]);
    run(state, world, 5);
    run(state, world, 1, { pressed: B.JUMP });
    run(state, world, secs(0.5), { mx: 1 });
    expect(Math.abs(state.player.vel.x)).toBeLessThan(4 * 0.5 + 0.1);
  });
});
