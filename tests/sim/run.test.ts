import { describe, it, expect } from 'vitest';
import { buildHideoutScene } from '../../src/world/sets/hideout-scene';
import { createState } from '../../src/sim/sim';
import { startRun, furnish, START_BED, START_CRATE, FRIENDS_CRATE } from '../../src/sim/run';
import { getWorld } from '../../src/world/build';
import { stashIds } from '../../src/sim/shelter';
import { count } from '../../src/sim/inventory';
import { shelfLeft } from '../../src/sim/food';

describe('starting supplies', () => {
  it('a new run carries a day of food and water in the backpack (U-013)', () => {
    const w = buildHideoutScene(), s = createState(3, w);
    startRun(s, w);
    const g = s.inv.pack;
    for (const [id, n] of [['noodles', 2], ['luncheon', 1], ['bread', 1], ['water', 3], ['bandage', 1]] as const) expect(count(g, id), id).toBe(n);
    expect(shelfLeft(s, g.items.find(i => i.id === 'bread')!)).toBeCloseTo(2);
  });
  it("starts in the friends' hideout under the vent grate: their mattress claimed, their crate stocked (U-018)", { timeout: 60000 }, () => {
    const w = getWorld('yuzhong'), s = createState(3, w);
    startRun(s, w);
    const sc = w.spawn;
    expect(s.shelters.map(h => h.id)).toEqual([START_BED]);
    expect(Math.hypot(s.shelters[0].x - sc.x, s.shelters[0].z - sc.z)).toBeLessThan(3);
    for (const [id, n] of FRIENDS_CRATE) expect(count(s.containers[START_CRATE], id), id).toBe(n);
    expect(stashIds(s, w, s.shelters[0])).toContain(START_CRATE);
    // The grate is straight above the chamber, open to the street.
    const g = w.props.find(p => p.kind === 'grate')!;
    expect(Math.hypot(g.x - sc.x, g.z - sc.z)).toBeLessThan(10);
    expect(g.y - sc.y).toBeGreaterThan(8);
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
    expect(s.shelters[0].battery).toBe(60);
  });
});
