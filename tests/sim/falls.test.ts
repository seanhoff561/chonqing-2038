import { describe, it, expect } from 'vitest';
import { setup, run, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { B, type SimEvent } from '../../src/sim/types';
import { fallOutcome } from '../../src/sim/move';
import { MAT } from '../../src/world/mats';
import { propBoxes } from '../../src/world/yuzhong/dressing';

/** Walk off a ledge of height h onto the floor; optionally press crouch just before landing. */
function drop(h: number, roll: boolean) {
  const { world, state } = setup([solid(-5, -1, -30, 5, 0, 30), solid(-5, 0, -2, 5, h, 10)], { x: 0, y: h, z: 0, yaw: 0 });
  const lands: SimEvent[] = [];
  let pressed = false;
  for (let i = 0; i < secs(5); i++) {
    const near = !state.player.onGround && state.player.pos.y < 0.6 && state.player.vel.y < 0;
    const press = roll && near && !pressed;
    if (press) pressed = true;
    run(state, world, 1, { my: 1, pressed: press ? B.CROUCH : 0 });
    lands.push(...state.events.filter(e => e.t === 'land' && e.h > 1));
  }
  return lands[0] as Extract<SimEvent, { t: 'land' }>;
}

describe('falls and rolls', () => {
  it('3.5 m: nothing', () => {
    const e = drop(3.5, false);
    expect(e.h).toBeCloseTo(3.5, 1);
    expect(e.outcome).toEqual({ damage: 0, sprain: false, fracture: false, arm: false, lethal: false });
  });
  it('6.5 m: damage without a roll, nothing with one', () => {
    const a = drop(6.5, false);
    expect(a.roll).toBe(false);
    expect(a.outcome.damage).toBeCloseTo(20, 0);
    const b = drop(6.5, true);
    expect(b.roll).toBe(true);
    expect(b.outcome.damage).toBe(0);
    expect(b.outcome.sprain).toBe(false);
  });
  it('9 m: a broken bone and heavy damage', () => {
    const e = drop(9, false);
    expect(e.outcome.fracture).toBe(true);
    expect(e.outcome.damage).toBeCloseTo(50, 0);
  });
  it('13 m: lethal even with a roll', () => {
    expect(drop(13, true).outcome.lethal).toBe(true);
  });
  it('outcome table edges', () => {
    const r = () => 0;
    expect(fallOutcome(4, false, r).damage).toBe(0);
    expect(fallOutcome(7, true, r).damage).toBe(0);
    expect(fallOutcome(9, true, r).damage).toBeCloseTo(16);
    expect(fallOutcome(11, true, r).fracture).toBe(true);
    expect(fallOutcome(12.5, false, r).lethal).toBe(true);
  });
});

describe('soft landings (U-024)', () => {
  /** Walk off a ledge of height h onto a 0.6 m heap of the given material spread out below it. */
  const onto = (h: number, mat: number) => {
    const { world, state } = setup([solid(-5, -1, -30, 5, 0, 30), solid(-5, 0, -2, 5, h, 10), solid(-2, 0, -12, 2, 0.6, -2, mat)], { x: 0, y: h, z: 0, yaw: 0 });
    for (let i = 0; i < secs(5); i++) {
      run(state, world, 1, { my: i < 60 ? 1 : 0 });
      const e = state.events.find(e => e.t === 'land' && e.h > 1);
      if (e) return e as Extract<SimEvent, { t: 'land' }>;
    }
    throw new Error('never landed');
  };
  it('bags, bins and awnings take half the drop: 8 m onto bags is a 4 m fall, no harm', () => {
    const hard = onto(8.5, MAT.concrete), soft = onto(8.5, MAT.soft), awning = onto(8.5, MAT.cloth);
    expect(hard.h).toBeGreaterThan(7.5);
    expect(soft.h).toBeCloseTo(hard.h / 2, 1);
    expect(awning.h).toBeCloseTo(hard.h / 2, 1);
    expect(hard.outcome.damage).toBeGreaterThan(0);
    expect(soft.outcome.damage).toBe(0);
  });
  it('every soft kind of prop lands soft: bags, bins, cardboard and tarps', () => {
    for (const kind of ['bags', 'bin', 'boxes', 'tarp']) {
      const boxes = propBoxes({ kind, x: 0, y: 0, z: -4, yaw: 0 });
      expect(boxes.length, kind).toBeGreaterThan(0);
      for (const b of boxes) expect(b.mat, kind).toBe(MAT.soft);
    }
    expect(onto(8.5, MAT.soft).outcome.damage).toBe(0);
  });
});
