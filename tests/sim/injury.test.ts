import { describe, it, expect } from 'vitest';
import { setup, run, secs, floor, hspeed, aim, LMB } from './helpers';
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
    expect(a).toBeCloseTo((3.5 * 3.5) / (2 * 9.81) / 2, 1);
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
  it('a broken arm: no grabbing; a splint allows slow climbing with a weaker grip', () => {
    const mk = () => {
      const r = setup([floor(), solid(-2, 0, -30, 2, 2.0, -3), solid(-2, 2.0, -30, 2, 6, -3.4)], { x: 0, y: 0, z: -2.55, yaw: 0 });
      run(r.state, r.world, 3);
      return r;
    };
    const grab = (r: ReturnType<typeof mk>) => { for (let i = 0; i < 5; i++) { aim(r.state, 0, 1.9, -3); run(r.state, r.world, 1, { buttons: LMB }); } };
    const a = mk();
    breakBone(a.state, true);
    grab(a);
    expect(a.state.player.mode).not.toBe('grip');
    const b = mk();
    breakBone(b.state, true);
    b.state.body.armSplint = true;
    grab(b);
    expect(b.state.player.mode).toBe('grip');
    const e0 = b.state.player.endurance;
    run(b.state, b.world, secs(1), { buttons: LMB });
    expect(e0 - b.state.player.endurance).toBeCloseTo(12, 0);
  });
  it('a 9 m fall breaks a bone through the fall table', () => {
    const { world, state } = setup([solid(-5, -1, -30, 5, 0, 30), solid(-5, 0, -2, 5, 9, 10)], { x: 0, y: 9, z: 0, yaw: 0 });
    run(state, world, secs(3), { my: 1 });
    expect(state.body.leg === 'fracture' || state.body.arm === 'fracture').toBe(true);
  });
});
