import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { buildFabric } from '../../src/world/city/buildings';
import { DISTRICTS } from '../../src/data/map';
import { TILE } from '../../src/world/map';
import { free } from '../../src/sim/physics';
import { run, secs, aim, LMB, RMB } from './helpers';
import { teleport } from '../../src/sim/player';

const fabric = buildFabric();
const inDistrict = (id: string, x: number, z: number) => {
  const [c0, r0, c1, r1] = DISTRICTS.find(d => d.id === id)!.box;
  return x >= c0 * TILE && x < (c1 + 1) * TILE && z >= r0 * TILE && z < (r1 + 1) * TILE;
};

describe('fabric climbables and hiding spots (M3-05)', () => {
  it('every built district has pipes, ladders, hold columns, balconies, hides, bars and crawl fences', () => {
    for (const d of ['shibati', 'jiaochangkou']) {
      const count = (k: string) => fabric.features.filter(f => f.kind === k && inDistrict(d, f.x, f.z)).length;
      expect(count('pipe'), `${d} pipes`).toBeGreaterThan(10);
      expect(count('sill') + count('ac'), `${d} holds`).toBeGreaterThan(100);
      expect(count('crate') + count('dumpster'), `${d} hides`).toBeGreaterThan(5);
      expect(count('bar') + count('fence'), `${d} bars and fences`).toBeGreaterThan(3);
    }
    const all = (k: string) => fabric.features.filter(f => f.kind === k).length;
    for (const k of ['ladder', 'balcony', 'bar', 'fence', 'dumpster', 'crate', 'sign']) expect(all(k), k).toBeGreaterThan(10);
    expect(fabric.hides.length).toBe(fabric.features.filter(f => f.kind === 'crate' || f.kind === 'dumpster').length);
    expect(fabric.hides.every(h => h.inner.x1 - h.inner.x0 > 0.79 && h.inner.y1 - h.inner.y0 > 0.79 && h.inner.z1 - h.inner.z0 > 0.79)).toBe(true);
  });
  it('hand-route columns climb in 1.2-2.0 m steps, with the odd gap that needs a push-off', () => {
    const groups = new Map<number, number[]>();
    for (const f of fabric.features) if (f.kind === 'sill' || f.kind === 'ac') groups.set(f.group, [...(groups.get(f.group) ?? []), f.y]);
    let gaps = 0, short = 0, big = 0;
    for (const ys of groups.values()) for (let i = 1; i < ys.length; i++) {
      const g = ys[i] - ys[i - 1];
      gaps++;
      if (g >= 1.2 && g <= 2.0) short++;
      if (g > 2.2) big++;
      expect(g).toBeLessThanOrEqual(2.6);
    }
    expect(short / gaps).toBeGreaterThan(0.75);
    expect(big).toBeGreaterThan(20);
  });
  it('scaffold bars hang in lache range of each other at one height', () => {
    const bars = fabric.features.filter(f => f.kind === 'bar');
    const paired = bars.filter(a => bars.some(b => b !== a && Math.abs(b.y - a.y) < 0.01 && Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - 2.4) < 0.01));
    expect(paired.length).toBe(bars.length);
  });
  it('glass towers offer no holds', () => {
    const towers = fabric.lots.filter(l => l.kind === 'tower');
    expect(towers.length).toBeGreaterThan(5);
    const near = (x: number, z: number) => towers.some(l => x > l.x0 - 0.5 && x < l.x1 + 0.5 && z > l.z0 - 0.5 && z < l.z1 + 0.5);
    expect(fabric.features.filter(f => ['pipe', 'ladder', 'sill', 'ac', 'balcony'].includes(f.kind) && near(f.x, f.z))).toEqual([]);
  });
  it('climbs a generated drain pipe hand over hand onto the roof', () => {
    const w = getWorld('city');
    const pipe = w.climbables.find(c => {
      const lot = fabric.lots.find(l => l.kind === 'res' && Math.abs(c.y1 - l.top) < 0.01 && c.x > l.x0 - 0.2 && c.x < l.x1 + 0.2 && c.z > l.z0 - 0.2 && c.z < l.z1 + 0.2);
      return c.kind === 'pipe' && lot && lot.wall - lot.base <= 15 && free(w.index, c.x + c.nx * 0.9, c.y0 + 0.05, c.z + c.nz * 0.9, 1.7, 0.4);
    })!;
    expect(pipe).toBeTruthy();
    const s = createState(1, w);
    teleport(s.player, pipe.x + pipe.nx * 0.65, pipe.y0 + 0.05, pipe.z + pipe.nz * 0.65);
    s.player.yaw = Math.atan2(pipe.nx, pipe.nz);
    run(s, w, 20, { yaw: s.player.yaw });
    const bits: number[] = [LMB, RMB];
    let hand = 0;
    for (let step = 0; step < 50 && !(s.player.mode === 'ground' && s.player.pos.y > pipe.y1 - 1); step++) {
      const p = s.player;
      const held = p.hands.map((h, i) => (h.grip ? bits[i] : 0)).reduce((a, b) => a | b, 0);
      aim(s, pipe.x + pipe.nx * 0.08, Math.min(pipe.y1 - 0.05, p.pos.y + 2.2), pipe.z + pipe.nz * 0.08);
      run(s, w, 2, { buttons: held | bits[hand] });
      run(s, w, secs(1), { buttons: bits[hand], my: 1 });
      hand = 1 - hand;
      if (p.mode === 'action') run(s, w, secs(1));
    }
    expect(s.player.mode).toBe('ground');
    expect(s.player.pos.y).toBeGreaterThan(pipe.y1 - 1);
  });
});
