import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs } from './helpers';
import { createState } from '../../src/sim/sim';
import { rollLoot } from '../../src/sim/loot';
import { grid } from '../../src/sim/inventory';
import { loot } from '../../src/data/loot';
import { itemById } from '../../src/data/items';
import { B } from '../../src/sim/types';
import type { Inter } from '../../src/world/world';

const boxes: Inter[] = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, kind: 'container', x: 0, y: 0, z: 0, r: 0.5, zh: '柜', en: 'Cabinet', data: { type: 'cabinet', loot: 'kitchen' } }));

function contents(seed: number) {
  const { world } = setup([floor()]);
  const s = createState(seed, world);
  return boxes.map(b => { s.containers[b.id] = grid(5, 4); rollLoot(s, b); return s.containers[b.id].items.map(i => `${i.id}x${i.n}`).join(','); });
}

describe('loot placement by seed', () => {
  it('the same seed gives the same loot, another seed different loot', () => {
    expect(contents(7)).toEqual(contents(7));
    expect(contents(7)).not.toEqual(contents(8));
    expect(contents(7).filter(c => c === '').length).toBeLessThan(20);
  });
  it('every loot table names real items', () => {
    for (const t of Object.values(loot)) for (const e of t.items) expect(itemById.has(e.id), e.id).toBe(true);
  });
  it('searching takes time and makes a noise by container type', () => {
    const { world, state } = setup([floor()], { x: 0, y: 0, z: 0, yaw: 0 }, { inter: [{ ...boxes[0], y: 0.9, z: -1.5, data: { type: 'locker', loot: 'kitchen' } }] });
    run(state, world, 2, { pitch: -0.3 });
    run(state, world, 1, { pitch: -0.3, buttons: B.INTERACT, pressed: B.INTERACT });
    let noise = 0;
    run(state, world, secs(2.1), { pitch: -0.3, buttons: B.INTERACT }, s => { for (const e of s.events) if (e.t === 'noise' && e.kind === 'search') noise = e.r; });
    expect(noise).toBe(6);
    expect(state.openContainer).toBe('c0');
  });
});
