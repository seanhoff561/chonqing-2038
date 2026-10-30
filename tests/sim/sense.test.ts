// M3-59 (U-031): props that make sense. Laundry strung between two real walls under both roofs; shop signs in many
// styles and colours, each building its own, only on faces open to a street with nothing in front; the Line 2 train
// sitting on its beam.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { raycast } from '../../src/world/geom';
import { buildLine2 } from '../../src/world/yuzhong/line2';
import { buildGround, streetCells } from '../../src/world/yuzhong/ground';

const w = getWorld('yuzhong'), g = w.ground!;

describe('props that make sense (M3-59)', () => {
  it('strings every laundry line from wall to wall', () => {
    const lines = w.props.filter(p => p.kind === 'laundry' && p.w);
    expect(lines.length).toBeGreaterThan(50);
    // The cord, 2.3 m over the prop's foot along its own x: both ends at a wall.
    const loose = lines.filter(p => {
      const ux = Math.cos(p.yaw), uz = -Math.sin(p.yaw), y = p.y + 2.3, half = p.w! / 2;
      // (A window opening at the cord's height doesn't count against it: the wall round it holds the hook.)
      return [-1, 1].some(s => [0, 0.3, -0.3].every(dy => { const h = raycast(w.index, p.x, y + dy, p.z, ux * s, 0, uz * s, half + 0.4); return !h || h.t < half - 0.6; }));
    });
    expect(loose.length, `${loose.length} of ${lines.length} hang loose`).toBe(0);
  });

  it('gives the shops many sign styles and colours, only where they face a street with nothing in front', () => {
    const signs = w.props.filter(p => p.kind === 'neonblade' && p.text);
    const styles = new Set(signs.map(p => p.text!.split(':')[0])), looks = new Set(signs.map(p => p.text));
    expect(signs.length).toBeGreaterThan(200);
    expect(styles.size).toBeGreaterThanOrEqual(6);
    expect(looks.size).toBeGreaterThanOrEqual(40);
    // No one look on more than a tenth of them.
    const most = Math.max(...[...looks].map(t => signs.filter(p => p.text === t).length));
    expect(most / signs.length).toBeLessThan(0.1);
    const blind = w.props.filter(p => p.kind === 'neonblade' || p.kind === 'ledscreen').filter(p => {
      const dx = Math.sin(p.yaw), dz = Math.cos(p.yaw);
      for (let d = 1.5; d <= 14; d += 1) {
        const x = p.x + dx * d, z = p.z + dz * d;
        if (streetCells[Math.round(z / g.cell) * g.w + Math.round(x / g.cell)]) return !!raycast(w.index, p.x + dx * 1.2, p.y + 0.5, p.z + dz * 1.2, dx, 0, dz, d - 1.2);
      }
      return true;
    });
    expect(blind.length).toBe(0);
  });

  it('sits the Line 2 train on its beam', () => {
    const line = buildLine2(buildGround()), b = line.beams[0], cars = w.props.filter(p => p.kind === 'train');
    expect(cars.length).toBe(2);
    for (const c of cars) {
      // Under each end of the car, the beam's top is where the car's pitch puts it.
      const ux = Math.sin(c.yaw), uz = Math.cos(c.yaw);
      for (const s of [-1, 1]) {
        const x = c.x + ux * s * 7, z = c.z + uz * s * 7, i = b.pts.reduce((m, q, k) => (Math.hypot(q[0] - x, q[1] - z) < Math.hypot(b.pts[m][0] - x, b.pts[m][1] - z) ? k : m), 0);
        const d = Math.hypot(b.pts[i][0] - x, b.pts[i][1] - z);
        expect(d, 'over the beam').toBeLessThan(3.2);
        expect(Math.abs(c.y + Math.tan(c.h ?? 0) * 7 * s - b.top[i]), 'on the beam').toBeLessThan(0.6);
      }
    }
  });
});
