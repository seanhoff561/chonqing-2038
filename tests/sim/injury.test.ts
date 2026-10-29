import { describe, it, expect } from 'vitest';
import { setup, run, secs, floor, hspeed } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';
import { sprainLeg, breakBone } from '../../src/sim/body';

const sprintSpeed = (prep: (s: ReturnType<typeof setup>['state']) => void) => {
  const { world, state } = setup([floor()]);
  prep(state);
  run(state, world, 5);
  run(state, world, secs(2), { my: 1, buttons: B.SPRINT });
  return hspeed(state);
};
const apex = (prep: (s: ReturnType<typeof setup>['state']) => void) => {
  const { world, state } = setup([floor()]);
  prep(state);
  run(state, world, 5);
  let a = 0;
  run(state, world, secs(1), { pressed: B.JUMP }, s => { a = Math.max(a, s.player.pos.y); });
  return a;
};

describe('limb injuries', () => {
  it('a sprained leg: no sprint, half jump height; heals after 36 game hours', () => {
    expect(sprintSpeed(s => sprainLeg(s))).toBeCloseTo(3.2, 1);
    const a = apex(s => sprainLeg(s));
    expect(a).toBeCloseTo(0.49 / 2, 1);
    const { world, state } = setup([floor()]);
    sprainLeg(state);
    state.time += 36 * 3600;
    run(state, world, 1);
    expect(state.body.leg).toBe('ok');
  });
  it('a broken leg: limp at 1.5 m/s, no jump, mantle max 1.0 m, no wall-run', () => {
    expect(sprintSpeed(s => breakBone(s, false))).toBeCloseTo(1.5, 1);
    expect(apex(s => breakBone(s, false))).toBeLessThan(0.01);
    for (const [h, ok] of [[0.9, true], [1.4, false]] as const) {
      const { world, state } = setup([floor(), solid(-5, 0, -10, 5, h, -3)], { x: 0, y: 0, z: -2.4, yaw: 0 });
      breakBone(state, false);
      run(state, world, 3);
      run(state, world, 1, { my: 1, pressed: B.JUMP });
      run(state, world, secs(1.5), { my: 1 });
      expect(state.player.pos.y > h - 0.01, `mantle ${h}`).toBe(ok);
    }
  });
  it('a broken arm: no pipes or hanging; a splint allows slow climbing', () => {
    const mk = () => setup([floor(), solid(-5, 0, -10, 5, 6, -3)], { x: 0, y: 0, z: -2.1, yaw: 0 }, { climbables: [{ kind: 'pipe', x: 0, z: -2.95, y0: 0, y1: 6, nx: 0, nz: 1 }] });
    const a = mk();
    breakBone(a.state, true);
    run(a.state, a.world, 3);
    run(a.state, a.world, 1, { pressed: B.INTERACT });
    expect(a.state.player.mode).not.toBe('climb');
    const b = mk();
    breakBone(b.state, true);
    b.state.body.armSplint = true;
    run(b.state, b.world, 3);
    run(b.state, b.world, 1, { pressed: B.INTERACT });
    run(b.state, b.world, secs(2), { my: 1 });
    expect(b.state.player.mode).toBe('climb');
    expect(b.state.player.pos.y).toBeCloseTo(1.0, 1);
    const c = setup([floor(), solid(-2, 0, -6, 2, 3, -3)], { x: 0, y: 1.5, z: -2.7, yaw: 0 });
    breakBone(c.state, true);
    run(c.state, c.world, 10, { my: 1 });
    expect(c.state.player.mode).not.toBe('hang');
  });
  it('a 9 m fall breaks a bone through the fall table', () => {
    const { world, state } = setup([solid(-5, -1, -30, 5, 0, 30), solid(-5, 0, -2, 5, 9, 10)], { x: 0, y: 9, z: 0, yaw: 0 });
    run(state, world, secs(3), { my: 1 });
    expect(state.body.leg === 'fracture' || state.body.arm === 'fracture').toBe(true);
  });
});
