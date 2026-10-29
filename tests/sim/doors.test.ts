import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';

/** A wall across z = -3 with a 1 m doorway filled by a door solid (the last solid). */
function doorway(key?: string) {
  const solids = [floor(), solid(-10, 0, -3.1, -0.5, 3, -2.9), solid(0.5, 0, -3.1, 10, 3, -2.9), solid(-0.5, 2.2, -3.1, 0.5, 3, -2.9), solid(-0.5, 0, -3.05, 0.5, 2.2, -2.95)];
  return setup(solids, { x: 0, y: 0, z: -1.5, yaw: 0 }, {
    inter: [{ id: 'd1', kind: 'door', x: 0, y: 1.1, z: -3, r: 0.6, zh: '门', en: 'Door', data: { solid: 4, key } }],
  });
}

describe('doors', () => {
  it('open and close with E; collision follows', () => {
    const { world, state } = doorway();
    run(state, world, secs(1), { my: 1 });
    expect(state.player.pos.z).toBeGreaterThan(-3);
    run(state, world, 1, { pressed: B.INTERACT });
    expect(state.wstate.open.d1).toBe(true);
    run(state, world, secs(0.6), { my: 1 });
    expect(state.player.pos.z).toBeLessThan(-3.6);
    state.player.yaw = Math.PI;
    run(state, world, 1, { pressed: B.INTERACT, yaw: Math.PI });
    expect(state.wstate.open.d1).toBe(false);
    run(state, world, secs(1.5), { my: 1, yaw: Math.PI });
    expect(state.player.pos.z).toBeLessThan(-3);
  });
  it('a locked door refuses without its key and opens with it', () => {
    const { world, state } = doorway('policecard');
    run(state, world, 3);
    run(state, world, 1, { pressed: B.INTERACT });
    expect(state.wstate.open.d1).toBeFalsy();
    expect(state.events.some(e => e.t === 'msg' && e.text === 'locked')).toBe(true);
    addItem(state, state.inv.pack, 'policecard');
    run(state, world, 1, { pressed: B.INTERACT });
    expect(state.wstate.open.d1).toBe(true);
  });
});
