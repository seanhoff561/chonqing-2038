// M4-05: hearing him. A unit hears a noise within its radius times its hearing (a quadruped's x1.5), x0.6 through
// walls; a heard noise sends it to look; a hostile one (a shot) is remembered by the hive.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { teleport } from '../../src/sim/player';
import { B } from '../../src/sim/types';
import { unitPose } from '../../src/sim/units';
import { stepHearing } from '../../src/sim/perception';
import { stepAlert } from '../../src/sim/alert';

/** A quadruped standing at the origin facing away (-z), a wall along x = 3 between it and the street beyond. */
function guarded() {
  const { world, state } = setup([floor(0, 200), solid(3, 0, -30, 3.4, 4, 30)], { x: 10, y: 0, z: -20, yaw: 0 }, { patrols: [{ kind: 'street', unit: 'quadruped', pts: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -0.01 }], dwell: [600, 600], hours: [0, 24] }] });
  state.time = 12 * 3600; state.weather = { fog: 0, rain: 0 };
  return { world, state, u: state.units[0] };
}

/** Run past along the street beyond the wall (x = 10), 40 m, with the given buttons held. */
function pass(g: ReturnType<typeof guarded>, buttons: number, seconds: number) {
  run(g.state, g.world, secs(seconds), { yaw: Math.PI, my: 1, buttons });
}

describe('hearing him (M4-05)', () => {
  it('draws a quadruped behind a wall when he sprints past', () => {
    const g = guarded();
    pass(g, B.SPRINT, 6);
    expect(g.u.state).not.toBe('unaware');
    expect(g.u.seen).toBeTruthy();
    // It goes to look where it heard him.
    const at0 = unitPose(g.world, g.u, g.state.time);
    run(g.state, g.world, secs(3));
    const at1 = unitPose(g.world, g.u, g.state.time);
    expect(Math.hypot(at1.x - at0.x, at1.z - at0.z)).toBeGreaterThan(1);
  });
  it("doesn't hear him crouch past", () => {
    const g = guarded();
    pass(g, B.CROUCH, 25);
    expect(g.state.player.posture).toBe('crouch');
    expect(g.u.state).toBe('unaware');
    expect(g.u.aware ?? 0).toBe(0);
  });
  it('hears farther in the open than through a wall, and remembers a shot', () => {
    const g = guarded();
    teleport(g.state.player, 10, 0, 0);
    // 10 m off through the wall: a jog's 8 m x1.5 = 12, x0.6 through the wall = 7.2: not heard.
    const hear = (st: typeof g.state, wd: typeof g.world, e: { x: number; z: number; r: number; kind: string }) => { st.events.length = 0; st.events.push({ t: 'noise', y: 0, ...e }); stepHearing(st, wd); stepAlert(st, wd); };
    hear(g.state, g.world, { x: 10, z: 0, r: 8, kind: 'step' });
    expect(g.u.state).toBe('unaware');
    // The same jog in the open, nothing between: heard.
    const open = guarded();
    hear(open.state, open.world, { x: -10, z: 0, r: 8, kind: 'step' });
    expect(open.u.state).toBe('suspicious');
    const loud = guarded();
    hear(loud.state, loud.world, { x: 30, z: 0, r: 150, kind: 'pistol' });
    expect(loud.state.hive.seen.length).toBe(1);
    expect(loud.u.state).not.toBe('unaware');
  });
});
