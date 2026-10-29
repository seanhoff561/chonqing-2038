import { describe, it, expect } from 'vitest';
import { setup, run, floor } from './helpers';
import { passTime, limits } from '../../src/sim/body';

describe('hunger, thirst and fatigue', () => {
  it('drain per game hour as designed while awake', () => {
    const { world, state } = setup([floor()]);
    state.time = 20 * 3600; // night: no afternoon heat
    const b = { ...state.body };
    run(state, world, 90 * 60); // one game hour
    expect(b.satiety - state.body.satiety).toBeCloseTo(4, 1);
    expect(b.hydration - state.body.hydration).toBeCloseTo(5, 1);
    expect(b.energy - state.body.energy).toBeCloseTo(5, 1);
  });
  it('afternoon heat speeds thirst, sleep restores energy', () => {
    const { state } = setup([floor()]);
    state.time = 13 * 3600;
    const h = state.body.hydration;
    passTime(state, 1, false);
    expect(h - state.body.hydration).toBeCloseTo(6, 1);
    state.body.energy = 10;
    passTime(state, 4, true);
    expect(state.body.energy).toBeCloseTo(60, 1);
  });
  it('below 20 the body suffers; at 0 it loses health', () => {
    const { state } = setup([floor()]);
    state.body.energy = 10; state.body.hydration = 10;
    const L = limits(state);
    expect(L.sprintScale).toBe(0.8);
    expect(L.regenScale).toBeCloseTo(0.7);
    state.body.satiety = 0; state.body.hydration = 0; state.body.hp = 50;
    state.time = 20 * 3600;
    passTime(state, 2, false);
    expect(state.body.hp).toBeCloseTo(50 - 2 * 2 - 5 * 2, 1);
  });
  it('a game day without food or water empties him', () => {
    const { state } = setup([floor()]);
    for (let i = 0; i < 24; i++) { passTime(state, 1, false); state.time += 3600; }
    expect(state.body.satiety).toBeLessThan(1);
    expect(state.body.hydration).toBe(0);
    expect(state.body.energy).toBe(0);
    expect(state.body.hp).toBeLessThan(100);
  });
});

describe('collapse', () => {
  it('at zero energy he collapses asleep where he stands', () => {
    const { world, state } = setup([floor()]);
    state.body.energy = 0.001;
    const t = state.time;
    run(state, world, 60);
    expect(state.time - t).toBeGreaterThan(3 * 3600);
    expect(state.body.energy).toBeGreaterThanOrEqual(39.9);
  });
});
