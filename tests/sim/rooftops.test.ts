import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { buildFabric } from '../../src/world/city/buildings';
import { run } from './helpers';
import { teleport } from '../../src/sim/player';
import { B } from '../../src/sim/types';

const fabric = buildFabric();

describe('building generator (M3-03)', () => {
  it('splits tiles into 1-4 buildings with 1.5-4 m alleys, with roof clutter', () => {
    const byTile = new Map<string, typeof fabric.lots>();
    for (const l of fabric.lots) { const k = `${l.tile.c},${l.tile.r}`; byTile.set(k, [...(byTile.get(k) ?? []), l]); }
    for (const lots of byTile.values()) {
      expect(lots.length).toBeGreaterThanOrEqual(1);
      expect(lots.length).toBeLessThanOrEqual(4);
      for (const a of lots) for (const b of lots) {
        if (a === b) continue;
        const gx = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1), gz = Math.max(a.z0, b.z0) - Math.min(a.z1, b.z1);
        const gap = Math.max(gx, gz);
        if (gx > 0 !== gz > 0) { expect(gap).toBeGreaterThanOrEqual(1.5); expect(gap).toBeLessThanOrEqual(4); }
      }
    }
    expect(fabric.props.filter(p => p.kind === 'stilts').length).toBeGreaterThan(20);
  });
  it('neighbouring roofs are often within jumping range (4 m across, no more than 4 m down)', () => {
    const near = (a: (typeof fabric.lots)[0]) => fabric.lots.some(b => {
      if (b === a) return false;
      const gx = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1), gz = Math.max(a.z0, b.z0) - Math.min(a.z1, b.z1);
      const gap = Math.max(gx, gz), drop = a.top - b.top;
      return gap > 0 && gap <= 4 && drop >= -0.5 && drop <= 4;
    });
    const low = fabric.lots.filter(l => l.kind !== 'tower');
    expect(low.filter(near).length / low.length).toBeGreaterThan(0.5);
  });
  it('runs a rooftop route along a Shibati row across at least 4 houses', () => {
    const w = getWorld('city');
    const s = createState(1, w);
    const row = fabric.lots.filter(l => l.kind === 'trad' && l.tile.r === 22 && l.tile.c >= 24 && l.z0 < l.tile.r * 20 + 10).sort((a, b) => a.x0 - b.x0);
    expect(row.length).toBeGreaterThanOrEqual(6);
    const ridge = (row[0].z0 + row[0].z1) / 2;
    teleport(s.player, row[0].x0 + 0.6, row[0].top + 0.1, ridge);
    const yaw = -Math.PI / 2;
    run(s, w, 10, { yaw });
    let crossed = 0, lowest = Infinity;
    for (let i = 0; i < 60 * 12 && crossed < row.length - 1; i++) {
      const p = s.player, cur = row[crossed], next = row[crossed + 1];
      const jump = p.onGround && p.pos.x > cur.x1 - 0.45 && p.pos.x < cur.x1;
      run(s, w, 1, { my: 1, yaw, buttons: B.SPRINT | (jump || !p.onGround ? B.JUMP : 0), pressed: jump ? B.JUMP : 0 });
      if (p.onGround && p.pos.x > next.x0 + 0.3) crossed++;
      lowest = Math.min(lowest, p.pos.y);
    }
    expect(crossed).toBeGreaterThanOrEqual(4);
    expect(lowest).toBeGreaterThan(row[0].top - 1.5);
  });
});
