import { describe, it, expect } from 'vitest';
import { setup, floor } from './helpers';
import { addItem, fits, moveStack, consume, count, weight, grid, findSpot } from '../../src/sim/inventory';

describe('grid inventory', () => {
  const mk = () => setup([floor()]).state;
  it('starts as an 8x6 backpack and packs items with bounds and overlap checks', () => {
    const s = mk();
    const g = s.inv.pack;
    expect([g.w, g.h]).toEqual([8, 6]);
    expect(addItem(s, g, 'ladder')).toBe(0); // 1x4
    expect(g.items[0]).toMatchObject({ x: 0, y: 0, rot: false });
    expect(fits(g, 'crowbar', 0, 0, false)).toBe(false);
    expect(fits(g, 'crowbar', 1, 0, false)).toBe(true);
    expect(fits(g, 'crowbar', 7, 4, false)).toBe(false); // 1x3 past the bottom
    expect(fits(g, 'crowbar', 5, 7, true)).toBe(false);
  });
  it('rotates items to fit', () => {
    const s = mk();
    const g = grid(4, 2);
    expect(addItem(s, g, 'ladder')).toBe(0); // only fits lying down
    expect(g.items[0].rot).toBe(true);
    const u = g.items[0].uid;
    expect(moveStack(g, g, u, 0, 0, false)).toBe(false);
    expect(moveStack(g, g, u, 0, 1, true)).toBe(true);
  });
  it('stacks stackable items and consumes from stacks', () => {
    const s = mk();
    const g = s.inv.pack;
    addItem(s, g, 'bandage', 6);
    expect(g.items.length).toBe(2);
    expect(count(g, 'bandage')).toBe(6);
    expect(consume(g, 'bandage', 5)).toBe(5);
    expect(count(g, 'bandage')).toBe(1);
    expect(weight(g)).toBeCloseTo(0.05);
  });
  it('rejects items when the bag is full and moves between grids', () => {
    const s = mk();
    const g = grid(2, 2), h = grid(3, 3);
    expect(addItem(s, g, 'grapple')).toBe(0);
    expect(addItem(s, g, 'knife')).toBe(1);
    expect(findSpot(g, 'bandage')).toBeNull();
    const u = g.items[0].uid;
    expect(moveStack(g, h, u, 1, 1, false)).toBe(true);
    expect(g.items.length).toBe(0);
    expect(h.items[0]).toMatchObject({ x: 1, y: 1 });
  });
});
