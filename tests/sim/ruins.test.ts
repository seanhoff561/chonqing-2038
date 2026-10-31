// M3-56c (U-028, U-030): the rough ground by the buildings holds the fighting's debris: every patch of it over
// 30 m2 has some, the big ones a collapsed building, and the debris has collision (cover, something to climb).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { heightAt, } from '../../src/world/heightfield';
import { overlaps, raycast, query } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';
import { MARK, markAt } from '../../src/world/yuzhong/marks';

const w = getWorld('yuzhong'), mk = w.marks!, g = w.ground!;
const DEBRIS = ['rubblepile', 'slab', 'rebar', 'debris', 'halfwall'];
/** What a building's walls are made of. */
const WALLS = new Set<number>([MAT.facade, MAT.facadeTile, MAT.facadeBrick, MAT.facadeOpen, MAT.facadeBand, MAT.glass, MAT.plaster, MAT.brick, MAT.block, MAT.tile]);

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
    // (U-037's fillers build on some open ground, so fewer slabs than the 200 and more there were.)
    expect(w.props.filter(p => p.kind === 'slab').length).toBeGreaterThan(150);
  });
  it('gives the debris collision on the ground it lies on', () => {
    const solid = w.props.filter(p => ['rubblepile', 'slab', 'halfwall'].includes(p.kind) && markAt(mk, p.x, p.z) === MARK.ruin).slice(0, 200);
    for (const p of solid) {
      expect(Math.abs(p.y - heightAt(g, p.x, p.z)!)).toBeLessThan(0.05);
      expect(overlaps(w.index, { x0: p.x - 0.1, y0: p.y + 0.2, z0: p.z - 0.1, x1: p.x + 0.1, y1: p.y + 0.3, z1: p.z + 0.1 }), p.kind).toBe(true);
    }
  });
});

// M3-61 (U-031): ruins that look fallen. Sections of the facade of the building beside a patch lie on it in that
// building's material and colour; columns, beams and boulders; rubble settled in the hollows.
describe('ruins that look fallen (M3-61)', () => {
  /** Inside a turned piece's own footprint. */
  const within = (q: (typeof w.solids)[number], x: number, z: number) => { const R = q.rot!, dx = x - R.px, dz = z - R.pz, lx = R.px + R.c * dx + R.s * dz, lz = R.pz - R.s * dx + R.c * dz; return lx >= R.x0 && lx <= R.x1 && lz >= R.z0 && lz <= R.z1; };
  const fallen = w.features.filter(f => f.kind === 'fallen'), from = new Map(w.features.filter(f => f.kind === 'fallenFrom').map(f => [f.group, f]));
  it("lays sections of the building beside each patch where they fell, in that building's material and colour", () => {
    expect(fallen.length).toBeGreaterThan(80);
    for (const f of fallen) {
      // The section: what's under its middle from above. The building: the wall it came off, from just outside.
      // The section: a piece in a building's material lying or standing at that spot, short of a building's height.
      const piece = query(w.index, f.x - 0.05, f.z - 0.05, f.x + 0.05, f.z + 0.05).map(k => w.index.solids[k])
        .find(q => WALLS.has(q.mat) && q.rot && q.y1 - q.y0 < 6 && q.y0 < f.y + 1 && q.y1 > f.y - 0.5 && within(q, f.x, f.z));
      const b = from.get(f.group)!, at = raycast(w.index, b.x + b.nx! * 0.5, b.y, b.z + b.nz! * 0.5, -b.nx!, 0, -b.nz!, 1);
      expect(piece && at, `${f.x.toFixed(0)},${f.z.toFixed(0)}`).toBeTruthy();
      const wall = w.index.solids[at!.id];
      expect(wall.y1 - wall.y0).toBeGreaterThanOrEqual(5);
      expect([piece!.mat, piece!.tint], `${f.x.toFixed(0)},${f.z.toFixed(0)}`).toEqual([wall.mat, wall.tint]);
      // Between the wall and the patch, near it.
      expect(Math.hypot(f.x - b.x, f.z - b.z)).toBeLessThan(10);
    }
  });
  it('drops columns and beams on all but the small patches, boulders on all of them', () => {
    const onRuin = (s: { x0: number; z0: number; x1: number; z1: number }) => markAt(mk, (s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2) === MARK.ruin;
    // (Turned pieces on the ruins by their own length and breadth.)
    const pieces = w.solids.filter(s => s.rot && onRuin(s)).map(s => ({ s, long: Math.max(s.rot!.x1 - s.rot!.x0, s.rot!.z1 - s.rot!.z0), short: Math.min(s.rot!.x1 - s.rot!.x0, s.rot!.z1 - s.rot!.z0) }));
    expect(pieces.filter(p => p.s.mat === MAT.concrete && p.long > 3.5 && p.short < 0.7).length, 'columns').toBeGreaterThan(20);
    expect(pieces.filter(p => p.s.mat === MAT.metal && p.s.ramp && p.long > 4.5).length, 'beams').toBeGreaterThan(20);
    expect(pieces.filter(p => (p.s.mat === MAT.concrete || p.s.mat === MAT.stone) && p.long < 2 && p.s.y1 - p.s.y0 < 1.6).length, 'boulders').toBeGreaterThan(300);
  });
});
