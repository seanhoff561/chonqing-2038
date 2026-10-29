import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

function boxWorld(size: number) {
  const inner = { x0: -size / 2, y0: 0, z0: -2 - size, x1: size / 2, y1: size, z1: -2 };
  return setup([floor(), solid(inner.x0 - 0.05, 0, inner.z0 - 0.05, inner.x1 + 0.05, size + 0.05, inner.z1 + 0.05)], { x: 0, y: 0, z: -1, yaw: 0 }, {
    hides: [{ id: 0, inner, kind: 'crate' }],
  });
}

describe('hiding in boxes', () => {
  it('curls into a 0.8 m box in 0.6 s, stays put, and climbs out in 0.5 s', () => {
    const { world, state } = boxWorld(0.8);
    run(state, world, 3);
    run(state, world, 1, { pressed: B.INTERACT });
    expect(state.player.mode).toBe('action');
    let t = 1;
    run(state, world, secs(1), {}, s => { if (s.player.mode === 'action') t++; });
    expect(t / 60).toBeCloseTo(0.6, 1);
    expect(state.player.mode).toBe('hidden');
    expect(state.player.posture).toBe('hidden');
    expect(state.player.pos.z).toBeCloseTo(-2.4, 2);
    run(state, world, secs(1), { my: 1, buttons: B.SPRINT });
    expect(state.player.pos.z).toBeCloseTo(-2.4, 2);
    run(state, world, 1, { pressed: B.INTERACT });
    t = 1;
    run(state, world, secs(1), {}, s => { if (s.player.mode === 'action') t++; });
    expect(t / 60).toBeCloseTo(0.5, 1);
    expect(state.player.mode).toBe('ground');
    expect(state.player.pos.z).toBeCloseTo(-1, 2);
  });
  it('refuses a 0.6 m box', () => {
    const { world, state } = boxWorld(0.6);
    run(state, world, 3);
    run(state, world, 1, { pressed: B.INTERACT });
    expect(state.player.mode).toBe('ground');
    expect(state.events.some(e => e.t === 'msg')).toBe(true);
  });
});
