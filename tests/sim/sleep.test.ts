import { describe, it, expect } from 'vitest';
import { setup, run, floor } from './helpers';
import { B } from '../../src/sim/types';
import { dayOf, hourOf } from '../../src/sim/clock';

describe('sleep', () => {
  it('sleeping at the mattress from 22:00 to 06:00 restores energy and advances the day', () => {
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, {
      inter: [{ id: 'm', kind: 'mattress', x: 0, y: 0.3, z: -1.2, r: 0.8, zh: '床垫', en: 'Sleep' }],
    });
    run(state, world, 3, { pitch: -0.6 });
    state.time = 22 * 3600;
    state.body.energy = 20; state.body.hp = 80;
    run(state, world, 1, { pitch: -0.6, pressed: B.INTERACT });
    expect(state.events.some(e => e.t === 'sleep-menu')).toBe(true);
    run(state, world, 1, { pitch: -0.6, cmds: [{ c: 'act', name: 'sleep', arg: 6 }] } as never);
    expect(dayOf(state.time)).toBe(2);
    expect(hourOf(state.time)).toBeCloseTo(6, 1);
    expect(state.body.energy).toBeGreaterThan(99.9);
    expect(state.body.hp).toBeGreaterThan(95);
    expect(state.events.some(e => e.t === 'slept')).toBe(true);
  });

  it('holding E on open floor lays him down to sleep rough: 40% less energy back (U-013)', () => {
    const night = (rough: boolean) => {
      const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, {
        inter: rough ? [] : [{ id: 'm', kind: 'mattress', x: 0, y: 0.3, z: -1.2, r: 0.8, zh: '床垫', en: 'Sleep' }],
      });
      run(state, world, 3, { pitch: -0.6 });
      state.time = 22 * 3600;
      state.body.energy = 10;
      run(state, world, 1, { pitch: -0.6, pressed: B.INTERACT, buttons: B.INTERACT });
      let menu = state.events.some(e => e.t === 'sleep-menu');
      if (rough) {
        expect(menu).toBe(false);
        run(state, world, 80, { pitch: -0.6, buttons: B.INTERACT }, st => { if (st.events.some(e => e.t === 'sleep-menu')) menu = true; });
      }
      expect(menu).toBe(true);
      run(state, world, 1, { pitch: -0.6, cmds: [{ c: 'act', name: 'sleep', arg: 2 }] } as never);
      const slept = state.events.find(e => e.t === 'slept');
      return { energy: state.body.energy, where: slept && slept.t === 'slept' ? slept.where : '' };
    };
    const bed = night(false), rough = night(true);
    expect(bed.where).toBe('bed');
    expect(rough.where).toBe('rough');
    expect(rough.energy - 10).toBeCloseTo((bed.energy - 10) * 0.6, 0);
  });
  it('letting go of E or walking off cancels the rough-sleep hold', () => {
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 });
    run(state, world, 3);
    let menu = false;
    run(state, world, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    run(state, world, 40, { buttons: B.INTERACT, my: 1 }, st => { if (st.events.some(e => e.t === 'sleep-menu')) menu = true; });
    run(state, world, 80, {}, st => { if (st.events.some(e => e.t === 'sleep-menu')) menu = true; });
    expect(menu).toBe(false);
  });
});
