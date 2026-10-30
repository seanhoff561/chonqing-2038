// M3-37 (U-014, U-021, U-023, U-037, U-038): the route network. Main routes off the streets between the districts'
// centres, branches to the shelters, crossings laid where the roofs didn't join; the way marked; machines' beats
// laid against it, one street patrol and one drone corridor over the start hideout's grate by night; caches only a
// grappling hook reaches. (Whether the routes play is for the director, U-037: these check what's there.)
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { heightAt } from '../../src/world/heightfield';
import { inside, minRect, corners, obbOverlap } from '../../src/world/yuzhong/shapes';
import { ENVELOPE as E } from '../../src/data/envelope';
import { GEO } from '../../src/world/geo';

const w = getWorld('yuzhong'), near = w.plots.filter(p => !p.far);
const at = (h: number, [a, b]: [number, number]) => (a <= b ? h >= a && h < b : h >= a || h < b);

describe('the route network (M3-37)', () => {
  it('runs main routes off the streets between the districts, branches to the shelters', () => {
    const main = w.routes.filter(r => r.kind === 'main'), branch = w.routes.filter(r => r.kind === 'branch');
    expect(main.length).toBeGreaterThanOrEqual(3);
    expect(branch.length).toBeGreaterThanOrEqual(10);
    const ways = new Set(w.routes.flatMap(r => r.ways));
    for (const k of ['jump', 'cord', 'crossCord']) expect(ways.has(k), k).toBe(true);
    // Never along a street: every point well over the ground under it.
    let low = 0, pts = 0;
    for (const r of w.routes) for (const p of r.pts) { pts++; if (p.y - (heightAt(w.ground!, p.x, p.z) ?? 0) < 3) low++; }
    expect(low / pts).toBeLessThan(0.01);
    // The main routes start or end by the districts' centres.
    const L = GEO.landmarks, ends = main.flatMap(r => [r.pts[0], r.pts[r.pts.length - 1]]);
    const touched = ['jiefangbei', 'shibati', 'chaotianmen', 'hongyadong'].filter(k => ends.some(p => Math.hypot(p.x - L[k].x, p.z - L[k].z) < 200));
    expect(touched.length).toBeGreaterThanOrEqual(3);
    // Crossings laid where the roofs didn't join, and the way marked with rags.
    expect(w.features.filter(f => f.kind === 'routeLink').length).toBeGreaterThan(10);
    expect(w.decor.filter(s => s.tint === 0xb02a1e).length).toBeGreaterThan(20);
  });

  it("lays the machines' beats against it: street patrols, drone corridors by night, both over the hideout grate", () => {
    const streets = w.patrols.filter(p => p.kind === 'street'), drones = w.patrols.filter(p => p.kind === 'drone');
    expect(streets.length).toBeGreaterThanOrEqual(10);
    expect(drones.length).toBeGreaterThanOrEqual(3);
    const grate = w.teleports.find(t => /vent grate/.test(t.name))!;
    const over = (kind: string) => w.patrols.some(p => p.kind === kind && at(23, p.hours) && p.pts.some((q, i) => i > 0 && segDist(grate.x, grate.z, p.pts[i - 1].x, p.pts[i - 1].z, q.x, q.z) < 30));
    expect(over('street')).toBe(true);
    expect(over('drone')).toBe(true);
  });

  it('keeps a few caches only a grappling hook reaches: no holds on their walls, nothing joining them, no roof in reach', () => {
    expect(w.gates.length).toBeGreaterThanOrEqual(3);
    for (const g of w.gates) {
      expect(g.tool).toBe('grapple');
      const p = near.find(q => inside(corners({ ...minRect(q.corners), hw: minRect(q.corners).hw + 0.5, hd: minRect(q.corners).hd + 0.5 }), g.x, g.z))!;
      expect(p, 'its building').toBeTruthy();
      const o = minRect(p.corners);
      expect(p.own!.climbables[1] - p.own!.climbables[0], 'its climbables').toBe(0);
      expect(w.features.filter(f => ['sill', 'ac', 'pipe', 'ladder', 'beamEnd', 'balcony', 'sign', 'cord', 'gapBar', 'walkway', 'crossPlank', 'crossBeam', 'crossCord', 'routeLink', 'winPlank'].includes(f.kind) && inside(corners({ ...o, hw: o.hw + 1.5, hd: o.hd + 1.5 }), f.x, f.z)).length, 'holds or joins on it').toBe(0);
      expect(near.filter(q => q !== p && obbOverlap(o, minRect(q.corners), E.runningJump.max / 2) && q.wall > p.wall - 4).length, 'roofs in reach').toBe(0);
      expect(Math.hypot(g.from.x - g.x, g.from.z - g.z)).toBeGreaterThan(E.runningJump.max);
      expect(w.inter.some(i => /cache\d+$/.test(i.id) && Math.hypot(i.x - o.cx, i.z - o.cz) < 3)).toBe(true);
    }
  });
});

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2));
  return Math.hypot(px - ax - vx * t, pz - az - vz * t);
}
