// M3-41c: Li Wei's construction site on the real 日月光中心四期 plot: dug out to one level behind shoring and
// hoarding with a gate; up the half-built tower's stair core to its top slab; up the crane's ladder to its cab.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { heightAt } from '../../src/world/heightfield';
import { buildGround } from '../../src/world/yuzhong/ground';
import { buildSite } from '../../src/world/yuzhong/site';
import { inside } from '../../src/world/yuzhong/shapes';
import { run, settle } from './helpers';

const w = getWorld('yuzhong'), site = buildSite(buildGround())!;

describe('the construction site (M3-41c)', () => {
  it('is dug out to one level inside the real plot, with a crane and a half-built tower', () => {
    const [cx, cz] = [site.poly.reduce((a, p) => a + p[0], 0) / site.poly.length, site.poly.reduce((a, p) => a + p[1], 0) / site.poly.length];
    let n = 0;
    for (let x = cx - 60; x < cx + 60; x += 4) for (let z = cz - 40; z < cz + 40; z += 4) {
      if (!inside(site.poly, x, z) || !inside(site.poly, x + 2.5, z) || !inside(site.poly, x - 2.5, z) || !inside(site.poly, x, z + 2.5) || !inside(site.poly, x, z - 2.5)) continue;
      expect(heightAt(w.ground!, x, z)).toBeCloseTo(site.base, 1);
      n++;
    }
    expect(n).toBeGreaterThan(50);
    expect(site.crane.top - site.base).toBeGreaterThan(70);
    expect(site.frame.top - site.base).toBeCloseTo(14 * 3.6, 1);
  });
  it('climbs the stair core from the ground to the top slab', async () => {
    await settle();
    const s = createState(1, w), r = site.route;
    teleport(s.player, r[0].x, r[0].y + 0.05, r[0].z);
    run(s, w, 20);
    let k = 1;
    for (let t = 0; t < 60 * 240 && k < r.length; t++) {
      const p = s.player.pos;
      if (Math.hypot(r[k].x - p.x, r[k].z - p.z) < 0.35) { k++; continue; }
      run(s, w, 1, { my: 1, yaw: Math.atan2(-(r[k].x - p.x), -(r[k].z - p.z)) });
    }
    expect(k).toBe(r.length);
    expect(s.player.pos.y).toBeCloseTo(site.frame.top, 0);
  });
  it('has ladders up the tower and the crane mast', () => {
    const ladders = w.climbables.filter(c => c.kind === 'ladder' && Math.hypot(c.x - site.frame.x, c.z - site.frame.z) < 60);
    expect(ladders.some(c => c.y1 > site.crane.top)).toBe(true);
    expect(ladders.some(c => Math.abs(c.y1 - site.frame.top) < 0.1)).toBe(true);
  });
});
