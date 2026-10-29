import { describe, it, expect } from 'vitest';
import { setup, run, floor } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { heldStack } from '../../src/sim/use';
import { B } from '../../src/sim/types';

describe('hotbar and held item', () => {
  it('binds, selects with 1-5, empties with 0, and uses with the mouse', () => {
    const { world, state } = setup([floor()]);
    addItem(state, state.inv.pack, 'crowbar');
    addItem(state, state.inv.pack, 'knife');
    const [a, b] = state.inv.pack.items;
    run(state, world, 1, { cmds: [{ c: 'bind', slot: 0, uid: a.uid }, { c: 'bind', slot: 2, uid: b.uid }] } as never);
    run(state, world, 1, { slot: 3 });
    expect(heldStack(state)?.id).toBe('knife');
    run(state, world, 1, { slot: 1 });
    expect(heldStack(state)?.id).toBe('crowbar');
    run(state, world, 1, { pressed: B.USE });
    expect(state.events).toContainEqual({ t: 'use', id: 'crowbar' });
    run(state, world, 1, { slot: 0 });
    expect(heldStack(state)).toBeNull();
    // Rebinding a stack moves it to the new slot.
    run(state, world, 1, { cmds: [{ c: 'bind', slot: 4, uid: a.uid }] } as never);
    expect(state.inv.hotbar[0]).toBeNull();
    expect(state.inv.hotbar[4]).toBe(a.uid);
  });
});
