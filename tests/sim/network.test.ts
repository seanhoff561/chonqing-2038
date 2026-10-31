// M3-37, M3-76 (U-014, U-021, U-023, U-037, U-038, U-043): the route network. Main routes between the districts'
// centres, branches to the shelters and the caches, mostly through buildings and underground, every leg within his
// reach; nothing marking the way; machines' beats laid against it, one street patrol and one drone corridor over the
// start hideout's grate by night; caches only a grappling hook reaches. (Whether the routes play is for the director,
// U-037: these check what's there.)
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { inside, minRect, corners, obbOverlap } from '../../src/world/yuzhong/shapes';
import { ENVELOPE as E } from '../../src/data/envelope';
import { GEO } from '../../src/world/geo';
import { REACH } from '../../src/data/reach';

const w = getWorld('yuzhong'), near = w.plots.filter(p => !p.far);
const at = (h: number, [a, b]: [number, number]) => (a <= b ? h >= a && h < b : h >= a || h < b);

describe('the route network (M3-37, M3-76)', () => {
  it('runs main routes between the districts and branches to the shelters and caches, mostly through buildings', () => {
    const main = w.routes.filter(r => r.kind === 'main'), branch = w.routes.filter(r => r.kind === 'branch');
    expect(main.length).toBeGreaterThanOrEqual(3);
    expect(branch.length).toBeGreaterThanOrEqual(10);
    const ways = new Set(w.routes.flatMap(r => r.ways));
    for (const k of ['jump', 'drop']) expect(ways.has(k), k).toBe(true);
    // Out of windows now and then: across to the next one, onto a roof, along a plank laid out of one (M3-81).
    expect(w.routes.flatMap(r => r.ways).filter(k => k === 'window' || k === 'winPlank').length, 'out of windows').toBeGreaterThanOrEqual(3);
    // The main routes start or end by the districts' centres.
    const L = GEO.landmarks, ends = main.flatMap(r => [r.pts[0], r.pts[r.pts.length - 1]]);
    const touched = ['jiefangbei', 'shibati', 'chaotianmen', 'hongyadong'].filter(k => ends.some(p => Math.hypot(p.x - L[k].x, p.z - L[k].z) < 200));
    expect(touched.length).toBeGreaterThanOrEqual(3);
    // Where each stretch is: most of the way inside buildings or underground, little over roofs or open ground (U-043).
    const len = (r: (typeof w.routes)[number], ...on: string[]) => r.pts.slice(1).reduce((a, q, k) => a + (on.includes(r.on[k]) ? Math.hypot(q.x - r.pts[k].x, q.z - r.pts[k].z) : 0), 0);
    const all = w.routes.reduce((a, r) => a + len(r, 'inside', 'under', 'roof', 'ground', 'gap'), 0);
    expect(w.routes.reduce((a, r) => a + len(r, 'inside', 'under'), 0) / all).toBeGreaterThan(0.6);
    expect(w.routes.reduce((a, r) => a + len(r, 'roof'), 0) / all).toBeLessThan(0.2);
    expect(w.routes.reduce((a, r) => a + len(r, 'ground'), 0) / all).toBeLessThan(0.1);
    // Nothing marks the way: no worn paths or rags on the roofs.
    expect(w.decor.filter(s => s.tint === 0xb02a1e).length).toBe(0);
  });

  it('keeps every leg within what he can do, unaided or with the tool it takes (data/reach.ts)', () => {
    let legs = 0;
    for (const r of w.routes) r.ways.forEach((k, i) => {
      // A way's stretch: from where it leaves one node to where it reaches the next (after the start, two points a way).
      const a = r.pts[1 + 2 * i], b = r.pts[2 + 2 * i], across = Math.hypot(b.x - a.x, b.z - a.z), dy = b.y - a.y;
      legs++;
      const R = REACH, ok = k === 'jump' ? across <= R.jump.across + 0.6 && Math.abs(dy) <= R.jump.rise + 0.05
        : k === 'window' ? across <= Math.max(R.window.across, R.drop.across) + 0.1 && Math.abs(dy) <= Math.max(R.window.rise, R.jump.rise) + 0.05
          : k === 'drop' ? -dy <= R.drop.down + 0.05 && dy <= 0.05
            : k === 'climb' ? dy <= R.climb.up + 0.05
            : k === 'pipe' ? w.climbables.some(c => c.kind === 'pipe' && Math.hypot(c.x - a.x, c.z - a.z) < 1.5 && c.y0 <= a.y + 0.5 && c.y1 >= b.y - 0.5)
              : k === 'grapple' ? dy <= R.grapple.rise && across <= R.grapple.across + 2
                : k === 'line' ? across <= R.line.across
                  : ['crossPlank', 'crossBeam', 'gapBar', 'walkway', 'skybridge', 'winPlank'].includes(k) ? across <= R.span.across
                    : ['stairs', 'burrow', 'door', 'way', 'tunnel', 'street', 'breach', 'sewer', 'manhole'].includes(k);
      expect(ok, `${r.id} leg ${i} ${k}: ${across.toFixed(1)} across, ${dy.toFixed(1)} up`).toBe(true);
    });
    expect(legs).toBeGreaterThan(100);
    expect(w.routes.some(r => r.ways.includes('grapple'))).toBe(true);
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
