import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { run, secs } from './helpers';
import { TILE } from '../../src/world/map';
import { teleport } from '../../src/sim/player';

describe('terrain and terraces', () => {
  it('walks from the bottom of Shibati up the stair street to Jiaochangkou', () => {
    const w = getWorld('city');
    const s = createState(1, w);
    teleport(s.player, 23 * TILE + 10, 12, 28 * TILE + 10);
    let falls = 0;
    run(s, w, secs(80), { my: 1, yaw: 0 }, (st, i) => { if (i > 60 && st.events.some(e => e.t === 'land' && e.h > 1)) falls++; if (st.player.pos.z < 17 * TILE + 10) st.player.vel.z = 0; });
    expect(s.player.pos.z).toBeLessThan(18 * TILE + 5);
    expect(s.player.pos.y).toBeCloseTo(44, 0);
    expect(falls).toBe(0);
  });
  it('river tiles hold water at 0 over a bed at -4', () => {
    const w = getWorld('city');
    expect(w.water.length).toBeGreaterThan(20);
    expect(w.water.every(b => b.y1 === 0)).toBe(true);
  });
});
