import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs } from './helpers';
import { B } from '../../src/sim/types';

const world = () => setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, {
  inter: [{ id: 'c1', kind: 'container', x: 0, y: 0.9, z: -1.5, r: 0.5, zh: '柜子', en: 'Cabinet', data: { type: 'cabinet', items: [['noodles', 2]] } }],
});

describe('interaction system', () => {
  it('targets what he looks at within reach', () => {
    const { world: w, state } = world();
    run(state, w, 2, { pitch: -0.3 });
    expect(state.target).toBe('c1');
    run(state, w, 2, { pitch: -0.3, yaw: Math.PI });
    expect(state.target).toBeNull();
  });
  it('hold E searches for the container time, then opens it with its contents', () => {
    const { world: w, state } = world();
    run(state, w, 2, { pitch: -0.3 });
    run(state, w, 1, { pitch: -0.3, buttons: B.INTERACT, pressed: B.INTERACT });
    expect(state.task?.dur).toBe(2.0);
    run(state, w, secs(2.1), { pitch: -0.3, buttons: B.INTERACT });
    expect(state.openContainer).toBe('c1');
    expect(state.containers.c1.items.filter(i => i.id === 'noodles').length).toBe(2);
    expect(state.wstate.searched.c1).toBe(true);
  });
  it('releasing E interrupts; a searched container opens at once', () => {
    const { world: w, state } = world();
    run(state, w, 2, { pitch: -0.3 });
    run(state, w, 1, { pitch: -0.3, buttons: B.INTERACT, pressed: B.INTERACT });
    run(state, w, secs(1), { pitch: -0.3, buttons: B.INTERACT });
    run(state, w, 1, { pitch: -0.3 });
    expect(state.task).toBeNull();
    expect(state.openContainer).toBeNull();
    state.wstate.searched.c1 = true;
    run(state, w, 1, { pitch: -0.3, buttons: B.INTERACT, pressed: B.INTERACT });
    expect(state.openContainer).toBe('c1');
  });
});
