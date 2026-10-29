import { describe, it, expect } from 'vitest';
import { setup, run, secs, hspeed } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

/** A pool 4 m deep (floor at -4, surface at 0) with a bank at 0.5 m on its north side. */
function pool() {
  return setup([
    solid(-20, -5, -20, 20, -4, 20), // pool floor
    solid(-20, -4, -40, 20, 0.5, -10), // north bank, top 0.5 above the surface
    solid(-20, -4, 10, 20, 1.0, 40),   // south bank
  ], { x: 0, y: 1.0, z: 12, yaw: 0 }, { water: [{ x0: -20, y0: -4, z0: -10, x1: 20, y1: 0, z1: 10 }] });
}

describe('swimming', () => {
  it('jumps in, swims at 1.4 m/s (2.2 sprinting) and floats at the surface', () => {
    const { world, state } = pool();
    run(state, world, secs(1.5), { my: 1 });
    expect(state.player.mode).toBe('swim');
    run(state, world, secs(2), { my: 1 });
    expect(hspeed(state)).toBeCloseTo(1.4, 1);
    expect(state.player.pos.y).toBeCloseTo(-1.45, 1);
    run(state, world, secs(1.5), { my: 1, buttons: B.SPRINT });
    expect(hspeed(state)).toBeCloseTo(2.2, 1);
    expect(state.player.wetUntil).toBeGreaterThan(state.tick);
  });
  it('dives, runs out of breath after 40 s and then drowns', () => {
    const { world, state } = pool();
    run(state, world, secs(1.5), { my: 1 });
    run(state, world, secs(3), { buttons: B.CROUCH });
    expect(state.player.pos.y).toBeLessThan(-3.5);
    let hurtAt = -1;
    run(state, world, secs(45), { buttons: B.CROUCH }, (s, i) => { if (hurtAt < 0 && s.events.some(e => e.t === 'hurt')) hurtAt = i / 60; });
    expect(hurtAt).toBeGreaterThan(36);
    expect(hurtAt).toBeLessThan(42);
  });
  it('climbs out onto a bank 0.5 m above the surface', () => {
    const { world, state } = pool();
    run(state, world, secs(1.5), { my: 1 });
    for (let i = 0; i < secs(20) && state.player.mode === 'swim'; i++) {
      const near = state.player.pos.z < -9.2;
      run(state, world, 1, { my: 1, pressed: near ? B.JUMP : 0 });
    }
    run(state, world, secs(1.5));
    expect(state.player.pos.y).toBeCloseTo(0.5, 2);
    expect(state.player.mode).toBe('ground');
  });
});
