import { describe, it, expect } from 'vitest';
import { setup, run, floor, LMB } from './helpers';
import { addItem, count } from '../../src/sim/inventory';
import { stashIds, isBench, SHELTER_R } from '../../src/sim/shelter';
import { allInters } from '../../src/sim/interact';
import { writeSave, readSave, type Storage } from '../../src/sim/save';
import { B, type SimState } from '../../src/sim/types';
import type { Inter } from '../../src/world/world';

const bed = (id: string, z: number): Inter => ({ id, kind: 'mattress', x: 0, y: 0.3, z, r: 0.8, zh: '床', en: 'Bed' });
const box = (id: string, x: number, z: number): Inter => ({ id, kind: 'container', x, y: 0.5, z, r: 0.6, zh: '柜', en: 'Cabinet', data: { type: 'cabinet' } });

function hold(state: SimState, id: string) {
  addItem(state, state.inv.pack, id);
  state.inv.hotbar[0] = state.inv.pack.items.find(i => i.id === id)!.uid;
  state.inv.held = 1;
}

describe('setting up a shelter (M3-28, U-013)', () => {
  it('E at a bed claims it; another bed makes a second hideout (U-018), and he sleeps in either', () => {
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, { inter: [bed('a', -1.2), bed('b', 30)] });
    run(state, world, 3, { pitch: -0.6 });
    expect(state.shelters).toEqual([]);
    run(state, world, 1, { pitch: -0.6, pressed: B.INTERACT });
    expect(state.shelters.map(h => h.id)).toEqual(['a']);
    expect(state.events.some(e => e.t === 'sleep-menu')).toBe(true);
    state.player.pos.z = 31.2;
    run(state, world, 3, { pitch: -0.6 });
    run(state, world, 1, { pitch: -0.6, pressed: B.INTERACT });
    expect(state.shelters.map(h => h.id)).toEqual(['a', 'b']);
    expect(state.shelters[1].z).toBe(30);
    for (const z of [31.2, 0]) {
      state.player.pos.z = z;
      state.body.energy = 10;
      run(state, world, 3, { pitch: -0.6 });
      run(state, world, 1, { pitch: -0.6, pressed: B.INTERACT });
      run(state, world, 1, { pitch: -0.6, cmds: [{ c: 'act', name: 'sleep', arg: 4 }] } as never);
      const slept = state.events.find(e => e.t === 'slept');
      expect(slept && slept.t === 'slept' && slept.where, `bed at ${z}`).toBe('bed');
    }
    expect(state.shelters.length).toBe(2);
  });
  it('each hideout keeps its own storage: the containers nearest its bed', () => {
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, { inter: [bed('a', -1.2), bed('b', 22), box('nearA', 3, 2), box('nearB', 3, 18), box('far', 40, 0)] });
    run(state, world, 3, { pitch: -0.6 });
    run(state, world, 1, { pitch: -0.6, pressed: B.INTERACT });
    state.player.pos.z = 23.2;
    run(state, world, 3, { pitch: -0.6 });
    run(state, world, 1, { pitch: -0.6, pressed: B.INTERACT });
    expect(stashIds(state, world, state.shelters[0])).toEqual(['nearA']);
    expect(stashIds(state, world, state.shelters[1])).toEqual(['nearB']);
    // Storage stays put: what goes in one hideout's box is not in the other's.
    addItem(state, (state.containers.nearB = { w: 6, h: 4, items: [] }), 'water', 2);
    expect(count(state.containers.nearB, 'water')).toBe(2);
    expect(state.containers.nearA).toBeUndefined();
    expect(stashIds(state, world)).toEqual(['nearB']);
  });
  it('a carried bedroll goes down on open floor, claims the shelter and sleeps like a bed', () => {
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 });
    hold(state, 'bedroll');
    run(state, world, 3, { pitch: 0.4 });
    run(state, world, 1, { pitch: 0.4, pressed: LMB, buttons: LMB });
    expect(state.placed.length).toBe(0);
    run(state, world, 3, { pitch: -0.9 });
    run(state, world, 1, { pitch: -0.9, pressed: LMB, buttons: LMB });
    expect(state.placed.map(p => p.item)).toEqual(['bedroll']);
    expect(count(state.inv.pack, 'bedroll')).toBe(0);
    expect(state.shelters.map(h => h.id)).toEqual([state.placed[0].id]);
    run(state, world, 3, { pitch: -0.9 });
    run(state, world, 1, { pitch: -0.9, pressed: B.INTERACT });
    expect(state.events.some(e => e.t === 'sleep-menu')).toBe(true);
    state.body.energy = 10;
    run(state, world, 1, { pitch: -0.9, cmds: [{ c: 'act', name: 'sleep', arg: 6 }] } as never);
    const slept = state.events.find(e => e.t === 'slept');
    expect(slept && slept.t === 'slept' && slept.where).toBe('bed');
  });
  it('a toolbox put on a table makes it a workbench', () => {
    const table: Inter = { id: 't', kind: 'table', x: 0, y: 0.78, z: -1.2, r: 0.8, zh: '桌子', en: 'Table' };
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, { inter: [table] });
    hold(state, 'toolbox');
    run(state, world, 3, { pitch: -0.5 });
    run(state, world, 1, { pitch: -0.5, pressed: LMB, buttons: LMB });
    expect(isBench(state, table)).toBe(true);
    expect(count(state.inv.pack, 'toolbox')).toBe(0);
  });
  it('containers within 15 m of the bed are the stash, and a placed crate opens like one', () => {
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, { inter: [bed('a', -1.2), box('near', 8, -1), box('far', SHELTER_R + 5, -1)] });
    run(state, world, 3, { pitch: -0.6 });
    run(state, world, 1, { pitch: -0.6, pressed: B.INTERACT });
    hold(state, 'foldcrate');
    run(state, world, 3, { pitch: -0.9, yaw: Math.PI });
    run(state, world, 1, { pitch: -0.9, yaw: Math.PI, pressed: LMB, buttons: LMB });
    const crate = state.placed.find(p => p.item === 'foldcrate')!;
    expect(stashIds(state, world).sort()).toEqual([crate.id, 'near'].sort());
    run(state, world, 3, { pitch: -0.7, yaw: Math.PI });
    run(state, world, 1, { pitch: -0.7, yaw: Math.PI, pressed: B.INTERACT, buttons: B.INTERACT });
    run(state, world, 170, { pitch: -0.7, yaw: Math.PI, buttons: B.INTERACT });
    expect(state.openContainer).toBe(crate.id);
  });
  it('placed furniture survives a save and load', () => {
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 });
    hold(state, 'mattress');
    run(state, world, 3, { pitch: -0.9 });
    run(state, world, 1, { pitch: -0.9, pressed: LMB, buttons: LMB });
    const m = new Map<string, string>();
    const st: Storage = { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k) };
    writeSave(st, 'run', state);
    const loaded = readSave(st)!.state;
    expect(loaded.placed).toEqual(state.placed);
    expect(loaded.shelters.map(h => h.id)).toEqual([state.placed[0].id]);
    expect(allInters(loaded, world).some(i => i.id === state.placed[0].id && i.kind === 'mattress')).toBe(true);
  });
});
