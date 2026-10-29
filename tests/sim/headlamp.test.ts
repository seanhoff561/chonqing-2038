// U-019: the headlamp works: H cycles off, white, red with one in the backpack; it drains (white 8 h, red 24 h),
// dies at empty, a battery pack recharges it, and it goes off when he sleeps.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, LMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';
import { GAME_PER_TICK } from '../../src/sim/clock';

const lampOf = (s: ReturnType<typeof setup>['state']) => s.inv.pack.items.find(i => i.id === 'headlamp')!;

describe('headlamp (U-019)', () => {
  it('needs a headlamp in the backpack', () => {
    const { world, state } = setup([floor()]);
    run(state, world, 1, { pressed: B.HEADLAMP });
    expect(state.player.lamp).toBe(0);
    expect(state.events.some(e => e.t === 'msg' && e.text === 'no headlamp')).toBe(true);
  });
  it('H cycles off, white, red, off', () => {
    const { world, state } = setup([floor()]);
    addItem(state, state.inv.pack, 'headlamp');
    const seen: number[] = [];
    for (let i = 0; i < 3; i++) { run(state, world, 1, { pressed: B.HEADLAMP }); seen.push(state.player.lamp); run(state, world, 2); }
    expect(seen).toEqual([1, 2, 0]);
  });
  it('drains: white lasts 8 game hours, red 24, and it dies at empty', () => {
    const { world, state } = setup([floor()]);
    addItem(state, state.inv.pack, 'headlamp');
    run(state, world, 1, { pressed: B.HEADLAMP });
    const hour = Math.round(3600 / GAME_PER_TICK);
    run(state, world, hour);
    expect(lampOf(state).charge).toBeCloseTo(100 - 100 / 8, 0);
    run(state, world, 1, { pressed: B.HEADLAMP });
    const before = lampOf(state).charge!;
    run(state, world, hour);
    expect(before - lampOf(state).charge!).toBeCloseTo(100 / 24, 0);
    lampOf(state).charge = 0.001;
    run(state, world, secs(1));
    expect(state.player.lamp).toBe(0);
    run(state, world, 1, { pressed: B.HEADLAMP });
    expect(state.player.lamp).toBe(0);
  });
  it('a battery pack recharges it', () => {
    const { world, state } = setup([floor()]);
    addItem(state, state.inv.pack, 'headlamp', 1, { charge: 0 });
    addItem(state, state.inv.pack, 'battpack');
    state.inv.hotbar[0] = state.inv.pack.items.find(i => i.id === 'battpack')!.uid;
    state.inv.held = 1;
    run(state, world, 1, { pressed: LMB, buttons: LMB });
    expect(lampOf(state).charge).toBe(100);
    expect(state.inv.pack.items.some(i => i.id === 'battpack')).toBe(false);
  });
  it('goes off when he sleeps', () => {
    const { world, state } = setup([floor()]);
    addItem(state, state.inv.pack, 'headlamp');
    run(state, world, 1, { pressed: B.HEADLAMP });
    state.body.energy = 10;
    run(state, world, 1, { cmds: [{ c: 'act', name: 'sleep', arg: 2 }] } as never);
    expect(state.player.lamp).toBe(0);
  });
});
