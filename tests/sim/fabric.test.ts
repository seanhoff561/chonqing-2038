import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { districtAt } from '../../src/world/yuzhong/lots';
import { minRect, inside, corners } from '../../src/world/yuzhong/shapes';
import { free } from '../../src/sim/physics';
import { run, secs, aim, LMB, RMB } from './helpers';
import { teleport } from '../../src/sim/player';
import { fits } from '../../src/sim/hide';
import { heightAt } from '../../src/world/heightfield';
import { BARE } from '../../src/world/city/climb';

const w = getWorld('yuzhong'), fabric = { features: w.features, hides: w.hides };
const inDistrict = (id: string, x: number, z: number) => districtAt(x, z).district === id;

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
    expect(fabric.hides.length).toBeGreaterThanOrEqual(fabric.features.filter(f => f.kind === 'crate' || f.kind === 'dumpster').length);
    // Every one is big enough to get into (a car boot, lying down, lower than the rest: M3-47).
    expect(w.hides.every((_, i) => fits(w, i))).toBe(true);
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
  // (Until U-036 the towers held nothing; now their walls hold what any other building's do, none in reach of the street.)
  it("towers' walls hold what other buildings' do, none in reach of the street", () => {
    const grown = (k: (kind: string) => boolean) => w.plots.filter(l => k(l.kind) && !l.far).map(l => { const o = minRect(l.corners); return corners({ ...o, hw: o.hw + 0.5, hd: o.hd + 0.5 }); });
    const towers = grown(k => k === 'tower'), others = grown(k => k !== 'tower');
    expect(towers.length).toBeGreaterThan(5);
    // On a tower's walls and not a lower neighbour's built against it.
    const near = (x: number, z: number) => towers.some(c => inside(c, x, z)) && !others.some(c => inside(c, x, z));
    const held = fabric.features.filter(f => ['pipe', 'ladder', 'sill', 'ac', 'balcony', 'route'].includes(f.kind) && near(f.x, f.z));
    expect(held.length).toBeGreaterThan(100);
    expect(held.filter(f => f.y < (heightAt(w.ground!, f.x, f.z) ?? 0) + BARE - 0.2).length).toBe(0);
  });
  it('climbs a generated drain pipe hand over hand onto the roof', () => {
    const pipe = w.climbables.find(c => c.kind === 'pipe' && c.y1 - c.y0 <= 9 && c.y1 - c.y0 >= 5 && free(w.index, c.x + c.nx * 0.65, c.y0 - 1.2, c.z + c.nz * 0.65, 1.7, 0.4) && free(w.index, c.x - c.nx * 1.5, c.y1 + 0.3, c.z - c.nz * 1.5, 1.7, 0.3))!;
    expect(pipe).toBeTruthy();
    const s = createState(1, w);
    // (Broken off high over the street, U-032: he starts hanging from its foot, as if off a pole or a roof.)
    teleport(s.player, pipe.x + pipe.nx * 0.65, pipe.y0 - 1.2, pipe.z + pipe.nz * 0.65);
    s.player.yaw = Math.atan2(pipe.nx, pipe.nz);
    aim(s, pipe.x + pipe.nx * 0.08, pipe.y0 + 0.5, pipe.z + pipe.nz * 0.08);
    run(s, w, 3, { buttons: LMB });
    expect(s.player.hands[0].grip).not.toBeNull();
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
