import { describe, it, expect } from 'vitest';
import { buildHideoutScene } from '../../src/world/sets/hideout-scene';
import { createState } from '../../src/sim/sim';
import { startRun } from '../../src/sim/run';
import { count } from '../../src/sim/inventory';
import { shelfLeft } from '../../src/sim/food';

describe('starting supplies', () => {
  it('the stash holds a day of food and water; the car battery is at 60%', () => {
    const w = buildHideoutScene();
    const s = createState(3, w);
    startRun(s, w);
    const g = s.containers.stash;
    expect([g.w, g.h]).toEqual([10, 8]);
    expect(count(g, 'noodles')).toBe(2);
    expect(count(g, 'luncheon')).toBe(1);
    expect(count(g, 'bread')).toBe(1);
    expect(count(g, 'water')).toBe(3);
    expect(count(g, 'bandage')).toBe(1);
    expect(shelfLeft(s, g.items.find(i => i.id === 'bread')!)).toBeCloseTo(2);
    expect(s.shelter.battery).toBe(60);
  });
});
