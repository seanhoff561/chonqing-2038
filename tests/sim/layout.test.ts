// M3-60 (U-031, U-033): green only in the few real parks, laid inside their real outlines, edged all round with a
// kerb and crossed by paths from side to side; the open ground among the buildings filled with more buildings; paths
// from the doors set back from the streets to them; no walkway drawn through a building.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { overlaps } from '../../src/world/geom';
import { heightAt } from '../../src/world/heightfield';
import { ROAD, streetCells } from '../../src/world/yuzhong/ground';
import { MARK } from '../../src/world/yuzhong/marks';

const w = getWorld('yuzhong'), g = w.ground!;

describe('the parks and the open ground (M3-60)', () => {
  it('lays out the few real parks inside their outlines, a kerb all round', () => {
    const lawns = w.lawns!;
    expect(lawns.length).toBeGreaterThanOrEqual(3);
    expect(lawns.length).toBeLessThanOrEqual(40);
    let edges = 0, kerbed = 0;
    for (const p of lawns) for (let i = 0; i < p.length; i++) {
      const [ax, az] = p[i], [bx, bz] = p[(i + 1) % p.length], len = Math.hypot(bx - ax, bz - az);
      for (let t = 0.5; t < len - 0.5; t += 2) {
        const x = ax + ((bx - ax) * t) / len, z = az + ((bz - az) * t) / len, y = heightAt(g, x, z) ?? 0;
        // (Where a street crosses the edge it runs on through, no kerb across it.)
        if (streetCells[Math.round(z / g.cell) * g.w + Math.round(x / g.cell)]) continue;
        edges++;
        if (overlaps(w.index, { x0: x - 0.05, y0: y + 0.02, z0: z - 0.05, x1: x + 0.05, y1: y + 0.1, z1: z + 0.05 })) kerbed++;
      }
    }
    expect(kerbed / edges).toBeGreaterThan(0.97);
    expect(w.features.filter(f => f.kind === 'park').length).toBe(lawns.length);
  });

  it('fills the open ground among the buildings with buildings', () => {
    // What's left open (flat, by the buildings, not a park; mostly strips along the streets): under an eighth of what
    // the buildings stand on.
    const mk = w.marks!, open = mk.m.filter(c => c === MARK.open).length * mk.cell * mk.cell;
    const built = w.plots.filter(p => !p.far).reduce((a, p) => { const [c0, c1, c2] = p.corners; return a + Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) * Math.hypot(c2[0] - c1[0], c2[1] - c1[1]); }, 0);
    expect(open / built).toBeLessThan(0.125);
  });

  it('runs a path from the door of every enterable building set back from the streets to one (U-033)', () => {
    const paths = w.streets.filter(s => s.kind === 'footway' && s.w === 1.8), doors = w.plots.filter(p => p.route).map(p => p.route![0]);
    expect(paths.length).toBeGreaterThan(30);
    for (const s of paths) {
      const [[ax, az], [bx, bz]] = s.pts;
      // From a door, to a street's edge.
      expect(doors.some(d => Math.hypot(d.x - ax, d.z - az) < 0.01)).toBe(true);
      expect(streetCells[Math.round(bz / g.cell) * g.w + Math.round(bx / g.cell)]).not.toBe(0);
      const l = Math.hypot(bx - ax, bz - az);
      expect(l).toBeLessThan(26);
      // Walkable: no bank between.
      for (let t = 1; t < l; t += 1) expect(Math.abs((heightAt(g, ax + ((bx - ax) * t) / l, az + ((bz - az) * t) / l) ?? 0) - (heightAt(g, ax + ((bx - ax) * (t - 1)) / l, az + ((bz - az) * (t - 1)) / l) ?? 0))).toBeLessThan(0.45);
    }
  });

  it('draws no walkway through a building', () => {
    const inside = (x: number, z: number) => w.plots.some(p => !p.far && Math.abs(p.corners[0][0] - x) < 80 && Math.abs(p.corners[0][1] - z) < 80 && [1, -1].some(s => p.corners.every((c, i) => { const d = p.corners[(i + 1) % 4]; return s * ((d[0] - c[0]) * (z - c[1]) - (d[1] - c[1]) * (x - c[0])) > 0.3 * Math.hypot(d[0] - c[0], d[1] - c[1]); })));
    let through = 0, n = 0;
    for (const s of w.streets) if (!ROAD.has(s.kind)) for (let k = 0; k + 1 < s.pts.length; k++) { n++; if (inside(...s.pts[k])) through++; }
    expect(n).toBeGreaterThan(1000);
    expect(through).toBe(0);
  });
});
