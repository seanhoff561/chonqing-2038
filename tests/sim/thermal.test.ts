// M4-06: thermal sight at night. Within its thermal range a thermal unit sees his heat whatever the light: a tenth
// of it under a mylar blanket, three tenths wet, none deep in water.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, LMB } from './helpers';
import { B } from '../../src/sim/types';
import { addItem } from '../../src/sim/inventory';
import { visibility } from '../../src/sim/perception';

/** A drone 12 m up and 18 m off, its cone pitched down at him, by night; him crouched and still in the dark, off its
 *  searchlight's spot. */
function overhead() {
  const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [{ kind: 'drone', unit: 'drone', pts: [{ x: 6, y: 12.1, z: -18 }], dwell: [1], hours: [0, 24] }] });
  state.time = 1 * 3600; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
  run(state, world, secs(1), { buttons: B.CROUCH });
  return { world, state, u: state.units[0] };
}

describe('thermal sight at night (M4-06)', () => {
  it('lets a drone see him crouched in the dark by his heat, and not under a mylar blanket', () => {
    const a = overhead();
    const at = { x: 6, y: 12.1, z: -18, yaw: 0, active: true };
    expect(a.state.player.posture).toBe('crouch');
    const bare = visibility(a.state, a.world, 'drone', at);
    expect(bare).toBeGreaterThan(0.04);
    run(a.state, a.world, secs(4), { buttons: B.CROUCH });
    expect(a.u.aware!).toBeGreaterThan(0.3);
    // The same, wrapped in the blanket.
    const b = overhead();
    addItem(b.state, b.state.inv.pack, 'mylar', 1);
    const m = b.state.inv.pack.items.find(i => i.id === 'mylar')!;
    b.state.inv.hotbar[0] = m.uid; b.state.inv.held = 1;
    run(b.state, b.world, 1, { pressed: LMB, buttons: LMB | B.CROUCH });
    expect(b.state.player.mylar).toBe(true);
    expect(visibility(b.state, b.world, 'drone', at)).toBeLessThan(0.04);
    run(b.state, b.world, secs(20), { buttons: B.CROUCH });
    expect(b.u.aware ?? 0).toBe(0);
  });
  it('shows less heat wet, and none to a unit without thermal sight', () => {
    const a = overhead(), at = { x: 6, y: 12.1, z: -18, yaw: 0, active: true }, dry = visibility(a.state, a.world, 'drone', at);
    a.state.player.wetUntil = a.state.tick + 1000;
    expect(visibility(a.state, a.world, 'drone', at)).toBeCloseTo(dry * 0.3, 5);
    // A humanoid's infrared, not heat: 0.3 at most.
    const h = visibility(a.state, a.world, 'humanoid', { x: 0, y: 0, z: -10, yaw: 0, active: true });
    expect(h).toBeLessThan(0.15);
  });
});
