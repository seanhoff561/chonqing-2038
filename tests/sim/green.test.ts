// M3-56b (U-028): the green city. The real map's parks and the land the buildings left go green: woods thick with
// trees, parks with trees and shrubs, grass in patches over the open ground with weeds coming up through it.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { heightAt } from '../../src/world/heightfield';
import { raycast } from '../../src/world/geom';
import { MARK, markAt, grassAt } from '../../src/world/yuzhong/marks';

const w = getWorld('yuzhong'), mk = w.marks!, g = w.ground!;
const area = (v: number) => mk.m.filter(x => x === v).length * mk.cell * mk.cell;
const on = (kinds: string[], v: number) => w.props.filter(p => kinds.includes(p.kind) && markAt(mk, p.x, p.z) === v).length;

describe('the green city (M3-56b)', () => {
  it('grows woods on the land away from the buildings: a tree every 50 m2 or so', () => {
    expect(on(['tree', 'figtree'], MARK.wood) / area(MARK.wood)).toBeGreaterThan(1 / 60);
    expect(on(['shrub'], MARK.wood)).toBeGreaterThan(200);
  });
  it('keeps trees and shrubs in the real parks', () => {
    expect(on(['tree', 'figtree'], MARK.park) / area(MARK.park)).toBeGreaterThan(1 / 250);
    expect(on(['shrub'], MARK.park)).toBeGreaterThan(100);
  });
  it('grows grass over the parks and woods and in patches over a good share of the open ground, weeds in it', () => {
    let open = 0, grass = 0;
    for (let j = 0; j < mk.h; j++) for (let i = 0; i < mk.w; i++) if (mk.m[j * mk.w + i] === MARK.open) { open++; if (grassAt(mk, (i + 0.5) * mk.cell, (j + 0.5) * mk.cell)) grass++; }
    expect(grass / open).toBeGreaterThan(0.3);
    expect(grass / open).toBeLessThan(0.8);
    expect(grassAt(mk, -10, -10)).toBe(false);
    expect(on(['weeds'], MARK.open)).toBeGreaterThan(300);
  });
  it('stands every tree and shrub on the ground (or, a shrub, on whatever is under it)', () => {
    const off = w.props.filter(p => {
      if (!['tree', 'figtree', 'shrub'].includes(p.kind) || !markAt(mk, p.x, p.z) || Math.abs(p.y - (heightAt(g, p.x, p.z) ?? -99)) < 0.05) return false;
      const hit = p.kind === 'shrub' ? raycast(w.index, p.x, p.y + 0.3, p.z, 0, -1, 0, 5) : null;
      return !hit || Math.abs(hit.t - 0.3) > 0.05;
    });
    expect(off.map(p => `${p.kind} ${(p.y - heightAt(g, p.x, p.z)!).toFixed(2)}`).slice(0, 8)).toEqual([]);
  });
});
