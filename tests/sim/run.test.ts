import { describe, it, expect } from 'vitest';
import { buildHideoutScene } from '../../src/world/sets/hideout-scene';
import { createState } from '../../src/sim/sim';
import { startRun, furnish } from '../../src/sim/run';
import { count } from '../../src/sim/inventory';
import { shelfLeft } from '../../src/sim/food';

describe('starting supplies', () => {
  it('a new run carries a day of food and water in the backpack and has no shelter (U-013)', () => {
    const s = createState(3, buildHideoutScene());
    startRun(s);
    const g = s.inv.pack;
    for (const [id, n] of [['noodles', 2], ['luncheon', 1], ['bread', 1], ['water', 3], ['bandage', 1]] as const) expect(count(g, id), id).toBe(n);
    expect(shelfLeft(s, g.items.find(i => i.id === 'bread')!)).toBeCloseTo(2);
    expect(s.shelter.id).toBe('');
  });
  it('the furnished test shelter: the stash holds a day of food and water; the car battery is at 60%', () => {
    const w = buildHideoutScene();
    const s = createState(3, w);
    furnish(s, w);
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
