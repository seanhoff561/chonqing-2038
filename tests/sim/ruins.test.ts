// M3-56c (U-028, U-030): the rough ground by the buildings holds the fighting's debris: every patch of it over
// 30 m2 has some, the big ones a collapsed building, and the debris has collision (cover, something to climb).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { heightAt, } from '../../src/world/heightfield';
import { overlaps } from '../../src/world/geom';
import { MARK, markAt } from '../../src/world/yuzhong/marks';

const w = getWorld('yuzhong'), mk = w.marks!, g = w.ground!;
const DEBRIS = ['rubblepile', 'slab', 'rebar', 'debris', 'halfwall'];

describe('ruins of the fighting (M3-56c)', () => {
  it('puts debris on every patch of rough ground over 30 m2', () => {
    const has = new Uint8Array(mk.m.length);
    for (const p of w.props) if (DEBRIS.includes(p.kind)) has[Math.floor(p.z / mk.cell) * mk.w + Math.floor(p.x / mk.cell)] = 1;
    const seen = new Uint8Array(mk.m.length);
    let patches = 0, bare = 0;
    for (let k0 = 0; k0 < mk.m.length; k0++) {
      if (mk.m[k0] !== MARK.ruin || seen[k0]) continue;
      const cells = [k0];
      seen[k0] = 1;
      for (let n = 0; n < cells.length; n++) {
        const k = cells[n], i = k % mk.w, j = (k - i) / mk.w;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const q = (j + b) * mk.w + i + a;
          if (i + a >= 0 && i + a < mk.w && j + b >= 0 && j + b < mk.h && mk.m[q] === MARK.ruin && !seen[q]) { seen[q] = 1; cells.push(q); }
        }
      }
      if (cells.length * mk.cell * mk.cell <= 30) continue;
      patches++;
      if (!cells.some(k => has[k])) bare++;
    }
    expect(patches).toBeGreaterThan(300);
    expect(bare).toBe(0);
  });
  it('heaps collapsed buildings on the big patches: broken walls standing, slabs against them', () => {
    const walls = w.props.filter(p => p.kind === 'halfwall' && markAt(mk, p.x, p.z) === MARK.ruin);
    expect(walls.filter(p => (p.h ?? 0) > 2.5).length).toBeGreaterThan(40);
    expect(w.props.filter(p => p.kind === 'slab').length).toBeGreaterThan(200);
  });
  it('gives the debris collision on the ground it lies on', () => {
    const solid = w.props.filter(p => ['rubblepile', 'slab', 'halfwall'].includes(p.kind) && markAt(mk, p.x, p.z) === MARK.ruin).slice(0, 200);
    for (const p of solid) {
      expect(Math.abs(p.y - heightAt(g, p.x, p.z)!)).toBeLessThan(0.05);
      expect(overlaps(w.index, { x0: p.x - 0.1, y0: p.y + 0.2, z0: p.z - 0.1, x1: p.x + 0.1, y1: p.y + 0.3, z1: p.z + 0.1 }), p.kind).toBe(true);
    }
  });
});
