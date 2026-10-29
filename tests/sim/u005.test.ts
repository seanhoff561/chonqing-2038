import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, aim, LMB, RMB } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

describe('tap and hold jump height (M1-36)', () => {
  it('a tap reaches about 40% of a held jump', () => {
    const apex = (hold: number) => {
      const { world, state } = setup([floor()]);
      run(state, world, 5);
      let a = 0;
      run(state, world, hold, { pressed: B.JUMP, buttons: B.JUMP }, s => { a = Math.max(a, s.player.pos.y); });
      run(state, world, secs(1.2), {}, s => { a = Math.max(a, s.player.pos.y); });
      return a;
    };
    const tap = apex(1), full = apex(secs(0.6));
    expect(full).toBeGreaterThan(0.6);
    expect(tap / full).toBeGreaterThan(0.3);
    expect(tap / full).toBeLessThan(0.5);
  });
});

/** Run at a tall wall and jump into it. */
function jumpIntoWall() {
  const r = setup([floor(), solid(-5, 0, -30, 5, 8, -3)], { x: 0, y: 0, z: 4, yaw: 0 });
  run(r.state, r.world, secs(0.8), { my: 1 });
  for (let i = 0; i < secs(3) && r.state.player.pos.z > -1.6; i++) run(r.state, r.world, 1, { my: 1 });
  run(r.state, r.world, 1, { my: 1, pressed: B.JUMP, buttons: B.JUMP });
  return r;
}

describe('wall cling window (M1-35)', () => {
  it('jumping into a wall clings about 0.35 s, barely sliding, then slides down', () => {
    const { world, state } = jumpIntoWall();
    let t = 0, y0 = NaN, y1 = NaN, cue = false;
    run(state, world, secs(1.5), { my: 1, buttons: B.JUMP }, s => {
      if (s.events.some(e => e.t === 'sfx' && e.id === 'cling')) cue = true;
      if (s.player.mode === 'cling') { t++; if (isNaN(y0)) y0 = s.player.pos.y; y1 = s.player.pos.y; }
    });
    expect(cue).toBe(true);
    expect(t / 60).toBeCloseTo(0.35, 1);
    expect(y0 - y1).toBeLessThan(0.2);
    expect(state.player.pos.y).toBeLessThan(0.01);
  });
  it('a kick from the cling goes where the camera looks', () => {
    const { world, state } = jumpIntoWall();
    for (let i = 0; i < 40 && state.player.mode !== 'cling'; i++) run(state, world, 1, { my: 1, buttons: B.JUMP });
    expect(state.player.mode).toBe('cling');
    run(state, world, 1, { pressed: B.JUMP, yaw: Math.PI * 0.75 });
    expect(state.player.vel.z).toBeGreaterThan(3);
    expect(state.player.vel.x).toBeLessThan(-2);
  });
});

/** Hang from a 2.7 m lip on a wall (wall above it, so no mantle). */
function hang() {
  const r = setup([floor(), solid(-2, 0, -30, 2, 2.7, -3), solid(-2, 2.7, -30, 2, 6, -3.4)], { x: 0, y: 0, z: -2.55, yaw: 0 });
  run(r.state, r.world, 3);
  aim(r.state, 0, 2.6, -3);
  run(r.state, r.world, 1, { pressed: B.JUMP, buttons: B.JUMP });
  for (let i = 0; i < 40 && r.state.player.mode !== 'grip'; i++) { aim(r.state, 0, 2.6, -3); run(r.state, r.world, 1, { buttons: LMB | RMB | B.JUMP }); }
  run(r.state, r.world, secs(1), { buttons: LMB | RMB });
  return r;
}

describe('push-off from a hang (M1-32)', () => {
  it('feet on the wall: Space looking up dynos', () => {
    const { world, state } = hang();
    expect(state.player.mode).toBe('grip');
    state.player.pitch = 0.9;
    run(state, world, 1, { pressed: B.JUMP, pitch: 0.9, buttons: LMB | RMB });
    expect(state.player.mode).toBe('air');
    expect(state.player.vel.y).toBeGreaterThan(4);
  });
  it('feet on the wall: Space looking away kicks off that way', () => {
    const { world, state } = hang();
    run(state, world, 1, { pressed: B.JUMP, yaw: Math.PI * 0.75, pitch: 0, buttons: LMB | RMB });
    expect(state.player.vel.z).toBeGreaterThan(3);
    expect(state.player.vel.x).toBeLessThan(-2);
  });
});

describe('mouse pull while gripping (M1-33)', () => {
  it('dragging down hauls him up and dragging right shifts him right', () => {
    const { world, state } = hang();
    run(state, world, secs(1), { buttons: LMB | RMB, my: -1 }); // arms out
    const y0 = state.player.pos.y, x0 = state.player.pos.x;
    for (let i = 0; i < 30; i++) run(state, world, 1, { buttons: LMB | RMB, pitch: state.player.pitch - 0.02 });
    run(state, world, 30, { buttons: LMB | RMB });
    expect(state.player.pos.y - y0).toBeGreaterThan(0.3);
    for (let i = 0; i < 30; i++) run(state, world, 1, { buttons: LMB | RMB, yaw: state.player.yaw - 0.015 });
    run(state, world, 30, { buttons: LMB | RMB });
    expect(state.player.pos.x - x0).toBeGreaterThan(0.2);
  });
});

describe('bar swing and lache (M1-34)', () => {
  /** Two bars 4 m apart (z = 0 and z = -4) at 2.15 m over a pit; he starts on a ledge behind the first. */
  function bars() {
    const r = setup([
      solid(-4, -1, 0.6, 4, 0, 10), solid(-10, -7, -20, 10, -6, 20), solid(-4, -1, -20, 4, 0, -6),
      solid(-2, 2.1, -0.03, 2, 2.15, 0.03), solid(-2, 2.1, -4.03, 2, 2.15, -3.97),
    ], { x: 0, y: 0, z: 0.9, yaw: 0 });
    run(r.state, r.world, 3);
    for (let i = 0; i < 20 && r.state.player.mode !== 'grip'; i++) { aim(r.state, 0, 2.12, 0.03); run(r.state, r.world, 1, { buttons: LMB | RMB }); }
    return r;
  }
  it('hangs free and Space pumps a swing with a limit', () => {
    const { world, state } = bars();
    expect(state.player.mode).toBe('grip');
    let peak = 0, last = -99;
    for (let i = 0; i < secs(10); i++) {
      const pump = i - last > 30 && state.player.vel.z < -0.3;
      if (pump) last = i;
      run(state, world, 1, { buttons: LMB | RMB, yaw: 0, pressed: pump ? B.JUMP : 0 });
      peak = Math.max(peak, Math.hypot(state.player.vel.x, state.player.vel.z));
    }
    expect(state.player.mode).toBe('grip');
    expect(peak).toBeGreaterThan(3);
    expect(peak).toBeLessThanOrEqual(6.6);
  });
  it('letting go mid-swing laches him to the next bar', () => {
    const { world, state } = bars();
    let released = false, caught = false, last = -99;
    for (let i = 0; i < secs(14) && !caught; i++) {
      const p = state.player;
      if (!released) {
        const pump = i - last > 30 && p.vel.z < -0.3;
        if (pump) last = i;
        const go = i > secs(4) && p.vel.z < -2.5 && p.vel.y > 2.5; // let go on the way up the front of the swing
        if (go) released = true;
        run(state, world, 1, { buttons: go ? 0 : LMB | RMB, yaw: 0, pressed: pump ? B.JUMP : 0 });
      } else {
        aim(state, 0, 2.12, -3.97);
        run(state, world, 1, { buttons: LMB | RMB });
        caught = p.mode === 'grip' && (p.hands[0].grip?.z ?? 0) < -3.5;
      }
    }
    expect(released).toBe(true);
    expect(caught).toBe(true);
  });
});
