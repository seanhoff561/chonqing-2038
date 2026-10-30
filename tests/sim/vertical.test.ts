// M3-57 (U-023, U-024): the vertical city. Skybridges, blocks over the lanes, streets on the roofs, megastructures
// and billboards are built; the gaps between buildings along the rows are sized from the movement envelope; a
// skybridge is walked across to a mantle onto the far roof, a roof street walked up from the street onto the roof,
// and a lane walked under its block.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { raycast } from '../../src/world/geom';
import { heightAt } from '../../src/world/heightfield';
import { ENVELOPE as E } from '../../src/data/envelope';
import type { SimState } from '../../src/sim/types';
import type { Feature, Plot } from '../../src/world/world';
import { run, secs } from './helpers';

const w = getWorld('yuzhong');
const of = (k: string) => w.features.filter(f => f.kind === k);

/** Walk toward (x, z) for up to `t` seconds; true if he got within 0.3 m. */
function walk(s: SimState, x: number, z: number, t = 8) {
  const p = s.player;
  for (let i = 0; i < secs(t) && Math.hypot(p.pos.x - x, p.pos.z - z) > 0.3; i++) run(s, w, 1, { my: 1, yaw: Math.atan2(-(x - p.pos.x), -(z - p.pos.z)) });
  return Math.hypot(p.pos.x - x, p.pos.z - z) <= 0.3;
}

describe('the vertical city (M3-57)', () => {
  it('bridges, builds over and stacks: skybridges, blocks over lanes, roof streets, megastructures, billboards', () => {
    expect(new Set(of('skybridge').map(f => f.group)).size).toBeGreaterThanOrEqual(15);
    expect(of('overLane').length).toBeGreaterThanOrEqual(20);
    expect(of('roofStreet').length).toBeGreaterThanOrEqual(10);
    expect(of('mega').length).toBeGreaterThanOrEqual(10);
    expect(of('billboard').length).toBeGreaterThanOrEqual(8);
  });

  it('sizes the gaps between buildings along the rows from the envelope', () => {
    // Consecutive buildings in each row along a street, side by side and square to each other.
    const rows = new Map<string, Plot[]>();
    for (const p of w.plots) if (p.row && /^\d+:/.test(p.row) && !p.far) { const a = rows.get(p.row); if (a) a.push(p); else rows.set(p.row, [p]); }
    const frame = (p: Plot) => { const [a, b, c] = p.corners, hw = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2; return { cx: (a[0] + c[0]) / 2, cz: (a[1] + c[1]) / 2, ux: (b[0] - a[0]) / (2 * hw), uz: (b[1] - a[1]) / (2 * hw), hw }; };
    const gaps: { gap: number; x: number; z: number; level: boolean }[] = [];
    for (const row of rows.values()) for (let i = 0; i + 1 < row.length; i++) {
      const a = frame(row[i]), b = frame(row[i + 1]);
      if (Math.abs(a.ux * b.ux + a.uz * b.uz) < 0.99) continue;
      const al = (b.cx - a.cx) * a.ux + (b.cz - a.cz) * a.uz, gap = Math.abs(al) - a.hw - b.hw;
      const k = Math.sign(al) * (a.hw + gap / 2);
      if (gap > 0.5 && gap <= E.wallRun.max) gaps.push({ gap, x: a.cx + a.ux * k, z: a.cz + a.uz * k, level: Math.abs(row[i].top - row[i + 1].top) <= 2 && row[i].wall - row[i].base >= 6 && row[i + 1].wall - row[i + 1].base >= 6 });
    }
    const boards = of('billboard'), spanned = (q: (typeof gaps)[number]) => boards.some(b => Math.hypot(b.x - q.x, b.z - q.z) < q.gap / 2 + 8);
    const standing = gaps.filter(q => q.gap <= E.standingJump.max), running = gaps.filter(q => q.gap > E.standingJump.max && q.gap <= E.runningJump.max);
    const atMax = running.filter(q => q.gap >= 0.92 * E.runningJump.max), wide = gaps.filter(q => q.gap > E.runningJump.max && q.level);
    console.log(`  ${gaps.length} gaps: ${standing.length} a standing jump, ${running.length} a running jump (${atMax.length} at its longest), ${wide.length} wider between level roofs, ${wide.filter(spanned).length} spanned for a wall-run`);
    expect(standing.length / gaps.length).toBeGreaterThan(0.5);
    expect(running.length / gaps.length).toBeGreaterThan(0.1);
    expect(atMax.length).toBeGreaterThanOrEqual(5);
    expect(wide.filter(spanned).length / wide.length).toBeGreaterThan(0.6);
  });

  it('carries him across a skybridge, its far roof a mantle up from the deck', { timeout: 60000 }, () => {
    // Each bridge's two ends; from the end at the lower roof (the deck's level) to the other.
    const ends = new Map<number, Feature[]>();
    for (const f of of('skybridge')) ends.set(f.group, [...(ends.get(f.group) ?? []), f]);
    const roof = (f: Feature, dx: number, dz: number) => { const h = raycast(w.index, f.x + dx * 1.2, f.y + 6, f.z + dz * 1.2, 0, -1, 0, 20); return h ? f.y + 6 - h.t : -Infinity; };
    let crossed = 0;
    for (const [a, b] of [...ends.values()].slice(0, 6)) {
      const len = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / len, dz = (b.z - a.z) / len;
      const [from, to, ux, uz] = roof(a, -dx, -dz) <= roof(b, dx, dz) ? [a, b, dx, dz] : [b, a, -dx, -dz];
      const s = createState(1, w), p = s.player;
      s.flags.clear = true;
      teleport(p, from.x + ux, from.y + 0.02, from.z + uz);
      run(s, w, 10);
      const ok = walk(s, to.x - ux * 0.6, to.z - uz * 0.6) && Math.abs(p.pos.y - from.y) < 0.1, lip = roof(to, ux, uz) - from.y;
      if (ok && lip <= E.mantleStanding.max) crossed++;
    }
    expect(crossed).toBeGreaterThanOrEqual(4);
  });

  it('walks up from the street onto a roof street, and under a block over its lane', { timeout: 60000 }, () => {
    let up = 0;
    for (const f of of('roofStreet').slice(0, 6)) {
      const s = createState(1, w), p = s.player, back = (d: number): [number, number] => [f.x - f.nx! * d, f.z - f.nz! * d];
      s.flags.clear = true;
      const [sx, sz] = back(7.2);
      teleport(p, sx, (heightAt(w.ground!, sx, sz) ?? f.y) + 0.05, sz);
      run(s, w, 10);
      walk(s, ...back(-2), 10);
      if (p.mode === 'ground' && Math.abs(p.pos.y - (f.y - 0.6)) < 0.2) up++;
    }
    expect(up).toBeGreaterThanOrEqual(3);
    // Under each block over a lane there's headroom to walk: its underside 4.4 m or more over the lane.
    const under = of('overLane').map((f: Feature) => { const y = heightAt(w.ground!, f.x, f.z) ?? 0, h = raycast(w.index, f.x, y + 0.1, f.z, 0, 1, 0, 30); return h ? h.t + 0.1 : 0; });
    expect(under.filter(h => h >= 4.4).length / under.length).toBeGreaterThan(0.9);
  });
});
