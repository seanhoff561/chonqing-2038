import { describe, it, expect } from 'vitest';
import { dayOf, hourOf, phaseOf, daylight, nextHour, SCALE } from '../../src/sim/clock';
import { setup, run, floor } from './helpers';

describe('game clock', () => {
  it('a game day lasts 36 real minutes and runs start on day 1 at 06:00', () => {
    expect(SCALE).toBe(40);
    const { world, state } = setup([floor()]);
    expect(dayOf(state.time)).toBe(1);
    expect(hourOf(state.time)).toBe(6);
    run(state, world, 90 * 60); // 90 real seconds = 1 game hour
    expect(hourOf(state.time)).toBeCloseTo(7, 3);
  });
  it('phases and daylight', () => {
    const at = (h: number) => h * 3600;
    expect(phaseOf(at(5))).toBe('night');
    expect(phaseOf(at(6))).toBe('dawn');
    expect(phaseOf(at(12))).toBe('day');
    expect(phaseOf(at(19))).toBe('dusk');
    expect(phaseOf(at(23))).toBe('night');
    expect(daylight(at(12))).toBe(1);
    expect(daylight(at(2))).toBe(0);
    expect(daylight(at(6))).toBeCloseTo(0.5);
  });
  it('rolls over days', () => {
    expect(dayOf(86400 * 2 + 10)).toBe(3);
    expect(nextHour(22 * 3600, 6)).toBe(86400 + 6 * 3600);
    expect(nextHour(5 * 3600, 6)).toBe(6 * 3600);
  });
});
