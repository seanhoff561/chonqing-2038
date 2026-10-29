import { describe, it, expect } from 'vitest';
import { items } from '../../src/data/items';

describe('item database', () => {
  it('has unique ids, valid sizes and weights, and bilingual names', () => {
    const ids = new Set<string>();
    for (const i of items) {
      expect(ids.has(i.id), i.id).toBe(false);
      ids.add(i.id);
      expect(i.w >= 1 && i.h >= 1 && i.w * i.h <= 12, i.id).toBe(true);
      expect(i.kg).toBeGreaterThan(0);
      expect(/[一-鿿]/.test(i.zh), i.id).toBe(true);
      expect(i.en.length).toBeGreaterThan(2);
      if (i.food) expect(i.food.shelfDays).toBeGreaterThan(0);
    }
    expect(items.length).toBeGreaterThan(90);
  });
});
