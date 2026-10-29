import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

function climbWorld(kind: 'pipe' | 'ladder', h: number) {
  return setup([floor(), solid(-5, 0, -10, 5, h, -3)], { x: 0, y: 0, z: -2.1, yaw: 0 }, {
    climbables: [{ kind, x: 0, z: -2.95, y0: 0, y1: h, nx: 0, nz: 1 }],
  });
}

describe('pipes and ladders', () => {
  it('climbs a 6 m pipe at 1.0 m/s and steps off at the top', () => {
    const { world, state } = climbWorld('pipe', 6);
    run(state, world, 3);
    run(state, world, 1, { pressed: B.INTERACT });
    expect(state.player.mode).toBe('climb');
    run(state, world, secs(2), { my: 1 });
    expect(state.player.pos.y).toBeCloseTo(2.0, 1);
    run(state, world, secs(5), { my: 1 });
    expect(state.player.pos.y).toBeCloseTo(6, 2);
    expect(state.player.pos.z).toBeLessThan(-3.1);
  });
  it('climbs a 4 m ladder at 1.5 m/s', () => {
    const { world, state } = climbWorld('ladder', 4);
    run(state, world, 3);
    run(state, world, 1, { pressed: B.INTERACT });
    run(state, world, secs(1), { my: 1 });
    expect(state.player.pos.y).toBeCloseTo(1.5, 1);
    run(state, world, secs(3), { my: 1 });
    expect(state.player.pos.y).toBeCloseTo(4, 2);
  });
  it('climbs down to the ground, Q drops and jumping into a pipe grabs it', () => {
    const { world, state } = climbWorld('pipe', 6);
    run(state, world, 3);
    run(state, world, 1, { pressed: B.INTERACT });
    run(state, world, secs(1.5), { my: 1 });
    for (let i = 0; i < secs(2) && state.player.mode === 'climb'; i++) run(state, world, 1, { my: -1 });
    expect(state.player.mode).toBe('ground');
    expect(state.player.pos.y).toBeCloseTo(0, 2);
    run(state, world, 1, { pressed: B.JUMP, my: 1 });
    run(state, world, 20, { my: 1 });
    expect(state.player.mode).toBe('climb');
    run(state, world, 1, { pressed: B.DROP });
    run(state, world, secs(1));
    expect(state.player.mode).toBe('ground');
  });
});
