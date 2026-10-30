// M3-73a (U-038): basements and the sewer maze. Basements under blocks with a stairwell, a hatch and a ladder down
// from the lobby, a manhole in the floor; shafts from the manholes down to level runs joining them, sewers, crawlways
// and flooded sumps, deep under the ground's shell; now and then a grate into the underground city. (Data checks:
// whether the maze plays well is for the director, U-037.)
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { raycast } from '../../src/world/geom';
import { heightAt } from '../../src/world/heightfield';
import { free } from '../../src/sim/physics';

const w = getWorld('yuzhong'), of = (k: string) => w.features.filter(f => f.kind === k);

describe('basements and the sewer maze (M3-73a)', () => {
  it('digs basements under blocks with a stairwell, each with a manhole down its shaft to the runs', () => {
    const holes = of('sewer');
    expect(holes.length).toBeGreaterThan(100);
    // A grate over the manhole; under it nothing in the way down to the shaft's foot; a ladder up it.
    let open = 0, laddered = 0, grated = 0;
    for (const f of holes) {
      const h = raycast(w.index, f.x, f.y - 0.2, f.z, 0, -1, 0, 200);
      if (!h || h.t > 3) open++;
      if (w.inter.some(i => i.kind === 'grate' && i.data?.manhole && Math.hypot(i.x - f.x, i.z - f.z) < 0.5)) grated++;
      if (w.climbables.some(c => c.kind === 'ladder' && Math.hypot(c.x - f.x, c.z - f.z) < 1 && c.y1 > f.y + 0.5 && c.y0 < f.y - 3)) laddered++;
    }
    expect(open / holes.length).toBeGreaterThan(0.8);
    expect(laddered / holes.length).toBeGreaterThan(0.8);
    expect(grated).toBe(holes.length);
  });
  it('joins them with level runs under the ground: sewers, crawlways, flooded sumps, and grates into the underground city', () => {
    const drains = of('drain');
    expect(drains.length / 2).toBeGreaterThan(150);
    expect(of('crawlway').length).toBeGreaterThan(20);
    const sumps = of('sump');
    expect(sumps.length).toBeGreaterThan(4);
    for (const s of sumps) expect(w.water.some(b => s.x > b.x0 && s.x < b.x1 && s.z > b.z0 - 0.1 && s.z < b.z1 + 0.1 && b.y0 <= s.y + 0.01), 'its water').toBe(true);
    expect(of('grate').length).toBeGreaterThan(2);
    // Every run's ends stand in open space under the ground's shell.
    let ok = 0;
    for (const d of drains) {
      const g = heightAt(w.ground!, d.x, d.z);
      if ((g === null || d.y + 2 < g - w.ground!.thick) && free(w.index, d.x, d.y + 0.05, d.z, 0.8)) ok++;
    }
    expect(ok / drains.length).toBeGreaterThan(0.9);
  });
});
