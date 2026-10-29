import { describe, it, expect } from 'vitest';
import { setup, run, secs, gapJump } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

describe('jump', () => {
  it('standing jump apex is 0.6-0.7 m (U-004)', () => {
    const { world, state } = setup([solid(-5, -1, -5, 5, 0, 5)]);
    run(state, world, 5);
    let apex = 0;
    run(state, world, secs(1), { pressed: B.JUMP, buttons: B.JUMP }, s => { apex = Math.max(apex, s.player.pos.y); });
    expect(apex).toBeGreaterThan(0.6);
    expect(apex).toBeLessThan(0.7);
  });
  it('a sprinting jump clears a 4.5 m gap', () => {
    const s = gapJump(4.5).state;
    expect(s.player.pos.y).toBeCloseTo(0, 2);
    expect(s.player.pos.z).toBeLessThan(-4.5);
  });
  it('a 5.2 m gap is not cleared to a standing landing', () => {
    const s = gapJump(5.2).state;
    expect(s.player.pos.y).toBeLessThan(-0.5);
  });
  it('air control is limited', () => {
    const { world, state } = setup([solid(-50, -1, -50, 50, 0, 50)]);
    run(state, world, 5);
    run(state, world, 1, { pressed: B.JUMP, buttons: B.JUMP });
    run(state, world, secs(0.5), { mx: 1, buttons: B.JUMP });
    expect(Math.abs(state.player.vel.x)).toBeLessThan(4 * 0.5 + 0.1);
  });
  it('in the air he cannot speed up past his take-off speed', () => {
    const { world, state } = setup([solid(-50, -1, -50, 50, 0, 50)]);
    run(state, world, 5);
    run(state, world, 1, { pressed: B.JUMP });
    run(state, world, secs(0.5), { my: 1, buttons: B.SPRINT });
    expect(Math.hypot(state.player.vel.x, state.player.vel.z)).toBeLessThanOrEqual(3.21);
  });
});
