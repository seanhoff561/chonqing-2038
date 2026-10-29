import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, hspeed, aim, LMB } from './helpers';
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
  it('over 25 kg: no sprint or wall-run, no pulling up, so only lips up to 1.6 m can be mantled', () => {
    const mk = (h: number) => {
      const r = setup([floor(), solid(-5, 0, -30, 5, h, -3)], { x: 0, y: 0, z: -2.55, yaw: 0 });
      addItem(r.state, r.state.inv.pack, 'carbattery');
      addItem(r.state, r.state.inv.pack, 'jerrycan');
      run(r.state, r.world, 3);
      for (let i = 0; i < 5; i++) { aim(r.state, 0, h - 0.1, -3); run(r.state, r.world, 1, { buttons: LMB }); }
      run(r.state, r.world, secs(3), { buttons: LMB, my: 1 });
      return r;
    };
    expect(mk(1.5).state.player.pos.y).toBeCloseTo(1.5, 2);
    expect(mk(2.0).state.player.pos.y).toBeLessThan(1.5);
    const c = setup([floor()]);
    addItem(c.state, c.state.inv.pack, 'carbattery');
    addItem(c.state, c.state.inv.pack, 'jerrycan');
    run(c.state, c.world, 5);
    run(c.state, c.world, secs(2), { my: 1, buttons: B.SPRINT });
    expect(hspeed(c.state)).toBeCloseTo(3.2, 1);
  });
});
