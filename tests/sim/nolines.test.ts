// M3-82 (U-044): no prebuilt climbing lines. Nothing laid out as a way up a tower or a taller block: no stub lines
// from a neighbour's roof, no holds wandering over a tower's skyline.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';

describe('no prebuilt climbing lines (M3-82)', () => {
  it('has no route stubs, rest floors or line tops anywhere', () => {
    const w = getWorld('yuzhong');
    expect(w.features.filter(f => ['route', 'rest', 'routeTop', 'crossing'].includes(f.kind)).length).toBe(0);
  });
});
