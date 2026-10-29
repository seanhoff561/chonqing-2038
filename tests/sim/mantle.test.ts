import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, hspeed, approachAndJump } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

function hopOnto(h: number) {
  const { world, state } = setup([floor(), solid(-5, 0, -10, 5, h, -3)], { x: 0, y: 0, z: 0, yaw: 0 });
  run(state, world, 5);
  approachAndJump(state, world);
  let actionTicks = 0;
  run(state, world, secs(2), { my: 1 }, s => { if (s.player.mode === 'action') actionTicks++; });
  return { state, actionTime: actionTicks / 60 };
}

describe('Space hops (U-002)', () => {
  it('hops onto ledges from 0.5 to 1.2 m in about 0.35 s', () => {
    for (const h of [0.6, 0.9, 1.2]) expect(hopOnto(h).state.player.pos.y, `ledge ${h}`).toBeCloseTo(h, 2);
    expect(hopOnto(0.8).actionTime).toBeCloseTo(0.35, 1);
  });
  it('higher ledges are refused for Space', () => {
    for (const h of [1.5, 2.0]) expect(hopOnto(h).state.player.pos.y, `ledge ${h}`).toBeLessThan(0.01);
  });
});

describe('vault', () => {
  function vaultOver(depth: number, blockedBehind = false) {
    const solids = [floor(), solid(-5, 0, -3 - depth, 5, 1.0, -3)];
    if (blockedBehind) solids.push(solid(-5, 0, -3 - depth - 0.4, 5, 3, -3 - depth));
    const { world, state } = setup(solids, { x: 0, y: 0, z: 6, yaw: 0 });
    run(state, world, 5);
    run(state, world, secs(1.2), { my: 1, buttons: B.SPRINT });
    const before = hspeed(state);
    approachAndJump(state, world, B.SPRINT, 0.5);
    let after = -1, t = 0, endY = NaN;
    run(state, world, secs(1.5), { my: 1, buttons: B.SPRINT }, s => {
      if (s.player.mode === 'action') t++;
      else if (after < 0 && t > 0) { after = hspeed(s); endY = s.player.pos.y; }
    });
    return { state, before, after, endY, time: t / 60 };
  }
  it('vaults a 1.0 m high, 0.6 m deep obstacle keeping speed', () => {
    const r = vaultOver(0.6);
    expect(r.state.player.pos.y).toBeCloseTo(0, 2);
    expect(r.state.player.pos.z).toBeLessThan(-3.6);
    expect(r.time).toBeCloseTo(0.45, 1);
    expect(r.after / r.before).toBeGreaterThan(0.8);
  });
  it('mantles onto a deep obstacle instead', () => {
    const r = vaultOver(2.0);
    expect(r.endY).toBeCloseTo(1.0, 2);
  });
  it('mantles when there is no landing space behind', () => {
    const r = vaultOver(0.6, true);
    expect(r.endY).toBeCloseTo(1.0, 2);
  });
});
