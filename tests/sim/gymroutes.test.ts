import { describe, it, expect } from 'vitest';
import { run, secs, aim, LMB, RMB } from './helpers';
import { buildGym } from '../../src/world/sets/gym';
import { createState } from '../../src/sim/sim';
import { findGrab } from '../../src/sim/grip';
import { B } from '../../src/sim/types';

describe('gym climbing routes (M1-28)', () => {
  it('the sill route goes to the top of the 9 m wall with push-off dynos', () => {
    const world = buildGym();
    const state = createState(1, world);
    Object.assign(state.player.pos, { x: -58, y: 0, z: -23.4 });
    state.player.yaw = 0;
    run(state, world, 5);
    const bits = [LMB, RMB];
    let hand = 0;
    // First sill at 2.0 m from the ground.
    for (let i = 0; i < 10 && state.player.mode !== 'grip'; i++) { aim(state, -58, 1.95, -23.85); run(state, world, 1, { buttons: LMB }); }
    expect(state.player.mode).toBe('grip');
    for (const y of [3.6, 5.2, 6.8, 8.4, 9.0]) {
      run(state, world, secs(1.2), { buttons: bits[hand], my: 1 }); // pull up
      const z = y === 9.0 ? -24 : -23.85;
      aim(state, -58, y - 0.05, z);
      if (y !== 9.0) {
        run(state, world, 1, { buttons: bits[hand], pressed: B.JUMP }); // push off with the feet
        hand = 1 - hand;
        for (let i = 0; i < 40 && !state.player.hands[hand].grip; i++) { aim(state, -58, y - 0.05, z); run(state, world, 1, { buttons: bits[hand] }); }
      } else {
        hand = 1 - hand;
        for (let i = 0; i < 10; i++) { aim(state, -58, y - 0.05, z); run(state, world, 1, { buttons: bits[0] | bits[1] }); }
      }
      expect(state.player.mode, `grip at ${y}`).toBe('grip');
    }
    run(state, world, secs(2), { buttons: LMB | RMB, my: 1 });
    expect(state.player.pos.y).toBeCloseTo(9, 2);
  });
  it('the smooth glass wall offers nothing to hold', () => {
    const world = buildGym();
    const state = createState(1, world);
    Object.assign(state.player.pos, { x: -50, y: 0, z: -23.6 });
    for (const y of [1.5, 2.0, 2.2]) {
      aim(state, -50, y, -24);
      expect(findGrab(world, state.player)).toBeNull();
    }
  });
});
