// M3-57a (U-023, U-032): the towers are climbed from the street using only what the city generated: a street pole
// at the line's foot (the wall itself bare to 7 m), steel stubs a dyno apart, broken floors to rest in, each
// block's edge to pull over. A bot climbs three towers over 80 m; the lines are hard (the longest dynos, no rest
// between the broken floors) and there's no easy way up the glass between.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import type { Feature } from '../../src/world/world';
import { run } from './helpers';
import { climbPole, climbHolds } from './climbbot';

const w = getWorld('yuzhong');
// The towers' lines: each from a street pole (U-032) at its foot (the pole's feature shares the line's group).
const feet = new Map(w.features.filter(f => f.kind === 'pole').map(f => [f.group, f]));
const lines = new Map<number, Feature[]>();
for (const f of w.features) if (['route', 'rest', 'routeTop', 'vantage'].includes(f.kind) && feet.has(f.group)) { const a = lines.get(f.group); if (a) a.push(f); else lines.set(f.group, [f]); }
const poleOf = (fs: Feature[]) => { const f = feet.get(fs[0].group)!; return w.climbables.find(c => c.kind === 'pole' && Math.hypot(c.x - f.x, c.z - f.z) < 0.01); };
const holds = (fs: Feature[]) => fs.filter(f => f.kind !== 'vantage');
const height = (fs: Feature[]) => Math.max(...fs.map(f => f.y)) - Math.min(...fs.map(f => f.y));

/** Climb a line from the street: up the pole at its foot, then hold to hold; ok if he ends standing on the last
 *  block's roof. */
function climb(fs: Feature[]): { ok: boolean; got: number; at: string } {
  const s = createState(1, w), p = s.player, c = poleOf(fs);
  if (!c) return { ok: false, got: 0, at: 'no pole' };
  s.flags.clear = true;
  teleport(p, c.x + c.nx * 0.6, c.y0 + 0.05, c.z + c.nz * 0.6);
  run(s, w, 30);
  if (!climbPole(s, w, c)) return { ok: false, got: 0, at: `pole ${p.mode} at ${p.pos.y.toFixed(1)} of ${c.y1.toFixed(1)}` };
  return climbHolds(s, w, fs, c.y1);
}

describe('climbing the towers (M3-57a)', () => {
  it('runs lines up dozens of towers, many over 80 m, with broken floors and vantage ledges', () => {
    const tall = [...lines.values()].filter(fs => height(fs) > 80);
    expect(lines.size).toBeGreaterThan(40);
    expect(tall.length).toBeGreaterThan(15);
    expect(w.features.filter(f => f.kind === 'vantage').length).toBeGreaterThan(15);
    expect(w.teleports.filter(t => t.name.startsWith('Vantage')).length).toBeGreaterThan(15);
  });
  it('is hard: holds a dyno apart, half the stretches at the longest, rests only at the broken floors', () => {
    for (const fs of lines.values()) {
      const h = holds(fs);
      for (let i = 1; i < h.length; i++) {
        const gap = h[i].y - h[i - 1].y;
        // A dyno is at most 2 m; out of a floor (or off a block's roof) a jump and a grab, 2.4 m.
        expect(gap, `${h[i - 1].kind} to ${h[i].kind}`).toBeLessThanOrEqual(['rest', 'routeTop'].includes(h[i - 1].kind) ? 2.45 : 2.01);
      }
      expect(h.filter((f, i) => i > 0 && f.kind === 'route' && h[i - 1].kind === 'route' && f.y - h[i - 1].y > 1.95).length).toBeGreaterThan(2);
    }
  });
  it('a bot climbs three towers over 80 m from the street, up a pole and the generated holds', { timeout: 240000 }, () => {
    const tall = [...lines.values()].filter(fs => height(fs) > 80).map(holds).sort((a, b) => a[0].x - b[0].x);
    const results = tall.slice(0, 6).map(climb);
    expect(results.filter(r => r.ok).length, JSON.stringify(results)).toBeGreaterThanOrEqual(3);
  });
});
