// M4-09: quadrupeds. Patrol at 3 m/s and chase at 8 on the nav graph, over stairs and a metre's jump, never climbing:
// it runs him down up Shibati's stair, and has no way after him up a 2.4 m mantle.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { navPath } from '../../src/sim/nav';
import { unitPose } from '../../src/sim/units';
import { heightAt } from '../../src/world/heightfield';
import { NAV } from '../../src/world/world';
import { UNITS } from '../../src/data/units';
import { run } from './helpers';

const w = getWorld('yuzhong'), T = (n: string) => w.teleports.find(t => t.name === n)!, foot = (n: string) => ({ x: T(n).x, y: T(n).y - 1.5, z: T(n).z });

describe('quadrupeds (M4-09)', () => {
  it('walks its beat at 3 m/s and chases at 8, taking stairs and a metre\'s jump', () => {
    expect([UNITS.quadruped.patrol, UNITS.quadruped.chase]).toEqual([3, 8]);
    expect(w.nav!.adj.some(a => a.some(e => e[2] === NAV.jump))).toBe(true);
    const up = navPath(w.nav!, foot('Shibati bottom'), foot('Shibati top'), 'quadruped')!;
    expect(up.kinds.includes(NAV.stairs)).toBe(true);
  });
  it('runs him down up the stair, and has no way after him up a 2.4 m mantle', () => {
    const s = createState(1, w), dog = s.units.find(u => u.kind === 'quadruped' && u.patrol >= 0)!;
    s.flags.clear = true; s.flags.god = true; s.time = 12 * 3600;
    const way = navPath(w.nav!, foot('Shibati bottom'), foot('Shibati top'), 'quadruped')!.pts;
    // He runs up the stair at 6 m/s; it starts after him 25 m behind, the hive passing on where he is (M4-13).
    const behind = way[Math.max(0, 0)], start = { x: behind.x, y: behind.y, z: behind.z };
    teleport(s.player, way[6].x, way[6].y + 0.05, way[6].z);
    Object.assign(dog, { state: 'engaged', aware: 1.2, seen: { ...s.player.pos }, trip: { kind: 'look', path: [], i: 0, pos: start, yaw: 0, scan: 0, back: false, left: start, leftAt: s.time } });
    let k = 6, f = 0, gap = Infinity, climbed = 0, y0 = unitPose(w, dog, s.time).y;
    for (let t = 0; t < 60 * 90 && k < way.length - 1; t++) {
      // Along his way at 6 m/s.
      f += 6 / 60;
      while (k < way.length - 1 && f >= Math.hypot(way[k + 1].x - way[k].x, way[k + 1].z - way[k].z)) { f -= Math.hypot(way[k + 1].x - way[k].x, way[k + 1].z - way[k].z); k++; }
      const a = way[k], b = way[Math.min(way.length - 1, k + 1)], L = Math.hypot(b.x - a.x, b.z - a.z) || 1, g = Math.min(1, f / L);
      teleport(s.player, a.x + (b.x - a.x) * g, a.y + (b.y - a.y) * g + 0.05, a.z + (b.z - a.z) * g);
      dog.seen = { ...s.player.pos };
      run(s, w, 1);
      const p = unitPose(w, dog, s.time);
      gap = Math.min(gap, Math.hypot(p.x - s.player.pos.x, p.z - s.player.pos.z));
      climbed = Math.max(climbed, p.y - y0);
    }
    expect(climbed).toBeGreaterThan(10);
    expect(gap).toBeLessThan(3);
    // Onto a block standing 2.2-2.6 m over the ground all round near the top of the stair (where he'd mantle): it gets
    // under him, never up to him.
    const top = foot('Shibati top');
    const ledge = w.solids.find(q => !q.ramp && !q.inner && q.x1 - q.x0 >= 1.2 && q.z1 - q.z0 >= 1.2 && Math.hypot((q.x0 + q.x1) / 2 - top.x, (q.z0 + q.z1) / 2 - top.z) < 120 && (() => { const cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2, gy = heightAt(w.ground!, cx, cz) ?? -99, around = [[q.x0 - 1, cz], [q.x1 + 1, cz], [cx, q.z0 - 1], [cx, q.z1 + 1]].map(([x, z]) => heightAt(w.ground!, x, z) ?? 99); return q.y1 - gy > 2.2 && q.y1 - gy < 2.6 && q.y0 <= gy + 0.5 && around.every(y => q.y1 - y > 2.2) && !w.nav!.pts.some(n => Math.hypot(n.x - cx, n.z - cz) < 6 && n.y > q.y1 - 1.5); })())!;
    expect(ledge).toBeTruthy();
    const on = { x: (ledge.x0 + ledge.x1) / 2, y: ledge.y1 + 0.05, z: (ledge.z0 + ledge.z1) / 2 };
    teleport(s.player, on.x, on.y, on.z);
    let closest = Infinity, highest = -Infinity;
    for (let t = 0; t < 60 * 20; t++) {
      dog.seen = { ...s.player.pos };
      run(s, w, 1);
      const p = unitPose(w, dog, s.time);
      closest = Math.min(closest, Math.hypot(p.x - on.x, p.y - on.y, p.z - on.z));
      highest = Math.max(highest, p.y);
    }
    expect(highest).toBeLessThan(on.y - 1.4);
    expect(closest).toBeGreaterThan(1.5);
  });
});
