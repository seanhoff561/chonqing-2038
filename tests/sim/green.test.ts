// M3-56b (U-028): the green city. The real map's parks and the land the buildings left go green: woods thick with
// trees and wild grass, parks with trees and shrubs; since M3-60 (U-031) the parks and the bigger open ground are
// laid out, their grass in kerbed lawns.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { heightAt } from '../../src/world/heightfield';
import { raycast } from '../../src/world/geom';
import { MARK, markAt, grassAt } from '../../src/world/yuzhong/marks';
import { polyArea } from '../../src/world/yuzhong/shapes';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { run, settle } from './helpers';
import { climbPole } from './climbbot';

const w = getWorld('yuzhong'), mk = w.marks!, g = w.ground!;
const area = (v: number) => mk.m.filter(x => x === v).length * mk.cell * mk.cell;
const on = (kinds: string[], v: number) => w.props.filter(p => kinds.includes(p.kind) && markAt(mk, p.x, p.z) === v).length;

/** The trees, every species (M3-62). */
const TREES = ['tree', 'figtree', 'camphor', 'ginkgo', 'palm', 'bamboo'];

describe('the green city (M3-56b)', () => {
  it('grows woods on the land away from the buildings: a tree every 50 m2 or so', () => {
    expect(on(TREES, MARK.wood) / area(MARK.wood)).toBeGreaterThan(1 / 60);
    expect(on(['shrub'], MARK.wood)).toBeGreaterThan(200);
  });
  it('keeps trees and shrubs in the parks', () => {
    const lawn = w.lawns!.reduce((a, p) => a + polyArea(p), 0);
    expect(on(TREES, MARK.laid) / lawn).toBeGreaterThan(1 / 250);
    // (Their edges hedged since M3-62.)
    expect(on(['shrub', 'hedge'], MARK.laid)).toBeGreaterThan(100);
  });
  it('grows grass wild over the woods and in lawns over the parks, weeds on the open ground', () => {
    let wood = 0, grass = 0;
    for (let j = 0; j < mk.h; j++) for (let i = 0; i < mk.w; i++) if (mk.m[j * mk.w + i] === MARK.wood) { wood++; if (grassAt(mk, (i + 0.5) * mk.cell, (j + 0.5) * mk.cell)) grass++; }
    expect(grass / wood).toBe(1);
    expect(grassAt(mk, -10, -10)).toBe(false);
    // Lawns over the real parks (a hectare or more), nowhere wild grass on the open ground.
    expect(w.lawns!.reduce((a, p) => a + polyArea(p), 0)).toBeGreaterThan(1e4);
    expect(on(['weeds'], MARK.open) + on(['weeds'], MARK.wood)).toBeGreaterThan(300);
  });
  it('stands every tree and shrub on the ground (or, a shrub, on whatever is under it)', () => {
    const off = w.props.filter(p => {
      if (![...TREES, 'shrub'].includes(p.kind) || !markAt(mk, p.x, p.z) || Math.abs(p.y - (heightAt(g, p.x, p.z) ?? -99)) < 0.05) return false;
      const hit = p.kind === 'shrub' ? raycast(w.index, p.x, p.y + 0.3, p.z, 0, -1, 0, 5) : null;
      return !hit || Math.abs(hit.t - 0.3) > 0.05;
    });
    expect(off.map(p => `${p.kind} ${(p.y - heightAt(g, p.x, p.z)!).toFixed(2)}`).slice(0, 8)).toEqual([]);
  });
});

// M3-62 (U-031, U-035): foliage. The trees by species, of all sizes; shrubs, hedges, ferns, potted plants; trees
// and vines he can climb. (Rooftop gardens went with U-044: the roofs carry the city's clutter, M3-80.)
describe('foliage (M3-62)', () => {
  const count = (k: string) => w.props.filter(p => p.kind === k).length;
  it('grows camphors, banyans, palms, bamboo and ginkgos, with shrubs, hedges, ferns and potted plants under them', () => {
    for (const [k, n] of [['camphor', 300], ['figtree', 400], ['palm', 150], ['bamboo', 120], ['ginkgo', 250], ['shrub', 200], ['hedge', 150], ['fern', 60], ['potplant', 100]] as const) expect(count(k), k).toBeGreaterThan(n);
  });
  it('lets him climb the big trees up their trunks and the vines on the walls', async () => {
    const trunks = w.climbables.filter(c => c.kind === 'pole' && w.props.some(p => ['camphor', 'figtree', 'ginkgo', 'tree'].includes(p.kind) && Math.hypot(p.x - c.x, p.z - c.z) < 0.6));
    const vines = w.climbables.filter(c => c.kind === 'pipe' && w.props.some(p => p.kind === 'vine' && Math.hypot(p.x - c.x, p.z - c.z) < 0.3));
    expect(trunks.length).toBeGreaterThan(1000);
    expect(vines.length).toBeGreaterThan(300);
    await settle();
    // A bot up two of each, from their feet.
    for (const c of [...trunks.slice(0, 2), ...vines.slice(0, 2)]) {
      const s = createState(1, w);
      s.flags.clear = true;
      teleport(s.player, c.x + c.nx * 0.45, c.y0 - 0.25, c.z + c.nz * 0.45);
      run(s, w, 20);
      expect(climbPole(s, w, c), `${c.kind} at ${c.x.toFixed(0)},${c.z.toFixed(0)}`).toBe(true);
    }
  });
});
