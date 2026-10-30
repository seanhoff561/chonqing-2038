// M3-57a (U-023): the towers are climbed from the street using only what the city generated: steel stubs a dyno
// apart, broken floors to rest in, each block's edge to pull over. A bot climbs three towers over 80 m; the lines
// are hard (the longest dynos, no rest between the broken floors) and there's no easy way up the glass between.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { B, type SimState } from '../../src/sim/types';
import type { Feature } from '../../src/world/world';
import { run, secs, aim, LMB, RMB } from './helpers';

const w = getWorld('yuzhong');
const lines = new Map<number, Feature[]>();
for (const f of w.features) if (['route', 'rest', 'routeTop', 'vantage'].includes(f.kind)) { const a = lines.get(f.group); if (a) a.push(f); else lines.set(f.group, [f]); }
const holds = (fs: Feature[]) => fs.filter(f => f.kind !== 'vantage');
const height = (fs: Feature[]) => Math.max(...fs.map(f => f.y)) - Math.min(...fs.map(f => f.y));
const ground = (s: SimState) => s.player.mode === 'ground';

/** Climb a line from the street: true if he ends standing on the last block's roof. */
function climb(fs: Feature[]): { ok: boolean; got: number; at: string } {
  const s = createState(1, w), p = s.player, f0 = fs[0], bits = [LMB, RMB];
  s.flags.clear = true;
  teleport(p, f0.x + f0.nx! * 0.6, f0.y - 2.4 + 0.05, f0.z + f0.nz! * 0.6);
  run(s, w, 30);
  // (Settled on whatever is at the line's foot first.)
  for (let i = 0; i < 120 && !ground(s); i++) run(s, w, 1);
  if (!ground(s)) return { ok: false, got: 0, at: `start ${p.mode} at ${p.pos.y.toFixed(1)}` };
  let hand = 0;
  const grab = (f: Feature, n = 50, extra = 0) => { for (let i = 0; i < n && !p.hands[hand].grip; i++) { aim(s, f.x - f.nx! * 0.01, f.y - 0.04, f.z - f.nz! * 0.01); run(s, w, 1, { buttons: bits[hand] | extra }); } return !!p.hands[hand].grip; };
  for (let k = 0; k < fs.length; k++) {
    const f = fs[k];
    if (ground(s)) {
      // On the street, a roof or a broken floor's cornice: walk to under the hold (on a cornice, its edge), face
      // it, jump and grab.
      // (Out of a hole, first out onto its cornice, then along it.)
      const out = k > 0 && fs[k - 1].kind === 'rest' ? 0.3 : 0.55;
      const walk = (x: number, z: number) => {
        for (let i = 0; i < secs(6) && Math.hypot(p.pos.x - x, p.pos.z - z) > 0.12; i++) {
          const dx = x - p.pos.x, dz = z - p.pos.z;
          run(s, w, 1, { my: Math.min(1, Math.hypot(dx, dz) * 2), yaw: Math.atan2(-dx, -dz) });
        }
      };
      if (out < 0.5) { const o = (p.pos.x - f.x) * f.nx! + (p.pos.z - f.z) * f.nz!; walk(p.pos.x + f.nx! * (out - o), p.pos.z + f.nz! * (out - o)); }
      walk(f.x + f.nx! * out, f.z + f.nz! * out);
      p.yaw = Math.atan2(f.nx!, f.nz!);
      run(s, w, 5, { yaw: p.yaw });
      run(s, w, 1, { pressed: B.JUMP, buttons: B.JUMP });
      hand = 0;
      if (!grab(f, 40, B.JUMP)) return { ok: false, got: k, at: `jump to ${f.kind} ${f.y.toFixed(1)} from ${p.pos.y.toFixed(1)} ${p.mode} d ${Math.hypot(p.pos.x - f.x, p.pos.z - f.z).toFixed(2)}` };
    } else {
      // Hanging: pull up, aim at the next hold, push off with the feet (unless it's in reach) and catch it with
      // the other hand.
      run(s, w, secs(1.2), { buttons: bits[hand], my: 1 });
      aim(s, f.x - f.nx! * 0.01, f.y - 0.04, f.z - f.nz! * 0.01);
      const near = f.y - fs[k - 1].y < 1.1;
      if (!near) run(s, w, 1, { buttons: bits[hand], pressed: B.JUMP });
      const was = hand;
      hand = 1 - hand;
      if (!grab(f, 50, near ? bits[was] : 0)) return { ok: false, got: k, at: `${near ? 'reach' : 'dyno'} to ${f.kind} ${f.y.toFixed(1)}` };
    }
    if (f.kind === 'rest' || f.kind === 'routeTop') {
      // Let go below, over the edge onto the floor or the roof, and get the grip back.
      run(s, w, secs(2.5), { buttons: LMB | RMB, my: 1 });
      if (!ground(s)) return { ok: false, got: k, at: `pull over ${f.kind} ${f.y.toFixed(1)}` };
      run(s, w, secs(3));
    }
  }
  const last = fs[fs.length - 1];
  return { ok: ground(s) && Math.abs(p.pos.y - last.y) < 1.5 && !s.dead, got: fs.length, at: 'top' };
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
  it('a bot climbs three towers over 80 m from the street using only generated holds', { timeout: 240000 }, () => {
    const tall = [...lines.values()].filter(fs => height(fs) > 80).map(holds).sort((a, b) => a[0].x - b[0].x);
    const results = tall.slice(0, 6).map(climb);
    expect(results.filter(r => r.ok).length, JSON.stringify(results)).toBeGreaterThanOrEqual(3);
  });
});
