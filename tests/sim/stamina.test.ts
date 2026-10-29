import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, hspeed } from './helpers';
import { B } from '../../src/sim/types';
import { solid } from '../../src/world/geom';

describe('stamina', () => {
  it('a continuous sprint drops to jogging after about 16 s, then recovers', () => {
    const { world, state } = setup([floor(0, 300)]);
    run(state, world, 3);
    let dropAt = -1;
    run(state, world, secs(25), { my: 1, buttons: B.SPRINT, yaw: 0 }, (s, i) => {
      if (i > 60 && dropAt < 0 && hspeed(s) < 6) dropAt = i / 60;
    });
    expect(dropAt).toBeGreaterThan(15);
    expect(dropAt).toBeLessThan(18);
    expect(state.player.exhausted).toBe(true);
    run(state, world, secs(3.5));
    expect(state.player.exhausted).toBe(false);
    expect(state.player.stamina).toBeGreaterThanOrEqual(30);
  });
  it('jumps and hanging cost stamina; hanging at zero lets go', () => {
    const { world, state } = setup([floor(), solid(-2, 0, -6, 2, 3, -3)], { x: 0, y: 1.5, z: -2.7, yaw: 0 });
    run(state, world, 10, { my: 1 });
    expect(state.player.mode).toBe('hang');
    state.player.stamina = 3;
    run(state, world, secs(2));
    expect(state.player.mode).not.toBe('hang');
    const b = setup([floor()]);
    run(b.state, b.world, 5);
    run(b.state, b.world, 1, { pressed: B.JUMP });
    expect(b.state.player.stamina).toBeCloseTo(92, 0);
  });
});
