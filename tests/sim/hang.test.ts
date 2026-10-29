import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, gapJump } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

/** A 4 m wide wall with its top at 3 m; he drops in front of it with his feet at 1.5 m. */
function hanging() {
  const r = setup([floor(), solid(-2, 0, -6, 2, 3, -3)], { x: 0, y: 1.5, z: -2.7, yaw: 0 });
  run(r.state, r.world, 10, { my: 1 });
  return r;
}

describe('ledge hang', () => {
  it('grabs the far ledge after falling short of a 5.2 m gap', () => {
    const { state } = gapJump(5.2, 1.0);
    expect(state.player.mode).toBe('hang');
    expect(state.player.pos.y).toBeCloseTo(-1.8, 2);
    expect(state.player.pos.z).toBeGreaterThan(-5.2);
  });
  it('grabs a ledge in reach and hangs below it', () => {
    const { state } = hanging();
    expect(state.player.mode).toBe('hang');
    expect(state.player.pos.y).toBeCloseTo(1.2, 2);
  });
  it('shimmies at 0.8 m/s and stops at the ledge end', () => {
    const { world, state } = hanging();
    run(state, world, secs(1), { mx: 1 });
    expect(state.player.pos.x).toBeCloseTo(0.8, 1);
    run(state, world, secs(4), { mx: 1 });
    expect(state.player.mode).toBe('hang');
    expect(state.player.pos.x).toBeGreaterThan(1.6);
    expect(state.player.pos.x).toBeLessThan(2.1);
    run(state, world, secs(1), { mx: -1 });
    expect(state.player.pos.x).toBeLessThan(1.4);
  });
  it('climbs up with jump', () => {
    const { world, state } = hanging();
    run(state, world, 1, { pressed: B.JUMP });
    run(state, world, secs(1.2));
    expect(state.player.pos.y).toBeCloseTo(3, 2);
    expect(state.player.pos.z).toBeLessThan(-3.2);
  });
  it('drops with Q and does not instantly regrab', () => {
    const { world, state } = hanging();
    run(state, world, 1, { pressed: B.DROP, my: 1 });
    run(state, world, secs(1.5), { my: 1 });
    expect(state.player.mode).toBe('ground');
    expect(state.player.pos.y).toBeCloseTo(0, 2);
  });
});
