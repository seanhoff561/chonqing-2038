import { describe, it, expect } from 'vitest';
import { setup, run, secs, sprintJumpAt } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';
import { PARAPET } from '../../src/world/city/buildings';

describe('easier parapets and windows (M3-32, U-014)', () => {
  it('a running jump clears a parapet onto the next roof across a 1.8 m alley', () => {
    // Roof A z 0..30, roof B z -21.8..-1.8, both at 0, parapets on the facing edges, a deep alley between.
    const { world, state } = setup([
      solid(-6, -1, 0, 6, 0, 30), solid(-6, 0, 0, 6, PARAPET, 0.2),
      solid(-6, -1, -21.8, 6, 0, -1.8), solid(-6, 0, -2.0, 6, PARAPET, -1.8),
      solid(-30, -20, -60, 30, -18, 60),
    ], { x: 0, y: 0, z: 22, yaw: 0 });
    sprintJumpAt(state, world, 1.0);
    run(state, world, secs(1.5), { my: 1, buttons: B.SPRINT });
    expect(state.player.pos.z).toBeLessThan(-2.5);
    expect(state.player.pos.y).toBeGreaterThan(-0.05);
  });
  it('climbs in through a window from the street and back out', () => {
    // A wall at z 0..-0.25 with a 1.4 x 1.9 m opening, sill at 0.8; a room behind it.
    const sill = 0.8, top = sill + 1.9;
    const { world, state } = setup([
      solid(-10, -1, -10, 10, 0, 10),
      solid(-4, 0, -0.25, -0.7, 4, 0), solid(0.7, 0, -0.25, 4, 4, 0), solid(-0.7, 0, -0.25, 0.7, sill, 0), solid(-0.7, top, -0.25, 0.7, 4, 0),
    ], { x: 0, y: 0, z: 2.5, yaw: 0 });
    run(state, world, 3);
    // Walk up, hop onto the sill and through.
    for (let i = 0; i < secs(4) && state.player.pos.z > -0.8; i++) {
      const near = state.player.pos.z < 0.9 && state.player.mode === 'ground';
      run(state, world, 1, { my: 1, pressed: near ? B.JUMP : 0, buttons: near ? B.JUMP : 0 });
    }
    run(state, world, secs(1), { my: 1 });
    expect(state.player.pos.z).toBeLessThan(-0.8);
    expect(state.player.pos.y).toBeCloseTo(0, 1);
    // And back out at a run: a vault.
    state.player.yaw = Math.PI;
    run(state, world, secs(0.5), { yaw: Math.PI, my: -1 });
    run(state, world, 1, { yaw: Math.PI });
    for (let i = 0; i < secs(4) && state.player.pos.z < 1; i++) {
      const near = state.player.pos.z > -1.1 && state.player.mode === 'ground';
      run(state, world, 1, { my: 1, yaw: Math.PI, buttons: B.SPRINT | (near ? B.JUMP : 0), pressed: near ? B.JUMP : 0 });
    }
    expect(state.player.pos.z).toBeGreaterThan(1);
  });
});
