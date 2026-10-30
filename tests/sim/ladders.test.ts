// M3-65 (U-032): every ladder can be climbed, wall behind it or not: it stands on its own frame. A free-standing
// ladder up to a deck is climbed hand over hand and pulled over; every ladder in Yuzhong has something behind it.
import { describe, it, expect } from 'vitest';
import { solid, raycast } from '../../src/world/geom';
import { getWorld } from '../../src/world/build';
import { setup, floor, run, secs, aim, LMB, RMB } from './helpers';

describe('ladders (M3-65)', () => {
  it('climbs a ladder with nothing behind it up onto a deck', () => {
    // A deck 6 m up, the ladder at its edge over open ground.
    const { state, world } = setup([floor(), solid(-2, 5.8, -9, 2, 6, -3)], { x: 0, y: 0, z: -2.3, yaw: 0 }, { climbables: [{ kind: 'ladder', x: 0, z: -2.95, y0: 0, y1: 6.3, nx: 0, nz: 1 }] });
    run(state, world, 3);
    const bits = [LMB, RMB];
    let hand = 0;
    for (let step = 0; step < 24 && (state.player.mode !== 'ground' || step === 0); step++) {
      const p = state.player, holding = p.hands.reduce((a, h, i) => a | (h.grip ? bits[i] : 0), 0);
      aim(state, 0, Math.min(6.25, p.pos.y + 2.2), -2.87);
      run(state, world, 2, { buttons: holding | bits[hand] });
      run(state, world, secs(1), { buttons: bits[hand], my: 1 });
      hand = 1 - hand;
      if (p.mode === 'action') run(state, world, secs(1));
    }
    expect(state.player.mode).toBe('ground');
    expect(state.player.pos.y).toBeGreaterThan(5.9);
  });

  it('backs every ladder in Yuzhong', { timeout: 60000 }, () => {
    const w = getWorld('yuzhong'), ladders = w.climbables.filter(c => c.kind === 'ladder');
    expect(ladders.length).toBeGreaterThan(20);
    // From where his feet would be on it, toward it: something there at a third and two thirds of its height.
    const bare = ladders.filter(c => [1 / 3, 2 / 3].some(t => !raycast(w.index, c.x + c.nx * 0.45, c.y0 + (c.y1 - c.y0) * t, c.z + c.nz * 0.45, -c.nx, 0, -c.nz, 0.6)));
    expect(bare.length).toBe(0);
  });
});
