import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { districtAt } from '../../src/world/yuzhong/lots';
import { createState } from '../../src/sim/sim';
import { run, settle } from './helpers';
import { teleport } from '../../src/sim/player';
import type { SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';

const w = getWorld('yuzhong'), near = w.plots.filter(p => !p.far), open = near.filter(l => l.route);

/** Walk a list of points at a jog, steering at each; false if he gets stuck. */
function follow(s: SimState, w: World, pts: { x: number; z: number }[]): boolean {
  for (const pt of pts) {
    let ok = false;
    for (let i = 0; i < 60 * 40 && !ok; i++) {
      const p = s.player, dx = pt.x - p.pos.x, dz = pt.z - p.pos.z;
      if (Math.hypot(dx, dz) < 0.3) { ok = true; break; }
      run(s, w, 1, { my: 1, yaw: Math.atan2(-dx, -dz) });
    }
    if (!ok) return false;
  }
  return true;
}

describe('enterable buildings (M3-04)', () => {
  it('a share of blocks get a stair core and rooms with containers', () => {
    const res = near.filter(l => l.kind === 'res');
    expect(open.length).toBeGreaterThan(150);
    expect(open.length / res.length).toBeGreaterThan(0.1);
    const containers = w.inter.filter(i => i.kind === 'container');
    expect(containers.length).toBeGreaterThan(open.length * 2);
    expect(new Set(containers.map(c => c.id)).size).toBe(containers.length);
  });
  it('walks in from the street and climbs the stairwell to the roof', async () => {
    await settle();
    const lot = open.find(l => (l.wall - l.base) / 3 >= 4)!;
    const s = createState(1, w);
    const route = lot.route!;
    teleport(s.player, route[0].x, route[0].y + 0.05, route[0].z);
    run(s, w, 20);
    const reached = follow(s, w, route.slice(1));
    expect(reached).toBe(true);
    expect(s.player.pos.y).toBeCloseTo(lot.wall, 1);
    expect(s.dead).toBeFalsy();
  });
  it("walks in off the Eighteen Stairs into Shibati's apartment blocks (M3-55; U-034 rebuilt its shop houses)", { timeout: 60000 }, () => {
    const blocks = open.filter(l => { const [x, z] = l.corners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4], [0, 0]); return districtAt(x, z).district === 'shibati'; });
    expect(blocks.length).toBeGreaterThan(3);
    for (const lot of blocks.slice(0, 2)) {
      const s = createState(1, w), route = lot.route!;
      teleport(s.player, route[0].x, route[0].y + 0.05, route[0].z);
      run(s, w, 20);
      // In at the door and over to the foot of the stairs.
      expect(follow(s, w, route.slice(1, 3)), `block at ${route[0].x.toFixed(0)},${route[0].z.toFixed(0)}`).toBe(true);
      expect(Math.abs(s.player.pos.y - lot.base)).toBeLessThan(0.3);
    }
  });
});
