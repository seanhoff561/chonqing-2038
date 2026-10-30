// M3-71 (U-038): tight ways at ground level. Squeezes in the alleys (roofed over, dark, debris both ends but a crawl
// hole), crawl spaces under fallen floors in the ruins, holes broken low into buildings from the alleys, and nooks in
// the walls along the streets to press into out of a patrol's sight. (Whether they play is for the director, U-037.)
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { free } from '../../src/sim/physics';
import { fits } from '../../src/sim/hide';
import { raycast } from '../../src/world/geom';
import { movement as M } from '../../src/data/movement';

const w = getWorld('yuzhong'), of = (k: string) => w.features.filter(f => f.kind === k);
/** Room for him crawling, and not crouched. */
const crawlOnly = (x: number, y: number, z: number) => free(w.index, x, y + 0.03, z, M.height.crawl) && !free(w.index, x, y + 0.03, z, M.height.crouch);

describe('tight ways at ground level (M3-71)', () => {
  it('squeezes through the alleys, crawl spaces in the ruins, holes into buildings, nooks along the streets', () => {
    expect(of('squeeze').length).toBeGreaterThan(100);
    expect(of('crawlspace').length).toBeGreaterThan(20);
    expect(of('burrow').length).toBeGreaterThan(80);
    expect(w.hides.filter(h => h.kind === 'nook').length).toBeGreaterThan(1000);
  });

  it('roofs the squeezes over, and its crawl spaces and holes take him crawling, not crouched', () => {
    const covered = of('squeeze').filter(f => { const h = raycast(w.index, f.x, f.y + 0.8, f.z, 0, 1, 0, 3); return h && h.t < 2.2; });
    expect(covered.length / of('squeeze').length).toBeGreaterThan(0.9);
    const spaces = of('crawlspace').filter(f => crawlOnly(f.x, f.y, f.z));
    expect(spaces.length / of('crawlspace').length).toBeGreaterThan(0.7);
    // A hole in the wall: half way through the wall's thickness.
    const holes = of('burrow').filter(f => crawlOnly(f.x - f.nx! * 0.05, f.y, f.z - f.nz! * 0.05));
    expect(holes.length / of('burrow').length).toBeGreaterThan(0.9);
  });

  it('makes every nook a place he fits, empty, walled in but for its front', () => {
    const nooks = w.hides.map((h, i) => ({ h, i })).filter(q => q.h.kind === 'nook');
    let ok = 0;
    for (const { h, i } of nooks) {
      const b = h.inner, x = (b.x0 + b.x1) / 2, z = (b.z0 + b.z1) / 2;
      if (fits(w, i) && free(w.index, x, b.y0 + 0.05, z, 1.7, 0.3)) ok++;
    }
    expect(ok / nooks.length).toBeGreaterThan(0.95);
  });
});
