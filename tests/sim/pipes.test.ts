import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, hspeed, aim, LMB, RMB } from './helpers';
import { solid } from '../../src/world/geom';
import { B, type SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';

function tower(kind: 'pipe' | 'ladder', h: number) {
  const r = setup([floor(), solid(-5, 0, -30, 5, h, -3)], { x: 0, y: 0, z: -2.3, yaw: 0 }, {
    climbables: [{ kind, x: 0, z: -2.95, y0: 0, y1: h, nx: 0, nz: 1 }],
  });
  run(r.state, r.world, 3);
  return r;
}

/** Hand over hand up a pipe or ladder, then pull over the top. Returns endurance spent. */
function climb(state: SimState, world: World, top: number) {
  const bits: number[] = [LMB, RMB];
  let used = 0, hand = 0;
  for (let step = 0; step < 20 && state.player.mode !== 'ground' || step === 0; step++) {
    const p = state.player;
    const y = Math.min(top - 0.05, p.pos.y + 2.2);
    const holding = p.hands.map((h, i) => (h.grip ? bits[i] : 0)).reduce((a, b) => a | b, 0);
    aim(state, 0, y, -2.87);
    const e0 = p.endurance;
    run(state, world, 2, { buttons: holding | bits[hand] });
    run(state, world, secs(1), { buttons: bits[hand], my: 1 });
    used += Math.max(0, e0 - p.endurance);
    hand = 1 - hand;
    if (p.mode === 'action') run(state, world, secs(1));
  }
  return used;
}

describe('pipes and ladders by hand (M1-13)', () => {
  it('climbs a 6 m pipe hand over hand and steps off at the top', () => {
    const { world, state } = tower('pipe', 6);
    climb(state, world, 6);
    expect(state.player.pos.y).toBeCloseTo(6, 2);
    expect(state.player.pos.z).toBeLessThan(-3.1);
  });
  it('climbs a 4 m ladder, using less grip than a pipe', () => {
    const a = tower('ladder', 4);
    const usedLadder = climb(a.state, a.world, 4);
    expect(a.state.player.pos.y).toBeCloseTo(4, 2);
    const b = tower('pipe', 4);
    const usedPipe = climb(b.state, b.world, 4);
    expect(usedLadder).toBeLessThan(usedPipe * 0.7);
  });
});

describe('no running stamina, only grip endurance (M1-16)', () => {
  it('sprints for 30 s without slowing', () => {
    const { world, state } = setup([floor(0, 400)]);
    run(state, world, 3);
    let slow = 0;
    run(state, world, secs(30), { my: 1, buttons: B.SPRINT }, (s, i) => { if (i > 30 && hspeed(s) < 6.9) slow++; });
    expect(slow).toBe(0);
  });
  it('one hand slips in about 16 s, two last about three times longer; endurance refills on the ground', () => {
    const r = setup([floor(), solid(-2, 0, -30, 2, 2.0, -3), solid(-2, 2.0, -30, 2, 6, -3.4)], { x: 0, y: 0, z: -2.55, yaw: 0 });
    run(r.state, r.world, 3);
    const hold = (bits: number) => {
      for (let i = 0; i < 5; i++) { aim(r.state, 0, 1.9, -3); run(r.state, r.world, 1, { buttons: bits }); }
      let t = 0;
      while (r.state.player.mode === 'grip' && t < secs(80)) { run(r.state, r.world, 1, { buttons: bits }); t++; }
      return t / 60;
    };
    const one = hold(LMB);
    expect(one).toBeGreaterThan(14);
    expect(one).toBeLessThan(18);
    expect(r.state.player.exhausted).toBe(true);
    run(r.state, r.world, secs(4));
    expect(r.state.player.endurance).toBe(100);
    const two = hold(LMB | RMB);
    expect(two / one).toBeGreaterThan(2.5);
  });
});
