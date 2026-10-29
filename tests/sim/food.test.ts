import { describe, it, expect } from 'vitest';
import { setup, run, floor } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { shelfLeft, spoiled, eat } from '../../src/sim/food';

describe('eating, drinking and spoilage', () => {
  it('eating restores satiety and drinking hydration, leaving an empty bottle', () => {
    const { world, state } = setup([floor()]);
    state.body.satiety = 50; state.body.hydration = 50;
    addItem(state, state.inv.pack, 'luncheon');
    addItem(state, state.inv.pack, 'water');
    const [meat, water] = state.inv.pack.items;
    run(state, world, 1, { cmds: [{ c: 'use', uid: meat.uid }, { c: 'use', uid: water.uid }] } as never);
    expect(state.body.satiety).toBeCloseTo(90, 0);
    expect(state.body.hydration).toBeCloseTo(66, 0);
    expect(state.inv.pack.items.map(i => i.id)).toEqual(['bottle']);
  });
  it('bread spoils after 3 days; noodles keep', () => {
    const { state } = setup([floor()]);
    addItem(state, state.inv.pack, 'bread');
    addItem(state, state.inv.pack, 'noodles');
    const [bread, noodles] = state.inv.pack.items;
    expect(shelfLeft(state, bread)).toBeCloseTo(3);
    state.time += 3.5 * 86400;
    expect(spoiled(state, bread)).toBe(true);
    expect(spoiled(state, noodles)).toBe(false);
  });
  it('spoiled bread makes him sick for 12 game hours, with vomiting', () => {
    const { state } = setup([floor()]);
    addItem(state, state.inv.pack, 'bread', 1, { made: state.time - 5 * 86400 });
    eat(state, state.inv.pack.items[0]);
    expect(state.body.sickUntil - state.time).toBeCloseTo(12 * 3600);
    const { world } = setup([floor()]);
    let vomits = 0;
    for (let i = 0; i < 12 * 90 * 60; i += 60) {
      run(state, world, 60, {}, st => { vomits += st.events.filter(e => e.t === 'msg' && e.text === 'vomit').length; });
    }
    expect(vomits).toBeGreaterThanOrEqual(3);
    expect(state.time).toBeGreaterThan(state.body.sickUntil - 1);
  });
});
