// M1-41 (U-020): slides gather speed downhill, steep ground is a wall, grabs tear loose and wall moves are
// refused when falling too fast. (U-038, M3-70: only near-wall ground is a wall; up to it he walks, slower.)
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, hspeed, aim, LMB } from './helpers';
import { solid, rampSolid } from '../../src/world/geom';
import { heightfield, heightAt } from '../../src/world/heightfield';
import { makeWorld } from '../../src/world/world';
import { createState } from '../../src/sim/sim';
import { B } from '../../src/sim/types';
import { movement as M } from '../../src/data/movement';

/** A sprint along -z, then Ctrl to slide, on ground rising (or falling) along z by `grade` from z = 0. */
function slideOn(grade: number) {
  // Ramp falling toward -z when grade > 0 (downhill), from 0 at z = 0.
  const len = 40, drop = Math.abs(grade) * len;
  const solids = [solid(-5, -60, 0, 5, 0, 40), grade > 0 ? rampSolid(-5, -60, -len, 5, 0, -drop, 0, 3) : rampSolid(-5, -60, -len, 5, 0, 0, drop, 4), solid(-20, -80, -120, 20, -70, 60)];
  const { world, state } = setup(solids, { x: 0, y: 0.05, z: 20, yaw: 0 });
  for (let i = 0; i < secs(4) && state.player.pos.z > 0.5; i++) run(state, world, 1, { my: 1, buttons: B.SPRINT });
  run(state, world, 1, { my: 1, buttons: B.SPRINT | B.CROUCH, pressed: B.CROUCH });
  const start = hspeed(state);
  let t = 0;
  for (; t < secs(4) && state.player.slide >= 0; t++) run(state, world, 1, { buttons: B.CROUCH });
  return { start, end: hspeed(state), time: t / 60, state };
}

describe('slides (U-020)', () => {
  it('runs out on the flat in about 1.3 s', () => {
    const r = slideOn(0);
    expect(r.time).toBeGreaterThan(1.0);
    expect(r.time).toBeLessThan(1.6);
  });
  it('gathers speed down stairs-steep ground and lasts longer', () => {
    const r = slideOn(0.7);
    expect(r.state.player.slide).toBeGreaterThanOrEqual(0);
    expect(hspeed(r.state)).toBeGreaterThan(r.start + 1);
  });
  it('dies quickly uphill', () => {
    expect(slideOn(-0.5).time).toBeLessThan(slideOn(0).time);
  });
});

describe('steep ground is a wall (U-020, U-038)', () => {
  /** Ground rising north at `k` per metre from z = 0. */
  function hill(k: number) {
    const g = heightfield(-30, -30, 2, 31, 31, 4);
    for (let j = 0; j < 31; j++) for (let i = 0; i < 31; i++) g.y[j * 31 + i] = Math.max(0, -(-30 + j * 2)) * k;
    const world = makeWorld({ name: 't', solids: [], ground: g, spawn: { x: 0, y: 0.05, z: 10, yaw: 0 } });
    return { world, state: createState(1, world), g };
  }
  it('walks up 60 degrees, slower the steeper, but not 80', () => {
    // Uphill speed off the 10 m mark, from his time over the next 2 m of the slope's run.
    const pace = (deg: number) => {
      const h = hill(Math.tan((deg * Math.PI) / 180)), p = h.state.player;
      let t = 0;
      for (; t < secs(12) && p.pos.z > -2; t++) run(h.state, h.world, 1, { my: 1 });
      return { y: p.pos.y, t };
    };
    const flat = pace(0), mid = pace(40), steep = pace(60);
    expect(mid.y).toBeGreaterThan(1.5);
    expect(steep.y).toBeGreaterThan(3);
    expect(mid.t).toBeGreaterThan(flat.t);
    expect(steep.t).toBeGreaterThan(mid.t);
    // (At 80 degrees his footprint's front edge at its foot already stands 1.4 m up it: no further.)
    const wall = hill(Math.tan((80 * Math.PI) / 180));
    run(wall.state, wall.world, secs(6), { my: 1 });
    expect(wall.state.player.pos.y).toBeLessThan(1.6);
    expect(wall.state.player.pos.z).toBeGreaterThan(-0.4);
  });
  it('standing on an 80 degree slope he slides off it', () => {
    const steep = hill(Math.tan((80 * Math.PI) / 180)), y = heightAt(steep.g, 0, -8)!;
    Object.assign(steep.state.player.pos, { x: 0, y: y + 0.2, z: -8 });
    run(steep.state, steep.world, secs(3));
    expect(steep.state.player.pos.z).toBeGreaterThan(-2);
    expect(steep.state.player.pos.y).toBeLessThan(1.6);
  });
  it('an 80 degree slope takes a wall kick up it', () => {
    // In the air just off its foot, the face rising in front of him.
    const steep = hill(Math.tan((80 * Math.PI) / 180)), p = steep.state.player;
    Object.assign(p.pos, { x: 0, y: 1.5, z: 0.3 });
    p.mode = 'air'; p.onGround = false;
    run(steep.state, steep.world, 1, { pressed: B.JUMP, yaw: 0 });
    expect(p.mode).toBe('wallclimb');
  });
});

describe('too fast to hold (U-020)', () => {
  /** Falling past a 4 m wide wall's lip at speed v with the left hand held. */
  function grabAt(v: number) {
    const { world, state } = setup([floor(-60), solid(-2, -60, -30, 2, 10, -3)], { x: 0, y: 10.3, z: -2.55, yaw: 0 });
    const p = state.player;
    p.mode = 'air'; p.onGround = false; p.vel.y = -v; p.fallFrom = 60;
    let gripped = false, torn = false;
    for (let i = 0; i < 20; i++) { aim(state, 0, 9.9, -3); run(state, world, 1, { buttons: LMB }, s => { if (s.events.some(e => e.t === 'msg' && e.text === 'torn loose')) torn = true; }); if ((p.mode as string) === 'grip') gripped = true; }
    return { gripped, torn, state };
  }
  it('a grab holds at 10 m/s', () => expect(grabAt(10).gripped).toBe(true));
  it('tears loose at 18 m/s, a fall of more than 12 m', () => {
    const r = grabAt(18);
    expect(r.gripped).toBe(false);
    expect(r.torn).toBe(true);
    expect(M.tear.speed).toBeGreaterThan(Math.sqrt(2 * M.gravity * 11));
  });
  it('refuses wall kicks when falling that fast', () => {
    const { world, state } = setup([floor(), solid(-1.2, 0, -40, -1.0, 30, 40)], { x: -0.5, y: 20, z: 0, yaw: -Math.PI / 2 });
    const p = state.player;
    p.mode = 'air'; p.onGround = false; p.vel.y = -17;
    run(state, world, 1, { pressed: B.JUMP, yaw: -Math.PI / 2 });
    expect(p.vel.y).toBeLessThan(-15);
    expect(p.mode).toBe('air');
  });
});

describe('jumps off slopes (U-028)', () => {
  /** Run along -z on ground rising by `grade` and jump: his take-off climb rate. */
  const takeoff = (grade: number) => {
    const len = 40, rise = Math.abs(grade) * len;
    const solids = [solid(-5, -60, 0, 5, 0, 40), grade > 0 ? rampSolid(-5, -60, -len, 5, 0, 0, rise, 4) : rampSolid(-5, -60, -len, 5, 0, -rise, 0, 3), solid(-20, -80, -120, 20, -70, 60)];
    const { world, state } = setup(solids, { x: 0, y: 0.05, z: 20, yaw: 0 });
    for (let i = 0; i < secs(6) && state.player.pos.z > -10; i++) run(state, world, 1, { my: 1, buttons: B.SPRINT });
    run(state, world, 1, { my: 1, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
    return state.player.vel.y;
  };
  it('leaves along the slope: faster up running uphill, slower running downhill', () => {
    const flat = takeoff(0), up = takeoff(0.4), down = takeoff(-0.4);
    expect(up).toBeGreaterThan(flat + 1);
    expect(down).toBeLessThan(flat - 1);
    expect(flat).toBeCloseTo(M.jumpSpeed - M.gravity / 60, 1);
  });
});
