import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, sprintJumpAt, approachAndJump } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

function wallRunGap(gap: number) {
  const r = setup([
    solid(-5, -1, 0, 5, 0, 40), solid(-5, -1, -40, 5, 0, -gap), solid(-20, -12, -60, 20, -10, 60),
    solid(-1.2, -10, -40, -1.0, 4, 40), // wall along the left side
  ], { x: -0.5, y: 0, z: 30, yaw: 0 });
  sprintJumpAt(r.state, r.world, 0.05);
  return r;
}

describe('wall-run', () => {
  it('crosses a 6 m gap along a wall that a plain jump cannot', () => {
    const { world, state } = wallRunGap(6);
    let ran = 0;
    run(state, world, secs(2), { my: 1, buttons: B.SPRINT }, s => { if (s.player.mode === 'wallrun') ran++; });
    expect(ran / 60).toBeGreaterThan(0.6);
    expect(ran / 60).toBeLessThanOrEqual(0.92);
    expect(state.player.pos.y).toBeCloseTo(0, 2);
    expect(state.player.pos.z).toBeLessThan(-6);
  });
  it('a plain jump falls into the 6 m gap', () => {
    const r = setup([solid(-5, -1, 0, 5, 0, 40), solid(-5, -1, -40, 5, 0, -6), solid(-20, -12, -60, 20, -10, 60)], { x: 0, y: 0, z: 30, yaw: 0 });
    sprintJumpAt(r.state, r.world, 0.05);
    run(r.state, r.world, secs(2), { my: 1, buttons: B.SPRINT });
    expect(r.state.player.pos.y).toBeLessThan(-0.5);
  });
  it('jumping during a wall-run leaps away from the wall', () => {
    const { world, state } = wallRunGap(6);
    run(state, world, 10, { my: 1, buttons: B.SPRINT });
    expect(state.player.mode).toBe('wallrun');
    run(state, world, 1, { my: 1, pressed: B.JUMP });
    expect(state.player.mode).toBe('air');
    expect(state.player.vel.x).toBeGreaterThan(3);
  });
});

describe('wall climb run-up', () => {
  function climb(h: number) {
    const r = setup([floor(), solid(-5, 0, -10, 5, h, -3)], { x: 0, y: 0, z: 12, yaw: 0 });
    run(r.state, r.world, 3);
    run(r.state, r.world, secs(1.2), { my: 1, buttons: B.SPRINT });
    approachAndJump(r.state, r.world, B.SPRINT, 0.9);
    let hung = false;
    run(r.state, r.world, secs(2), { my: 1 }, s => { if (s.player.mode === 'hang') hung = true; });
    if (hung) { run(r.state, r.world, 1, { pressed: B.JUMP }); run(r.state, r.world, secs(1.2)); }
    return { ...r, hung };
  }
  it('runs up a 3.5 m wall, catches the top and climbs', () => {
    const r = climb(3.5);
    expect(r.hung).toBe(true);
    expect(r.state.player.pos.y).toBeCloseTo(3.5, 2);
  });
  it('cannot climb a 4.2 m wall this way', () => {
    const r = climb(4.2);
    expect(r.hung).toBe(false);
    expect(r.state.player.pos.y).toBeLessThan(0.01);
  });
});
