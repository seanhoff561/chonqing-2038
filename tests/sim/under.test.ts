// M3-58 (U-023, U-024): the underground city. Thirty and more ways in of every kind; a bot walks underground from
// the Grand Tunnel under Jiaochangkou through both levels of the city under Jiefangbei to Xiaoshizi.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { heightAt } from '../../src/world/heightfield';
import { districtAt } from '../../src/world/yuzhong/lots';
import { run, secs, settle } from './helpers';

const w = getWorld('yuzhong');
const ways = w.features.filter(f => f.kind.startsWith('way:'));

describe('the underground city (M3-58)', () => {
  it('has thirty and more ways in: stairs, grates, cellars, culverts, drains, the stations, the old tunnels', () => {
    const kinds = new Set(ways.map(f => f.kind));
    expect(ways.length).toBeGreaterThanOrEqual(30);
    for (const k of ['way:stairs', 'way:grate', 'way:cellar', 'way:culvert', 'way:drain', 'way:metro', 'way:tunnel']) expect(kinds.has(k), k).toBe(true);
    // Some only by a climb (a culvert's mouth up a wall over the hillside) or a squeeze (a drain).
    const climbs = ways.filter(f => (f.kind === 'way:culvert' || f.kind === 'way:drain') && f.y - (heightAt(w.ground!, f.x + f.nx! * 2, f.z + f.nz! * 2) ?? f.y) > 1.5);
    expect(climbs.length + ways.filter(f => f.kind === 'way:drain').length).toBeGreaterThanOrEqual(2);
  });

  it('walks underground from Jiaochangkou through both levels under Jiefangbei to Xiaoshizi', async () => {
    await settle();
    const route = w.features.filter(f => f.kind === 'underRoute').sort((a, b) => a.group - b.group);
    const s = createState(1, w), p = s.player;
    s.flags.clear = true;
    teleport(p, route[0].x, route[0].y + 0.05, route[0].z);
    run(s, w, 10);
    const districts = new Set<string>(), ys: number[] = [];
    let reached = 0;
    for (const q of route.slice(1)) {
      for (let i = 0; i < secs(240) && Math.hypot(p.pos.x - q.x, p.pos.z - q.z) > 0.4; i++) {
        run(s, w, 1, { my: 1, yaw: Math.atan2(-(q.x - p.pos.x), -(q.z - p.pos.z)) });
        if (i % 60 === 0) { districts.add(districtAt(p.pos.x, p.pos.z).district); ys.push(p.pos.y); }
      }
      if (Math.hypot(p.pos.x - q.x, p.pos.z - q.z) > 0.4 || Math.abs(p.pos.y - q.y) > 0.6) break;
      reached++;
    }
    expect(reached, `stopped at ${JSON.stringify(route[reached + 1])}, he is at ${p.pos.x.toFixed(1)},${p.pos.y.toFixed(1)},${p.pos.z.toFixed(1)}`).toBe(route.length - 1);
    for (const d of ['jiaochangkou', 'jiefangbei', 'xiaoshizi']) expect(districts.has(d), d).toBe(true);
    // Two levels of the city and the old tunnel's deeper one, all under the ground.
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(10);
    expect(s.dead).toBeFalsy();
  });
});
