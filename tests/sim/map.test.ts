import { describe, it, expect } from 'vitest';
import { TYPES, HEIGHTS, MAP_W, MAP_H, LEVELS } from '../../src/data/map';
import { tiles, tileAt, tileAtPos, TILE_TYPES } from '../../src/world/map';

describe('map data', () => {
  it('both layers are 70 x 35 and use only the legend', () => {
    expect(TYPES.length).toBe(MAP_H);
    expect(HEIGHTS.length).toBe(MAP_H);
    for (let r = 0; r < MAP_H; r++) {
      expect(TYPES[r].length, `row ${r}`).toBe(MAP_W);
      expect(HEIGHTS[r].length, `row ${r}`).toBe(MAP_W);
      for (const ch of TYPES[r]) expect(TILE_TYPES.includes(ch), `type ${ch}`).toBe(true);
      for (const ch of HEIGHTS[r]) expect(LEVELS.includes(ch), `level ${ch}`).toBe(true);
    }
  });
  it('parses tiles with height and district; water sits at 0 and banks above it', () => {
    expect(tiles().length).toBe(MAP_W * MAP_H);
    for (const t of tiles()) {
      if (t.type === '~') expect(t.h).toBe(0);
      if (t.type === 'b') expect(t.h).toBeGreaterThan(0);
    }
    const shibati = tileAt(23, 24)!;
    expect(shibati.type).toBe('s');
    expect(shibati.district).toBe('shibati');
    expect(tileAtPos(23 * 20 + 5, 16 * 20 + 5)!.district).toBe('jiaochangkou');
    expect(tileAt(-1, 0)).toBeNull();
  });
});
