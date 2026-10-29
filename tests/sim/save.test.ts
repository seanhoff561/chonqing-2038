import { describe, it, expect } from 'vitest';
import { buildHideoutScene } from '../../src/world/sets/hideout-scene';
import { createState, step, stateHash } from '../../src/sim/sim';
import { furnish } from '../../src/sim/run';
import { writeSave, readSave, deleteSave, type Storage } from '../../src/sim/save';
import { syncWorld } from '../../src/sim/doors';
import { emptyInput } from '../../src/sim/types';

const shim = (): Storage => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k) }; };

describe('ironman save', () => {
  it('a save/load round trip is identical and the loaded run carries on the same', () => {
    const w = buildHideoutScene();
    const s = createState(11, w);
    furnish(s, w);
    for (let i = 0; i < 300; i++) step(s, w, { ...emptyInput(), my: 1, yaw: -1.5 });
    const st = shim();
    writeSave(st, 'hideout', s);
    const f = readSave(st)!;
    expect(f.scenario).toBe('hideout');
    expect(stateHash(f.state)).toBe(stateHash(s));
    syncWorld(f.state, w);
    for (let i = 0; i < 300; i++) { const inp = { ...emptyInput(), my: 1, yaw: -1.4 }; step(s, w, inp); step(f.state, w, { ...inp }); }
    expect(stateHash(f.state)).toBe(stateHash(s));
  });
  it('a missing or corrupt save reads as none; delete removes it', () => {
    const st = shim();
    expect(readSave(st)).toBeNull();
    st.setItem('cq2038.save', '{broken');
    expect(readSave(st)).toBeNull();
    const w = buildHideoutScene();
    writeSave(st, 'hideout', createState(1, w));
    deleteSave(st);
    expect(readSave(st)).toBeNull();
  });
});
