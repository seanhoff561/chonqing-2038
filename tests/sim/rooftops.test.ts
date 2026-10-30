// M3-80 (U-044): urban rooftops. No roof gardens (no moss, shrubs or trees up there); roofs cluttered with tanks,
// drums, condensers, sheds, crates and heaters instead, enterable blocks' roofs too; now and then a place to hide.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { inside } from '../../src/world/yuzhong/shapes';
import { MAT } from '../../src/world/mats';

const w = getWorld('yuzhong'), near = w.plots.filter(p => !p.far);
const cells = new Map<number, typeof near>(), key = (x: number, z: number) => Math.floor(x / 32) * 100003 + Math.floor(z / 32);
for (const p of near) { const xs = p.corners.map(c => c[0]), zs = p.corners.map(c => c[1]); for (let x = Math.min(...xs); x <= Math.max(...xs) + 32; x += 32) for (let z = Math.min(...zs); z <= Math.max(...zs) + 32; z += 32) { const k = key(x, z); (cells.get(k) ?? cells.set(k, []).get(k)!).push(p); } }
/** The plot whose roof a point stands on (not under it: a top floor's ceiling). */
const roofOf = (x: number, y: number, z: number) => (cells.get(key(x, z)) ?? []).find(p => y > p.wall - 0.05 && y < p.wall + 0.3 && inside(p.corners, x, z));

describe('urban rooftops (M3-80)', () => {
  it('has no moss, shrubs or trees on the roofs', () => {
    const green = w.decor.filter(s => (s.mat === MAT.moss || s.mat === MAT.leaves || s.mat === MAT.blossom) && roofOf((s.x0 + s.x1) / 2, s.y0, (s.z0 + s.z1) / 2));
    expect(green.length).toBe(0);
  });
  it('clutters the roofs, enterable ones too, and hides a place to hide on some', () => {
    const roofs = near.filter(p => p.kind === 'res');
    const cluttered = new Set(w.solids.filter(s => s.mat === MAT.metal || s.mat === MAT.wood || s.mat === MAT.hidden).map(s => roofOf((s.x0 + s.x1) / 2, s.y0, (s.z0 + s.z1) / 2)).filter(Boolean));
    expect(cluttered.size / roofs.length).toBeGreaterThan(0.5);
    expect(roofs.filter(p => p.route && cluttered.has(p)).length).toBeGreaterThan(100);
    const hides = w.hides.filter(h => (cells.get(key((h.inner.x0 + h.inner.x1) / 2, (h.inner.z0 + h.inner.z1) / 2)) ?? []).some(p => h.inner.y0 > p.wall - 0.1 && h.inner.y0 < p.wall + 1 && inside(p.corners, (h.inner.x0 + h.inner.x1) / 2, (h.inner.z0 + h.inner.z1) / 2)));
    expect(hides.length).toBeGreaterThan(300);
  });
});
