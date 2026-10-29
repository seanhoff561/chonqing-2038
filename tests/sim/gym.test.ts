import { describe, it, expect } from 'vitest';
import { buildGym } from '../../src/world/sets/gym';
import { createState } from '../../src/sim/sim';
import { run, secs } from './helpers';

describe('gym world', () => {
  it('builds with obstacles, labels, climbables, hide boxes and the pool', () => {
    const w = buildGym();
    expect(w.labels.length).toBeGreaterThan(15);
    expect(w.climbables.length).toBe(5);
    expect(w.hides.length).toBe(2);
    expect(w.water.length).toBe(1);
    const s = createState(1, w);
    run(s, w, secs(1));
    expect(s.player.onGround).toBe(true);
    expect(s.player.pos.y).toBeCloseTo(0, 3);
  });
});
