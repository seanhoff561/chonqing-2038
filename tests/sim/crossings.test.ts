// M3-37a (U-034, U-035): the connections. Makeshift crossings over the streets (planks, I-beams, cable bundles),
// cable bundles between close buildings hung with junk, bars across the narrow gaps, steel walkways roof to roof,
// planks out of windows; each one solid underfoot, none in reach of the street, and a cable and a plank walked.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { raycast } from '../../src/world/geom';
import { heightAt } from '../../src/world/heightfield';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { BARE } from '../../src/world/city/climb';
import type { Feature } from '../../src/world/world';
import { run, secs, settle } from './helpers';

const w = getWorld('yuzhong');
/** The connections of a kind, as their two ends. */
const pairs = (kind: string) => {
  const by = new Map<number, Feature[]>();
  for (const f of w.features) if (f.kind === kind) (by.get(f.group) ?? by.set(f.group, []).get(f.group)!).push(f);
  return [...by.values()].filter(e => e.length === 2) as [Feature, Feature][];
};
/** Whether there's something to stand on a little under (x, y, z). */
const under = (x: number, y: number, z: number, drop: number) => { const h = raycast(w.index, x, y + 1, z, 0, -1, 0, 1 + drop); return !!h; };

describe('the connections (M3-37a)', () => {
  it('crosses the streets, joins close buildings and hangs their cables with junk', () => {
    const street = pairs('crossPlank').length + pairs('crossBeam').length + pairs('crossCord').length;
    expect(street).toBeGreaterThan(30);
    expect(pairs('crossBeam').length).toBeGreaterThan(5);
    expect(pairs('cord').length).toBeGreaterThan(500);
    expect(pairs('gapBar').length).toBeGreaterThan(500);
    expect(pairs('walkway').length).toBeGreaterThan(50);
    expect(w.features.filter(f => f.kind === 'winPlank').length).toBeGreaterThan(15);
  });

  it('puts something underfoot along each one, out of reach of the street', () => {
    let bad = 0, low = 0, n = 0;
    for (const [kind, sag] of [['crossPlank', 0.1], ['crossBeam', 0.1], ['crossCord', 1.2], ['walkway', 0.15], ['cord', 0.8]] as const) for (const [a, b] of pairs(kind)) {
      n++;
      const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2, y = (a.y + b.y) / 2 + 0.02;
      if (!under(x, y, z, sag)) bad++;
      if (y - (heightAt(w.ground!, x, z) ?? 0) < BARE) low++;
    }
    expect(n).toBeGreaterThan(500);
    expect(bad / n).toBeLessThan(0.02);
    expect(low).toBe(0);
  });

  it('walks a cable bundle and a plank across, end to end', async () => {
    await settle();
    const walk = (a: Feature, b: Feature) => {
      const s = createState(1, w), p = s.player, yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z)), len = Math.hypot(b.x - a.x, b.z - a.z);
      s.flags.clear = true;
      teleport(p, a.x + (b.x - a.x) * (0.4 / len), a.y + 0.05, a.z + (b.z - a.z) * (0.4 / len));
      run(s, w, 10);
      for (let t = 0; t < secs(15) && Math.hypot(b.x - p.pos.x, b.z - p.pos.z) > 0.6; t++) run(s, w, 1, { my: 0.5, yaw, buttons: 0 });
      return Math.hypot(b.x - p.pos.x, b.z - p.pos.z) <= 0.6 && p.pos.y > Math.min(a.y, b.y) - 1.5 && !s.dead;
    };
    const tries = (kind: string) => pairs(kind).filter(([a, b]) => Math.abs(a.y - b.y) < 0.5).slice(0, 6).map(([a, b]) => walk(a, b));
    expect(tries('cord').filter(Boolean).length, 'cords').toBeGreaterThanOrEqual(2);
    expect(tries('crossPlank').filter(Boolean).length, 'planks').toBeGreaterThanOrEqual(2);
  });
});
