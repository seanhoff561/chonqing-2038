import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, hspeed } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { B } from '../../src/sim/types';

describe('encumbrance', () => {
  it('over 15 kg sprint and jump drop 15%', () => {
    const { world, state } = setup([floor()]);
    addItem(state, state.inv.pack, 'carbattery'); // 15 kg
    addItem(state, state.inv.pack, 'crowbar');
    run(state, world, 5);
    run(state, world, secs(2), { my: 1, buttons: B.SPRINT });
    expect(hspeed(state)).toBeCloseTo(7 * 0.85, 1);
  });
  it('over 25 kg: no sprint, no wall-run or ledge grabs, mantle max 1.6 m', () => {
    const mk = (h: number) => {
      const r = setup([floor(), solid(-5, 0, -10, 5, h, -3)], { x: 0, y: 0, z: -2.4, yaw: 0 });
      addItem(r.state, r.state.inv.pack, 'carbattery');
      addItem(r.state, r.state.inv.pack, 'jerrycan');
      return r;
    };
    const a = mk(1.5);
    run(a.state, a.world, 3);
    run(a.state, a.world, 1, { my: 1, pressed: B.JUMP });
    run(a.state, a.world, secs(1.5), { my: 1 });
    expect(a.state.player.pos.y).toBeCloseTo(1.5, 2);
    const b = mk(2.0);
    run(b.state, b.world, 3);
    run(b.state, b.world, 1, { my: 1, pressed: B.JUMP });
    run(b.state, b.world, secs(1.5), { my: 1 });
    expect(b.state.player.pos.y).toBeLessThan(0.01);
    const c = setup([floor()]);
    addItem(c.state, c.state.inv.pack, 'carbattery');
    addItem(c.state, c.state.inv.pack, 'jerrycan');
    run(c.state, c.world, 5);
    run(c.state, c.world, secs(2), { my: 1, buttons: B.SPRINT });
    expect(hspeed(c.state)).toBeCloseTo(3.2, 1);
  });
});
