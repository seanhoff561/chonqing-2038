// M4-04: awareness and investigation. Awareness climbs and falls per unit; at 0.3 a unit is Suspicious and walks to
// where it saw him, looks about for 8 s and walks back onto its beat; at 1.0 it's Engaged. Beats shift: each day to
// other timings, and after the hive has seen him somewhere, units passing near go to check the place.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { teleport } from '../../src/sim/player';
import { unitPose, loopOf } from '../../src/sim/units';
import { SCALE } from '../../src/sim/clock';

/** A humanoid pacing between 20 and 30 m from him, starting its loop at the near end, looking his way. */
function pacing() {
  const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [{ kind: 'street', unit: 'humanoid', pts: [{ x: 0, y: 0, z: -20 }, { x: 0, y: 0, z: -30 }], dwell: [5, 5], hours: [0, 24] }] });
  const u = state.units[0], T = loopOf(world, u);
  state.time = 12 * 3600; state.weather = { fog: 0, rain: 0 };
  u.phase = 0.5 - ((state.time / SCALE) % T);
  return { world, state, u };
}

describe('awareness and investigation (M4-04)', () => {
  it('turns Suspicious on a glimpse, walks to where it saw him, looks about 8 s, and goes back onto its beat', () => {
    const { world, state, u } = pacing();
    // A glimpse: under a second standing still in its view at 20 m, then gone well out of its sight.
    run(state, world, secs(0.8));
    expect(u.aware!).toBeGreaterThanOrEqual(0.3);
    expect(u.aware!).toBeLessThan(1);
    teleport(state.player, 90, 0, 90);
    run(state, world, 2);
    expect(u.state).toBe('suspicious');
    const d = () => { const p = unitPose(world, u, state.time); return Math.hypot(p.x, p.z); };
    let arrived = -1, stayed = 0;
    for (let t = 0; t < secs(30); t++) {
      run(state, world, 1);
      if (d() < 1.5) { if (arrived < 0) arrived = t / 60; stayed++; }
    }
    expect(arrived).toBeGreaterThan(5);
    expect(arrived).toBeLessThan(12);
    expect(stayed / 60).toBeGreaterThanOrEqual(7.5);
    // Back on its beat (between its two ends), and not suspicious any more.
    run(state, world, secs(10));
    expect(u.trip).toBeUndefined();
    expect(u.state).toBe('unaware');
    const p = unitPose(world, u, state.time);
    expect(Math.abs(p.x)).toBeLessThan(0.01);
    expect(p.z).toBeLessThanOrEqual(-19.9);
    expect(p.z).toBeGreaterThanOrEqual(-30.1);
  });
  it('turns Engaged when he stays in its view, and the hive remembers where', () => {
    const { world, state, u } = pacing();
    run(state, world, secs(3));
    expect(u.state).toBe('engaged');
    expect(state.hive.seen.length).toBe(1);
    expect(Math.hypot(state.hive.seen[0].x, state.hive.seen[0].z)).toBeLessThan(1);
  });
  it('lets awareness fall away when he is gone', () => {
    const { world, state, u } = pacing();
    run(state, world, secs(0.4));
    const was = u.aware!;
    teleport(state.player, 90, 0, 90);
    run(state, world, secs(1));
    expect(u.aware!).toBeLessThan(was);
  });
  it('shifts beats: other timings each day, and a check of where the hive saw him', () => {
    const { world, state, u } = pacing();
    teleport(state.player, 90, 0, 90);
    const day1 = unitPose(world, u, 10 * 3600), day2 = unitPose(world, u, 34 * 3600), day3 = unitPose(world, u, 58 * 3600);
    expect(Math.abs(day1.z - day2.z) + Math.abs(day2.z - day3.z)).toBeGreaterThan(0.5);
    // The hive saw him 40 m off its beat an hour ago: within a loop or two it goes to look.
    state.hive.seen.push({ x: 40, y: 0, z: -25, t: state.time - 3600 });
    let went = false;
    for (let t = 0; t < secs(3 * loopOf(world, u) + 60) && !went; t++) { run(state, world, 1); const p = unitPose(world, u, state.time); went = Math.hypot(p.x - 40, p.z + 25) < 2; }
    expect(went).toBe(true);
  });
});
