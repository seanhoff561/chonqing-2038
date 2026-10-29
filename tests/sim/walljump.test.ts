import { describe, it, expect } from 'vitest';
import { setup, run, floor } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

/** In the air beside a wall on his west (normal +x), then Space while looking along `yaw`. */
function kick(yaw: number, pitch = 0, kicks = 0) {
  const r = setup([floor(), solid(-1.2, 0, -40, -1.0, 10, 40)], { x: -0.5, y: 3, z: 0, yaw });
  const p = r.state.player;
  p.mode = 'air'; p.onGround = false; p.kicks = kicks; p.pitch = pitch;
  run(r.state, r.world, 1, { pressed: B.JUMP, yaw, pitch });
  return r.state;
}

describe('wall jump by camera direction (M1-30)', () => {
  it('kicks straight off at 90 degrees', () => {
    const s = kick(-Math.PI / 2);
    expect(s.player.vel.x).toBeCloseTo(5.5, 1);
    expect(Math.abs(s.player.vel.z)).toBeLessThan(0.01);
    expect(s.player.vel.y).toBeGreaterThan(3);
    expect(s.events.some(e => e.t === 'sfx' && e.id === 'wallkick')).toBe(true);
  });
  it('kicks off at 45 degrees where the camera points', () => {
    const s = kick(-Math.PI / 4);
    expect(s.player.vel.x).toBeCloseTo(5.5 * Math.SQRT1_2, 1);
    expect(s.player.vel.z).toBeCloseTo(-5.5 * Math.SQRT1_2, 1);
  });
  it('facing the wall kicks up it, never into it (U-020)', () => {
    const s = kick(Math.PI / 2 + 0.3);
    expect(s.player.mode).toBe('wallclimb');
    expect(s.player.vel.y).toBeGreaterThan(4);
    expect(s.player.vel.x).toBeGreaterThan(-1);
  });
  it('looking up at the wall kicks up it', () => {
    const s = kick(Math.PI / 2, 0.8);
    expect(s.player.mode).toBe('wallclimb');
    expect(s.player.vel.y).toBeGreaterThan(4);
  });
  it('a third wall move in one airtime is refused, and landing resets them', () => {
    const s = kick(-Math.PI / 2, 0, 2);
    expect(s.player.vel.x).toBe(0);
    const r = setup([floor(), solid(-1.2, 0, -40, -1.0, 10, 40)], { x: -0.5, y: 0, z: 0, yaw: 0 });
    r.state.player.kicks = 2;
    run(r.state, r.world, 3);
    expect(r.state.player.kicks).toBe(0);
  });
});
