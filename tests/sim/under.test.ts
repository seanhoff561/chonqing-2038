// M3-58 (U-023, U-024), M3-68 (U-032): the underground city. Thirty and more ways in of every kind; a bot walks
// underground from the Grand Tunnel under Jiaochangkou through the old tunnels' rooms, both levels of the city
// under Jiefangbei and the metro to Xiaoshizi. The old tunnels broken into rooms, the metro run like a metro, and
// streets that step down off the street into the city.
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

  it('breaks the old tunnels into rooms every 110 m at most: shelters, stores, a pump room, a market (M3-68)', () => {
    const rooms = w.features.filter(f => f.kind.startsWith('room:'));
    for (const k of ['shelter', 'store', 'pump', 'market']) expect(rooms.some(f => f.kind === `room:${k}`), k).toBe(true);
    expect(rooms.length).toBeGreaterThanOrEqual(6);
    // Along each run (the rooms on one line), one after another no more than 110 m apart.
    const lines = new Map<string, number[]>();
    for (const f of rooms) for (const [key, v] of [[`x${f.x.toFixed(0)}`, f.z], [`z${f.z.toFixed(0)}`, f.x]] as const) lines.set(key, [...(lines.get(key) ?? []), v]);
    for (const vs of lines.values()) { vs.sort((a, b) => a - b); for (let i = 1; i < vs.length; i++) expect(vs[i] - vs[i - 1]).toBeLessThanOrEqual(110); }
  });

  it('runs the metro like a metro: two stations, twin tubes with cross passages and signals, a stalled train (M3-68)', () => {
    const n = (k: string) => w.features.filter(f => f.kind === k).length;
    expect(n('station')).toBe(2);
    expect(n('crossPassage')).toBeGreaterThanOrEqual(6);
    expect(n('signal')).toBeGreaterThanOrEqual(8);
    expect(n('trainCar')).toBe(3);
    // The route walks it: up onto both platforms, along the tubes between.
    const route = w.features.filter(f => f.kind === 'underRoute'), stations = w.features.filter(f => f.kind === 'station');
    for (const st of stations) expect(route.some(q => Math.hypot(q.x - st.x, q.z - st.z) < 40 && q.y > st.y + 0.9)).toBe(true);
  });

  it('steps down off the street into the city, landing by landing, and a bot walks one (M3-68)', async () => {
    await settle();
    const all = w.features.filter(f => f.kind === 'descentRoute'), ds = new Map<number, typeof all>();
    for (const f of all) ds.set(Math.floor(f.group / 100), [...(ds.get(Math.floor(f.group / 100)) ?? []), f]);
    expect(ds.size).toBeGreaterThanOrEqual(2);
    for (const d of ds.values()) {
      d.sort((a, b) => a.group - b.group);
      // From the street (its mouth level with the ground just behind it) at least 10 m down, never up.
      const l = Math.hypot(d[1].x - d[0].x, d[1].z - d[0].z), bx = d[0].x - ((d[1].x - d[0].x) / l) * 3, bz = d[0].z - ((d[1].z - d[0].z) / l) * 3;
      expect(Math.abs(d[0].y - (heightAt(w.ground!, bx, bz) ?? 0))).toBeLessThan(0.6);
      expect(d[0].y - d[d.length - 1].y).toBeGreaterThan(10);
      for (let i = 1; i < d.length; i++) expect(d[i].y).toBeLessThanOrEqual(d[i - 1].y + 0.01);
    }
    const d = [...ds.values()][0], s = createState(1, w), p = s.player;
    s.flags.clear = true;
    teleport(p, d[0].x, d[0].y + 0.05, d[0].z);
    run(s, w, 10);
    for (const q of d.slice(1)) {
      for (let i = 0; i < secs(20) && Math.hypot(p.pos.x - q.x, p.pos.z - q.z) > 0.4; i++) run(s, w, 1, { my: 1, yaw: Math.atan2(-(q.x - p.pos.x), -(q.z - p.pos.z)) });
      expect(Math.hypot(p.pos.x - q.x, p.pos.z - q.z), `to ${q.x.toFixed(1)},${q.y.toFixed(1)},${q.z.toFixed(1)} from ${p.pos.x.toFixed(1)},${p.pos.y.toFixed(1)},${p.pos.z.toFixed(1)}`).toBeLessThan(0.5);
      expect(Math.abs(p.pos.y - q.y)).toBeLessThan(0.6);
    }
    expect(s.dead).toBeFalsy();
  });
});
