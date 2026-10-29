import { describe, it, expect } from 'vitest';
import { setup, floor } from './helpers';
import { passTime } from '../../src/sim/body';

describe('natural healing', () => {
  const mk = () => { const { state } = setup([floor()]); state.body.hp = 50; state.time = 20 * 3600; return state; };
  it('+1 HP per game hour awake when fed and watered, +3 asleep', () => {
    const a = mk(); passTime(a, 2, false); expect(a.body.hp).toBeCloseTo(52, 1);
    const b = mk(); passTime(b, 2, true); expect(b.body.hp).toBeCloseTo(56, 1);
  });
  it('no healing while hungry, sick or bleeding', () => {
    const a = mk(); a.body.satiety = 25; passTime(a, 2, false); expect(a.body.hp).toBe(50);
    const b = mk(); b.body.sickUntil = b.time + 10 * 3600; passTime(b, 2, true); expect(b.body.hp).toBe(50);
    const c = mk(); c.body.lightBleed = 0; passTime(c, 1, false); expect(c.body.hp).toBe(50);
  });
});
