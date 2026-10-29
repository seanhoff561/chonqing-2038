import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, aim, approachAndJump, LMB, RMB } from './helpers';
import { solid } from '../../src/world/geom';
import { B, type SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';
import { findGrab } from '../../src/sim/grip';

/** A 4 m wide wall north of him with its top at h; he stands just in front. */
function wall(h: number, extra: ReturnType<typeof solid>[] = []) {
  const r = setup([floor(), solid(-2, 0, -30, 2, h, -3), ...extra], { x: 0, y: 0, z: -2.55, yaw: 0 });
  run(r.state, r.world, 3);
  return r;
}

/** Hold a mouse button while looking at the lip; optionally jump first. */
function grabLip(state: SimState, world: World, top: number, bits = LMB, jump = false, x = 0) {
  aim(state, x, top - 0.1, -3);
  if (jump) run(state, world, 1, { pressed: B.JUMP });
  for (let i = 0; i < 40 && state.player.mode !== 'grip'; i++) { aim(state, x, top - 0.1, -3); run(state, world, 1, { buttons: bits }); }
}

function handMantle(h: number, jump: boolean) {
  const { world, state } = wall(h);
  grabLip(state, world, h, LMB, jump);
  const gripped = state.player.mode === 'grip';
  run(state, world, secs(3), { buttons: LMB, my: 1 });
  return { state, gripped };
}

describe('hand mantle (M1-06)', () => {
  it('grabs a lip, pulls up with W and mantles over: 1.0-2.2 m standing, 2.4 m with a jump', () => {
    for (const h of [1.0, 1.6, 2.0, 2.2]) {
      const r = handMantle(h, false);
      expect(r.gripped, `grip ${h}`).toBe(true);
      expect(r.state.player.pos.y, `ledge ${h}`).toBeCloseTo(h, 2);
    }
    expect(handMantle(2.4, false).gripped).toBe(false);
    expect(handMantle(2.4, true).state.player.pos.y).toBeCloseTo(2.4, 2);
  });
  it('a 3.0 m lip is out of reach even with a jump', () => {
    const r = handMantle(3.0, true);
    expect(r.gripped).toBe(false);
    expect(r.state.player.pos.y).toBeLessThan(0.01);
  });
});

describe('hanging and traversing (M1-10)', () => {
  it('hangs below the grip with gravity off; S lets the arms out, W pulls up; release drops him', () => {
    const { world, state } = wall(2.7, [solid(-2, 2.7, -30, 2, 6, -3.4)]); // a lip with wall above it: no mantle
    grabLip(state, world, 2.7, LMB, true);
    expect(state.player.mode).toBe('grip');
    run(state, world, secs(2), { buttons: LMB, my: -1 });
    expect(state.player.pos.y).toBeCloseTo(2.7 - 2.1, 1);
    run(state, world, secs(1.5), { buttons: LMB, my: 1, mx: 0 });
    expect(state.player.pos.y).toBeCloseTo(2.7 - 1.15, 1);
    run(state, world, 1);
    expect(state.player.mode).toBe('air');
    run(state, world, secs(1.5));
    expect(state.player.pos.y).toBeCloseTo(0, 2);
  });
  it('moves along a ledge hand over hand', () => {
    const { world, state } = wall(2.7, [solid(-2, 2.7, -30, 2, 6, -3.4)]);
    grabLip(state, world, 2.7, LMB, true, 0);
    run(state, world, secs(1), { buttons: LMB });
    for (const x of [0.9, 1.7]) {
      aim(state, x, 2.6, -3);
      const other = state.player.hands[0].grip ? RMB : LMB;
      const holding = other === LMB ? RMB : LMB;
      run(state, world, 3, { buttons: holding | other });
      run(state, world, secs(1), { buttons: other });
    }
    expect(state.player.mode).toBe('grip');
    expect(state.player.pos.x).toBeCloseTo(1.7, 1);
  });
  it('a jump falling short of a 5.2 m gap is saved by catching the far lip', () => {
    const r = setup([solid(-5, -1, 0, 5, 0, 40), solid(-5, -1, -40, 5, 0, -5.2), solid(-20, -12, -60, 20, -10, 60)], { x: 0, y: 0, z: 30, yaw: 0 });
    for (let i = 0; i < secs(10) && r.state.player.pos.z > 0.05; i++) run(r.state, r.world, 1, { my: 1, buttons: B.SPRINT });
    run(r.state, r.world, 1, { my: 1, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
    let caught = false;
    for (let i = 0; i < secs(1.5) && !caught; i++) {
      aim(r.state, 0, -0.1, -5.2);
      run(r.state, r.world, 1, { my: 1, buttons: LMB | RMB | B.SPRINT });
      caught = r.state.events.some(e => e.t === 'grab');
    }
    expect(caught).toBe(true);
    run(r.state, r.world, secs(3), { buttons: LMB | RMB, my: 1 });
    expect(r.state.player.pos.y).toBeCloseTo(0, 2);
    expect(r.state.player.pos.z).toBeLessThan(-5.2);
  });
});

describe('run-up and dyno (M1-12)', () => {
  function runUp(h: number) {
    const r = setup([floor(), solid(-5, 0, -30, 5, h, -3)], { x: 0, y: 0, z: 12, yaw: 0 });
    run(r.state, r.world, 3);
    run(r.state, r.world, secs(1.2), { my: 1, buttons: B.SPRINT });
    approachAndJump(r.state, r.world, B.SPRINT, 1.6);
    // Second Space at the wall, looking up at it (U-004).
    for (let i = 0; i < 30 && r.state.player.mode === 'air'; i++) {
      aim(r.state, 0, h, -3);
      const near = r.state.player.pos.z < -2.2;
      run(r.state, r.world, 1, { my: 1, pressed: near ? B.JUMP : 0 });
    }
    expect(r.state.player.mode).toBe('wallclimb');
    let gripped = false;
    for (let i = 0; i < secs(1.2); i++) {
      aim(r.state, 0, h - 0.1, -3);
      run(r.state, r.world, 1, { buttons: LMB });
      if (r.state.player.mode === 'grip') { gripped = true; break; }
    }
    if (gripped) run(r.state, r.world, secs(3), { buttons: LMB, my: 1 });
    return { ...r, gripped };
  }
  it('a run-up kick and a grab take a 3.5 m wall', () => {
    const r = runUp(3.5);
    expect(r.gripped).toBe(true);
    expect(r.state.player.pos.y).toBeCloseTo(3.5, 2);
  });
  it('a 4.5 m wall is out of reach', () => {
    const r = runUp(4.5);
    expect(r.gripped).toBe(false);
  });
  it('the kick alone never grabs', () => {
    const r = setup([floor(), solid(-5, 0, -10, 5, 3.0, -3)], { x: 0, y: 0, z: 12, yaw: 0 });
    run(r.state, r.world, secs(1.2), { my: 1, buttons: B.SPRINT });
    approachAndJump(r.state, r.world, B.SPRINT, 1.6);
    for (let i = 0; i < 30 && r.state.player.mode === 'air'; i++) {
      aim(r.state, 0, 3, -3);
      run(r.state, r.world, 1, { my: 1, pressed: r.state.player.pos.z < -2.2 ? B.JUMP : 0 });
    }
    run(r.state, r.world, secs(2), { my: 1 });
    expect(r.state.player.pos.y).toBeLessThan(0.01);
  });
  it('Space from a grip dynos up to a lip 2 m higher, caught by the other hand', () => {
    const { world, state } = wall(4.0, [solid(-2, 1.9, -3, 2, 2.0, -2.85)]); // a sill at 2.0 m
    aim(state, 0, 1.95, -2.85);
    for (let i = 0; i < 10 && state.player.mode !== 'grip'; i++) { aim(state, 0, 1.95, -2.85); run(state, world, 1, { buttons: LMB }); }
    expect(state.player.hands[0].grip?.y).toBeCloseTo(2.0, 2);
    run(state, world, secs(1.5), { buttons: LMB, my: 1 }); // pulled up, sill is no mantle (wall above)
    expect(state.player.mode).toBe('grip');
    aim(state, 0, 3.9, -3);
    run(state, world, 1, { buttons: LMB, pressed: B.JUMP });
    expect(state.player.mode).toBe('air');
    for (let i = 0; i < secs(1); i++) { aim(state, 0, 3.9, -3); run(state, world, 1, { buttons: RMB }); if (state.player.mode === 'grip') break; }
    expect(state.player.hands[1].grip?.y).toBeCloseTo(4.0, 2);
  });
});

describe('grabbing rules (M1-26)', () => {
  it('open air, smooth wall faces and floors far from edges are not grabbable', () => {
    const { world, state } = wall(6);
    aim(state, 0, 1.8, -3); // mid-wall
    expect(findGrab(world, state.player)).toBeNull();
    aim(state, 0, 2.0, 3);
    expect(findGrab(world, state.player)).toBeNull();
    aim(state, 0, 0, -1.2);
    expect(findGrab(world, state.player)).toBeNull();
  });
  it('grabbing stows the held item and endurance slips the grip', () => {
    const { world, state } = wall(2.7, [solid(-2, 2.7, -30, 2, 6, -3.4)]);
    state.inv.held = 2;
    grabLip(state, world, 2.7, LMB, true);
    expect(state.inv.held).toBe(0);
    let slipped = -1;
    run(state, world, secs(25), { buttons: LMB }, (s, i) => { if (slipped < 0 && s.player.mode !== 'grip') slipped = i / 60; });
    expect(slipped).toBeGreaterThan(14);
    expect(slipped).toBeLessThan(19);
  });
});

describe('momentum through the hands (M1-26, U-004)', () => {
  /** Sprint (or walk) north along a wall at x = -1 and grab a pipe on it as he passes. */
  function passPipe(buttons: number, bits: number) {
    const r = setup([floor(), solid(-1.2, 0, -40, -1.0, 6, 40)], { x: -0.5, y: 0, z: 10, yaw: 0 }, {
      climbables: [{ kind: 'pipe', x: -1.0, z: -5, y0: 0, y1: 6, nx: 1, nz: 0 }],
    });
    run(r.state, r.world, secs(2), { my: 1, buttons });
    for (let i = 0; i < secs(15) && r.state.player.pos.z > -4.5; i++) run(r.state, r.world, 1, { my: 1, buttons });
    let grabbed = false, slipped = false;
    for (let i = 0; i < 40; i++) {
      aim(r.state, -0.92, 1.5, -5);
      run(r.state, r.world, 1, { buttons: bits });
      if (r.state.player.mode === 'grip') grabbed = true;
      if (r.state.events.some(e => e.t === 'sfx' && e.id === 'slip')) slipped = true;
    }
    return { ...r, grabbed, slipped };
  }
  it('one hand at a sprint catches, redirects him and slips', () => {
    const r = passPipe(B.SPRINT, LMB);
    expect(r.grabbed).toBe(true);
    expect(r.slipped).toBe(true);
  });
  it('two hands stop a sprint', () => {
    const r = passPipe(B.SPRINT, LMB | RMB);
    expect(r.slipped).toBe(false);
    expect(r.state.player.mode).toBe('grip');
  });
  it('one hand holds when he is moving slowly', () => {
    const r = passPipe(B.CROUCH, LMB);
    expect(r.grabbed).toBe(true);
    expect(r.slipped).toBe(false);
  });
});
