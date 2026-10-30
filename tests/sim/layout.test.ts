// M3-60 (U-031): open ground with structure. Parks, parking lots and plazas laid out on purpose; every lawn edged
// with a kerb; every car in a parking lot parked in a bay; no walkway drawn through a building.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { overlaps } from '../../src/world/geom';
import { heightAt } from '../../src/world/heightfield';
import { COVER } from '../../src/world/yuzhong/layout';
import { ROAD } from '../../src/world/yuzhong/ground';

const w = getWorld('yuzhong'), g = w.ground!, cv = w.cover!;
const of = (k: string) => w.features.filter(f => f.kind === k);

describe('open ground with structure (M3-60)', () => {
  it('lays out parks, parking lots and plazas', () => {
    for (const k of ['park', 'parking', 'plaza']) expect(of(k).length, k).toBeGreaterThanOrEqual(5);
    expect(of('bay').length).toBeGreaterThan(100);
  });

  it('edges every lawn with a kerb where it meets paving or anything else', () => {
    let edges = 0, kerbed = 0;
    const c = (i: number, j: number) => (i < 0 || j < 0 || i >= cv.w || j >= cv.h ? 0 : cv.m[j * cv.w + i]);
    for (let j = 0; j < cv.h; j++) for (let i = 0; i < cv.w; i++) {
      if (c(i, j) !== COVER.lawn) continue;
      for (const [a, b, ex, ez] of [[-1, 0, 0, 0.5], [1, 0, 1, 0.5], [0, -1, 0.5, 0], [0, 1, 0.5, 1]]) {
        if (c(i + a, j + b) === COVER.lawn) continue;
        edges++;
        const x = (i + ex) * cv.cell, z = (j + ez) * cv.cell, y = heightAt(g, x, z) ?? 0;
        if (overlaps(w.index, { x0: x - 0.05, y0: y + 0.02, z0: z - 0.05, x1: x + 0.05, y1: y + 0.1, z1: z + 0.05 })) kerbed++;
      }
    }
    expect(edges).toBeGreaterThan(200);
    expect(kerbed / edges).toBeGreaterThan(0.98);
  });

  it('parks the cars in the parking lots in their bays', () => {
    const bays = of('bay'), inLot = (x: number, z: number) => cv.m[Math.floor(z / cv.cell) * cv.w + Math.floor(x / cv.cell)] === COVER.asphalt;
    const cars = w.props.filter(p => (p.kind === 'car' || p.kind === 'van') && inLot(p.x, p.z));
    expect(cars.length).toBeGreaterThan(40);
    const stray = cars.filter(p => !bays.some(b => Math.hypot(b.x - p.x, b.z - p.z) < 0.35 && Math.abs(Math.sin(Math.atan2(b.nx!, b.nz!) - p.yaw)) < 0.05));
    expect(stray.length, `${stray.length} of ${cars.length} out of a bay`).toBe(0);
  });

  it('draws no walkway through a building', () => {
    const inside = (x: number, z: number) => w.plots.some(p => !p.far && Math.abs(p.corners[0][0] - x) < 80 && Math.abs(p.corners[0][1] - z) < 80 && [1, -1].some(s => p.corners.every((c, i) => { const d = p.corners[(i + 1) % 4]; return s * ((d[0] - c[0]) * (z - c[1]) - (d[1] - c[1]) * (x - c[0])) > 0.3 * Math.hypot(d[0] - c[0], d[1] - c[1]); })));
    let through = 0, n = 0;
    for (const s of w.streets) if (!ROAD.has(s.kind)) for (let k = 0; k + 1 < s.pts.length; k += 3) { n++; if (inside(...s.pts[k])) through++; }
    expect(n).toBeGreaterThan(1000);
    expect(through).toBe(0);
  });
});
