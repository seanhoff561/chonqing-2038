// M3-66 (U-032, U-033): the layered city. Buildings in every height band from low fillers to towers, the rows'
// buildings about twice as tall as before, and the layers between them: vertical alleys, bridges across the gaps,
// beams sticking out, scaffolding hung on the fronts.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { raycast } from '../../src/world/geom';

const w = getWorld('yuzhong'), of = (k: string) => w.features.filter(f => f.kind === k);

describe('the layered city (M3-66)', () => {
  it('stands in layers: low fillers, mid-height blocks, tall ones and towers, each a good share', () => {
    const h = w.plots.filter(p => !p.far).map(p => p.wall - p.base), share = (a: number, b: number) => h.filter(x => x >= a && x < b).length / h.length;
    for (const [a, b] of [[0, 10], [10, 25], [25, 50], [50, 1e9]]) expect(share(a, b), `${a}-${b} m`).toBeGreaterThan(0.1);
  });

  it('builds the rows about twice as tall as before (U-032): their middle buildings 30 m and more', () => {
    const rows = w.plots.filter(p => !p.far && p.row && /^\d+:/.test(p.row) && p.wall - p.base > 10 && p.wall - p.base < 60).map(p => p.wall - p.base).sort((a, b) => a - b);
    expect(rows[rows.length >> 1]).toBeGreaterThanOrEqual(30);
  });

  it('puts the layers between them: vertical alleys, bridges, beams and scaffolding', () => {
    expect(of('vAlley').length).toBeGreaterThan(100);
    expect(of('bridge').length).toBeGreaterThan(50);
    expect(of('beam').length).toBeGreaterThan(100);
    expect(of('scaffold').length).toBeGreaterThan(50);
    // Each bridge and beam is there to stand on: a solid top under where it's marked (all but the odd one with
    // something built over it).
    const all = of('bridge').concat(of('beam')), bad = all.filter(f => { const h = raycast(w.index, f.x, f.y + 0.5, f.z, 0, -1, 0, 1); return !h || Math.abs(f.y + 0.5 - h.t - f.y) > 0.05; });
    expect(bad.length / all.length).toBeLessThan(0.02);
  });
});
