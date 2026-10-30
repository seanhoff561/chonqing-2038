import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { referenceParts } from '../../src/world/sets/reference';
import { run } from './helpers';
import { teleport } from '../../src/sim/player';
import { B, type SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';
import { syncWorld } from '../../src/sim/doors';

const parts = referenceParts();
const block = (id: string) => parts.blocks.find(b => b.id === id)!;

function follow(s: SimState, w: World, pts: { x: number; z: number }[]): boolean {
  for (const pt of pts) {
    let ok = false;
    for (let i = 0; i < 60 * 8 && !ok; i++) {
      const p = s.player, dx = pt.x - p.pos.x, dz = pt.z - p.pos.z;
      if (Math.hypot(dx, dz) < 0.3) ok = true;
      else run(s, w, 1, { my: 1, yaw: Math.atan2(-dx, -dz) });
    }
    if (!ok) return false;
  }
  return true;
}

describe('reference hillside (M3-23)', () => {
  it('has climbable facades and enterable blocks with containers', () => {
    expect(parts.climbables.length).toBeGreaterThan(5);
    // (Loot is scarce, M3-36: a container in one room in five.)
    expect(parts.inter.filter(i => i.kind === 'container').length).toBeGreaterThan(0);
    expect(parts.blocks.filter(b => b.lot?.route).length).toBeGreaterThanOrEqual(3);
  });
  it('runs a rooftop route across three brick low-rises', () => {
    const w = getWorld('reference'), s = createState(1, w);
    const route = ['F2', 'F3', 'F4'].map(block), z = -129.5;
    teleport(s.player, route[0].x0 + 3.6, route[0].roof + 0.1, z);
    const yaw = -Math.PI / 2;
    run(s, w, 10, { yaw });
    let crossed = 0;
    for (let i = 0; i < 60 * 10 && crossed < 2; i++) {
      const p = s.player, cur = route[crossed], next = route[crossed + 1];
      const jump = p.onGround && p.pos.x > cur.x1 - 0.5 && p.pos.x < cur.x1;
      run(s, w, 1, { my: 1, yaw, buttons: B.SPRINT | (jump || !p.onGround ? B.JUMP : 0), pressed: jump ? B.JUMP : 0 });
      if (p.onGround && p.pos.x > next.x0 + 0.3) crossed++;
    }
    expect(crossed).toBe(2);
    expect(s.player.pos.y).toBeGreaterThan(route[2].roof - 0.5);
    expect(s.dead).toBeFalsy();
  });
  it('walks from the vantage roof down the stairwell and out to the street', () => {
    const w = getWorld('reference'), s = createState(1, w);
    expect(s.player.pos.y).toBeGreaterThan(32.9);
    const down = [...block('V').lot!.route!].reverse();
    // (Its roof and street doors locked, M3-36: opened for the walk.)
    for (const it of w.inter) if (it.kind === 'door' && down.some(q => Math.hypot(q.x - it.x, q.z - it.z) < 2.5 && Math.abs(q.y + 1.1 - it.y) < 1.5)) s.wstate.open[it.id] = true;
    syncWorld(s, w);
    teleport(s.player, down[0].x, down[0].y + 0.05, down[0].z);
    run(s, w, 10);
    expect(follow(s, w, down.slice(1))).toBe(true);
    expect(s.player.pos.y).toBeLessThan(0.1);
    expect(s.dead).toBeFalsy();
  });
});
