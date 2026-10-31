// M4-22: tracking tags (DESIGN section 6). A quadruped after him that can see him out past its prod's reach fires
// its tag launcher every 6 s, sticking a tracking tag to his clothes three times in five; the tag stays until he finds
// it with an SDR dongle and picks it off (3 s).
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, LMB } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { TAG } from '../../src/data/units';
import { makeRng } from '../../src/sim/rng';
import type { SimState } from '../../src/sim/types';

/** He stands on a 2.5 m block a quadruped can't get up; it's 8 m off, after him. */
function upOnABlock() {
  const { world, state } = setup([floor(0, 100), solid(-2, 0, -2, 2, 2.5, 2)], { x: 0, y: 2.5, z: 0, yaw: 0 }, {
    patrols: [{ kind: 'street', unit: 'quadruped', pts: [{ x: 0, y: 0, z: -10 }, { x: 0, y: 0, z: -10.01 }], dwell: [600, 600], hours: [0, 24] }],
  });
  state.time = 12 * 3600; state.flags.clear = true; state.flags.god = true;
  const dog = state.units[0];
  dog.aware = 1.5;
  return { world, state, dog };
}
const pops = (s: SimState) => s.events.filter(e => e.t === 'noise' && e.kind === 'tag').length;

describe('tracking tags (M4-22)', () => {
  it('fires its launcher every 6 s at him out of its reach, and a tag sticks and stays', () => {
    const t = upOnABlock();
    // (Looking about, it has him in sight now and then: never more than a shot every 6 s.)
    const at: number[] = [];
    let stuck = -1;
    for (let i = 0; i < secs(40); i++) { run(t.state, t.world, 1); if (pops(t.state)) at.push(i / 60); if (stuck < 0 && t.state.player.tag) stuck = i; }
    expect(at.length).toBeGreaterThanOrEqual(3);
    for (let k = 1; k < at.length; k++) expect(at[k] - at[k - 1]).toBeGreaterThanOrEqual(TAG.every - 0.01);
    expect(stuck).toBeGreaterThanOrEqual(0);
    expect(t.state.body.hp).toBe(100);
    // It stays: a minute on, out of its sight, still there.
    t.state.player.pos.x = 50;
    run(t.state, t.world, secs(60));
    expect(t.state.player.tag).toBe(true);
  });
  it('sticks three times in five', () => {
    let tagged = 0;
    for (let k = 0; k < 60; k++) {
      const t = upOnABlock();
      t.state.rng = makeRng(k + 1);
      for (let i = 0; i < secs(1.5); i++) { run(t.state, t.world, 1); if (pops(t.state)) break; }
      if (t.state.player.tag) tagged++;
    }
    expect(tagged / 60).toBeGreaterThan(TAG.chance - 0.17);
    expect(tagged / 60).toBeLessThan(TAG.chance + 0.17);
  });
  it('is found and picked off with an SDR dongle in 3 s', () => {
    const t = upOnABlock();
    t.state.units.length = 0;
    addItem(t.state, t.state.inv.pack, 'sdr', 1);
    t.state.inv.hotbar[0] = t.state.inv.pack.items.find(i => i.id === 'sdr')!.uid; t.state.inv.held = 1;
    // Nothing on him: it says so.
    run(t.state, t.world, 1, { pressed: LMB, buttons: LMB });
    expect(t.state.task).toBeNull();
    t.state.player.tag = true;
    run(t.state, t.world, 1, { pressed: LMB, buttons: LMB });
    expect(t.state.task?.id).toBe('untag');
    run(t.state, t.world, secs(TAG.remove - 0.2));
    expect(t.state.player.tag).toBe(true);
    run(t.state, t.world, secs(0.3));
    expect(t.state.player.tag).toBe(false);
  });
});
