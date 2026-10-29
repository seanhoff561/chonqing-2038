import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, hspeed } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

/** A 0.6 m-high gap under a slab from z -3 to -6, walls either side. */
const gapWorld = (clear = 0.6) => setup([floor(), solid(-5, clear, -6, 5, 3, -3)], { x: 0, y: 0, z: 0, yaw: 0 });

describe('crouch and crawl', () => {
  it('crawling passes a 0.6 m gap that crouching cannot', () => {
    const a = gapWorld();
    run(a.state, a.world, 3);
    run(a.state, a.world, 1, { pressed: B.CROUCH });
    run(a.state, a.world, secs(6), { my: 1 });
    expect(a.state.player.pos.z).toBeGreaterThan(-3);
    const b = gapWorld();
    run(b.state, b.world, 3);
    run(b.state, b.world, 1, { pressed: B.CRAWL });
    expect(b.state.player.posture).toBe('crawl');
    run(b.state, b.world, secs(10), { my: 1 });
    expect(b.state.player.pos.z).toBeLessThan(-6.3);
  });
  it('getting up is refused under the slab', () => {
    const b = gapWorld();
    run(b.state, b.world, 3);
    run(b.state, b.world, 1, { pressed: B.CRAWL });
    run(b.state, b.world, secs(5), { my: 1 });
    expect(b.state.player.pos.z).toBeLessThan(-3.5);
    run(b.state, b.world, 1, { pressed: B.CRAWL });
    expect(b.state.player.posture).toBe('crawl');
    run(b.state, b.world, 1, { pressed: B.CROUCH });
    expect(b.state.player.posture).toBe('crawl');
  });
});

describe('slide', () => {
  it('slides under a bar with 0.6 m clearance, decelerating, and ends crouched', () => {
    const { world, state } = setup([floor(), solid(-5, 0.6, -9, 5, 1.2, -8.5)], { x: 0, y: 0, z: 6, yaw: 0 });
    run(state, world, 3);
    run(state, world, secs(1.6), { my: 1, buttons: B.SPRINT });
    expect(hspeed(state)).toBeGreaterThan(6);
    run(state, world, 1, { my: 1, pressed: B.CROUCH });
    expect(state.player.slide).toBeGreaterThanOrEqual(0);
    const v0 = hspeed(state);
    let t = 0;
    run(state, world, secs(1.1), { my: 1 }, s => { if (s.player.slide >= 0) t++; });
    expect(v0).toBeGreaterThan(7);
    expect(t / 60).toBeCloseTo(1.0, 1);
    expect(state.player.pos.z).toBeLessThan(-9.2);
    expect(state.player.posture).toBe('crouch');
  });
});
