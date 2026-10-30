// M3-77 (U-043): buildings as warrens. Enterable blocks have a band of whole floors built: a corridor, rooms either
// side, windowless rooms behind the facade rooms off the corridor, doors everywhere and many of them locked, cracks to
// squeeze through, thin shafts up through the band and collapsed slabs leaning between floors. (Whether a building's
// ways play well is for the director, U-037.)
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { inside } from '../../src/world/yuzhong/shapes';
import { raycast } from '../../src/world/geom';
import { free } from '../../src/sim/physics';
import { SHAFT } from '../../src/world/city/warren';

const w = getWorld('yuzhong'), near = w.plots.filter(p => !p.far);
const of = (k: string) => w.features.filter(f => f.kind === k);
const rooms = w.features.filter(f => f.kind.startsWith('inside:'));

describe('buildings as warrens (M3-77)', () => {
  it('builds whole floors in most enterable blocks: a corridor and many rooms a floor', () => {
    const blocks = near.map(p => ({ p, rs: rooms.filter(f => inside(p.corners, f.x, f.z)) })).filter(b => b.rs.length);
    const warrens = blocks.filter(b => b.rs.some(f => f.kind === 'inside:corridor'));
    expect(warrens.length / blocks.length).toBeGreaterThan(0.5);
    // Rooms on a corridor's floor.
    const perFloor = warrens.map(b => { const c = b.rs.find(f => f.kind === 'inside:corridor')!; return b.rs.filter(f => Math.abs(f.y - c.y) < 0.5).length; });
    expect(perFloor.reduce((a, b) => a + b, 0) / perFloor.length).toBeGreaterThan(6);
    expect(rooms.length).toBeGreaterThan(15000);
  });
  it('has windowless rooms behind the facade rooms, doors mostly shut or locked, cracks to squeeze through', () => {
    expect(of('backroom').length).toBeGreaterThan(2000);
    const doors = w.inter.filter(i => i.kind === 'door'), lock = (i: (typeof doors)[number]) => (i.data?.lock as string | undefined) ?? 'shut';
    expect(doors.length).toBeGreaterThan(10000);
    expect(doors.filter(i => lock(i) !== 'shut').length / doors.length).toBeGreaterThan(0.4);
    const sq = of('squeeze');
    expect(sq.length).toBeGreaterThan(300);
    // He fits through a crack standing, not a body's width more.
    const fits = sq.filter(f => free(w.index, f.x, f.y + 0.05, f.z, 1.7)).length;
    expect(fits / sq.length).toBeGreaterThan(0.9);
  });
  it("runs thin shafts up through the bands, walls a shaft's width apart, and collapsed slabs between floors", () => {
    const shafts = of('shaft'), heads = of('shafthead');
    expect(shafts.length).toBeGreaterThan(100);
    expect(heads.length).toBe(shafts.length);
    // Open from foot to head, walls either side across its width.
    let ok = 0;
    for (const [i, f] of shafts.entries()) {
      const h = heads[i], mid = f.y + 1.6;
      const clear = !raycast(w.index, f.x, f.y + 0.3, f.z, 0, 1, 0, h.y - f.y + 2);
      // (Across it every way round: a turned block's shaft is square to its own walls, not the world's.)
      const across = Array.from({ length: 16 }, (_, k) => [Math.cos((k * Math.PI) / 16), Math.sin((k * Math.PI) / 16)]).map(([dx, dz]) => { const a = raycast(w.index, f.x, mid, f.z, dx, 0, dz, 2), b = raycast(w.index, f.x, mid, f.z, -dx, 0, -dz, 2); return a && b ? a.t + b.t : Infinity; });
      if (clear && Math.min(...across) < SHAFT + 0.05) ok++;
    }
    expect(ok / shafts.length).toBeGreaterThan(0.9);
    expect(of('chute').length).toBeGreaterThan(100);
  });
});
