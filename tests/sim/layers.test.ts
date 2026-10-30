// M3-66 (U-032, U-033, U-034): the layered city. Buildings in every height band from low fillers to towers, the
// rows' buildings about twice as tall as before, none far over the buildings round it, and the layers between
// them: vertical alleys, bridges across the gaps, beams sticking out, scaffolding hung on the fronts,
// megastructures low over roofs of near one height on thick columns.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { raycast, query } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';
import { minRect, obbOverlap } from '../../src/world/yuzhong/shapes';
import { MEGA_DROP, COLUMN } from '../../src/world/yuzhong/vertical';

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

  it('varies the heights beside the tall ones (U-034, U-037): many in between, some still low', () => {
    const ps = w.plots.filter(p => !p.far), os = ps.map(p => minRect(p.corners)), cells = new Map<number, number[]>(), key = (x: number, z: number) => Math.floor(x / 64) * 65536 + Math.floor(z / 64);
    os.forEach((o, i) => { const k = key(o.cx, o.cz), a = cells.get(k); if (a) a.push(i); else cells.set(k, [i]); });
    let n = 0, mid = 0, low = 0;
    ps.forEach((p, i) => {
      if (p.kind === 'tower') return;
      const o = os[i], h = p.wall - p.base;
      let tall = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of cells.get(key(o.cx + a * 64, o.cz + b * 64)) ?? []) if (j !== i && obbOverlap(o, os[j], 12)) tall = Math.max(tall, ps[j].wall - ps[j].base);
      // Beside one over 30 m and taller than it; against that one's height (of 60 m at most: a tower stands over).
      if (tall < 30 || tall <= h) return;
      n++;
      const f = h / Math.min(tall, 60);
      if (f >= 0.55 && f <= 0.85) mid++;
      if (f < 0.4) low++;
    });
    const stat = `${n} beside tall ones: ${mid} at 55-85%, ${low} under 40%`;
    expect(n, stat).toBeGreaterThan(1500);
    expect(mid / n, stat).toBeGreaterThan(0.25);
    expect(low / n, stat).toBeGreaterThan(0.1);
  });

  it('sets megastructures low over roofs of near one height, on thick columns (U-034)', () => {
    const megas = of('mega');
    expect(megas.length).toBeGreaterThanOrEqual(5);
    let columns = 0;
    for (const f of megas) for (const i of query(w.index, f.x - 50, f.z - 50, f.x + 50, f.z + 50)) {
      const s = w.index.solids[i];
      if (s.mat !== MAT.concrete || Math.abs(s.y1 - f.y) > 0.01 || s.x1 - s.x0 > 3 || s.z1 - s.z0 > 3 || s.y1 - s.y0 < 1) continue;
      columns++;
      expect(s.y1 - s.y0).toBeLessThanOrEqual(0.6 + 4.2 + MEGA_DROP + 0.01);
      expect(Math.min(s.x1 - s.x0, s.z1 - s.z0)).toBeGreaterThanOrEqual(COLUMN - 0.01);
    }
    expect(columns).toBeGreaterThan(megas.length * 4);
  });
});
