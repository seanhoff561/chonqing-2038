// M4-02: the machines' nav graph and pathing. Built from the streets, the stairs and the walks under the ground,
// with levels; A* between any two places it reaches; each kind of unit on the stretches it can take.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { navPath, nearestNav } from '../../src/sim/nav';
import { NAV } from '../../src/world/world';
import { heightAt } from '../../src/world/heightfield';
import { walksOf } from '../../src/world/yuzhong/nav';

const w = getWorld('yuzhong'), nav = w.nav!, T = (n: string) => w.teleports.find(t => t.name === n)!;
const foot = (n: string) => ({ x: T(n).x, y: T(n).y - 1.5, z: T(n).z });

describe('the nav graph and pathing (M4-02)', () => {
  it('covers the streets, the stairs and the walks under the ground, on their levels', () => {
    const kinds = new Set(nav.adj.flatMap(a => a.map(e => e[2])));
    for (const k of [NAV.street, NAV.stairs, NAV.tunnel]) expect(kinds.has(k), String(k)).toBe(true);
    const under = nav.pts.filter(p => p.y < (heightAt(w.ground!, p.x, p.z) ?? Infinity) - 4).length;
    expect(under).toBeGreaterThan(30);
    // Every stretch walkable: nothing across it at body height on its line, nothing steeper than a stair.
    let n = 0;
    nav.adj.forEach((a, i) => { for (const [j, d, k] of a) if (j > i && k !== NAV.tunnel && n++ % 50 === 0) {
      const p = nav.pts[i], q = nav.pts[j];
      expect(Math.abs(q.y - p.y)).toBeLessThanOrEqual(Math.hypot(q.x - p.x, q.z - p.z) * 0.9 + 0.31);
      expect(d).toBeLessThan(8);
    } });
  });
  it('paths a quadruped from the foot of Shibati to Jiaochangkou over the stairs', () => {
    const p = navPath(nav, foot('Shibati bottom'), foot('jiaochangkou'), 'quadruped')!;
    expect(p).toBeTruthy();
    expect(p.kinds.filter(k => k === NAV.stairs).length).toBeGreaterThan(5);
    const a = p.pts[0], b = p.pts[p.pts.length - 1];
    expect(Math.hypot(a.x - foot('Shibati bottom').x, a.z - foot('Shibati bottom').z)).toBeLessThan(20);
    expect(Math.hypot(b.x - foot('jiaochangkou').x, b.z - foot('jiaochangkou').z)).toBeLessThan(20);
    // Climbs the hill, each step to the next within reach of the last.
    expect(b.y - a.y).toBeGreaterThan(15);
    for (let k = 1; k < p.pts.length; k++) expect(Math.hypot(p.pts[k].x - p.pts[k - 1].x, p.pts[k].z - p.pts[k - 1].z)).toBeLessThan(8.5);
  });
  it('keeps a delivery robot off the stairs', () => {
    const q = navPath(nav, foot('Shibati bottom'), foot('jiaochangkou'), 'delivery');
    if (q) expect(q.kinds.includes(NAV.stairs)).toBe(false);
    const quad = navPath(nav, foot('Shibati bottom'), foot('jiaochangkou'), 'quadruped')!;
    if (q) expect(q.length).toBeGreaterThan(quad.length);
  });
  it('goes underground: from Jiaochangkou down a stepped street into the underground city, and along the tunnels', () => {
    const walks = walksOf(w.features), descents = walks.filter(wk => wk[0].y > wk[wk.length - 1].y + 5 && wk.length < 20);
    expect(descents.length).toBeGreaterThan(0);
    const bottom = descents[0][descents[0].length - 1], p = navPath(nav, foot('jiaochangkou'), bottom, 'humanoid')!;
    expect(p).toBeTruthy();
    expect(p.kinds.includes(NAV.tunnel)).toBe(true);
    expect(Math.hypot(p.pts[p.pts.length - 1].x - bottom.x, p.pts[p.pts.length - 1].z - bottom.z)).toBeLessThan(1);
    // The metro's way and the underground city's are one: from the metro platform to the far end of the city's.
    const metro = walks.find(wk => Math.hypot(wk[0].x - T('Jiaochangkou metro').x, wk[0].z - T('Jiaochangkou metro').z) < 30)!, city = walks.find(wk => wk.length >= 30)!;
    const q = navPath(nav, metro[0], city[city.length - 1], 'quadruped')!;
    expect(q).toBeTruthy();
    expect(q.kinds.every(k => k === NAV.tunnel)).toBe(true);
    expect(nearestNav(nav, metro[0])).toBeGreaterThanOrEqual(0);
  });
});
