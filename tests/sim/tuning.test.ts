import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, hspeed } from './helpers';
import { B } from '../../src/sim/types';
import { movement } from '../../src/data/movement';

describe('movement tuning lives in data', () => {
  it('the sim follows a changed sprint speed and jump speed', () => {
    const saved = structuredClone(movement);
    try {
      movement.speed.sprint = 9;
      movement.jumpSpeed = 4;
      const { world, state } = setup([floor()]);
      run(state, world, 5);
      run(state, world, secs(2), { my: 1, buttons: B.SPRINT });
      expect(hspeed(state)).toBeCloseTo(9, 1);
      const b = setup([floor()]);
      run(b.state, b.world, 5);
      let apex = 0;
      run(b.state, b.world, secs(1.2), { pressed: B.JUMP }, s => { apex = Math.max(apex, s.player.pos.y); });
      expect(apex).toBeGreaterThan(0.75);
    } finally {
      Object.assign(movement, saved);
    }
  });
});
