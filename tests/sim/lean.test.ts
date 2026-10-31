// M4-21b: leaning round a corner with Q and E (U-032). His eye and aim go 0.4 m out to the side, never through a
// wall; his head and shoulders show out there too. A machine round a corner can be shot leaning and not standing.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, LMB, RMB } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { eyeOf, LEAN } from '../../src/sim/player';
import { bodyPoints } from '../../src/sim/perception';
import { aimAt } from '../../src/sim/damage';
import { B } from '../../src/sim/types';

describe('leaning (M4-21b)', () => {
  it('leans his eye 0.4 m out with E, back with nothing held, the other way with Q, and not through a wall', () => {
    const { world, state } = setup([floor(0, 50), solid(-0.5, 0, -10, -0.3, 3, 10)], { x: 0, y: 0, z: 0, yaw: 0 });
    run(state, world, secs(1), { buttons: B.LEAN_R });
    // Facing -z, right is +x.
    expect(eyeOf(state.player).x).toBeCloseTo(LEAN.out, 2);
    expect(bodyPoints(state)[0].x).toBeCloseTo(LEAN.out, 2);
    run(state, world, secs(1));
    expect(Math.abs(state.player.lean)).toBeLessThan(0.01);
    // A wall 0.3 m to his left: the lean stops short of it.
    run(state, world, secs(1), { buttons: B.LEAN_L });
    expect(state.player.lean).toBeLessThan(0);
    expect(eyeOf(state.player).x).toBeGreaterThan(-0.3);
    // Running, no lean.
    run(state, world, secs(1), { buttons: B.LEAN_R | B.SPRINT, my: 1 });
    expect(Math.abs(state.player.lean)).toBeLessThan(0.05);
  });
  it('shoots a camera round a corner leaning, and not standing straight', () => {
    // A wall ending at x = 0.2 just in front of him; past its end, 10 m on and a little to the right, a camera looking away.
    const { world, state } = setup([floor(0, 50), solid(-5, 0, -1.2, 0.2, 3, -1)], { x: 0, y: 0, z: 0, yaw: 0 }, { cameras: [{ kind: 'camera', x: 0.75, y: 1.55, z: -10, yaw: Math.PI }] });
    state.time = 12 * 3600; state.flags.god = true;
    addItem(state, state.inv.pack, 'pistol', 1, { charge: 15 });
    state.inv.hotbar[0] = state.inv.pack.items[0].uid; state.inv.held = 1;
    const cam = state.units[0], yaw = Math.atan2(-0.75, 10);
    run(state, world, 6, { yaw });
    // (It faces away; standing straight, the wall's in his line.)
    expect(aimAt(state, world, 150)).toBeNull();
    // Leaning right, his eye clears the wall's end.
    run(state, world, secs(1), { yaw: Math.atan2(-(0.75 - LEAN.out), 10), buttons: B.LEAN_R | RMB });
    expect(aimAt(state, world, 150)?.u).toBe(cam);
    run(state, world, 1, { yaw: Math.atan2(-(0.75 - LEAN.out), 10), pressed: LMB, buttons: LMB | RMB | B.LEAN_R });
    expect(cam.dead).toBe(true);
  });
});
