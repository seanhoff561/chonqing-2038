// M4-17: silent machines (DESIGN section 5). Switched off or jammed while Suspicious, Engaged or with word pending, a
// machine draws the nearest drone and machine on the ground to look 12 s later; one that knew nothing draws no one.
// Out, it stays where it stopped. A wreck another machine comes across starts a small search (40 m at most) there.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { teleport } from '../../src/sim/player';
import { alertOf } from '../../src/sim/district';
import { unitPose } from '../../src/sim/units';
import { SILENT } from '../../src/sim/silent';
import { SCALE } from '../../src/sim/clock';
import type { Patrol } from '../../src/world/world';

const beat = (unit: 'quadruped' | 'drone', a: [number, number], b: [number, number], y = 0): Patrol => ({ kind: unit === 'drone' ? 'drone' : 'street', unit, pts: [{ x: a[0], y, z: a[1] }, { x: b[0], y, z: b[1] }], dwell: [2, 2], hours: [0, 24] });

function scene() {
  const { world, state } = setup([floor(0, 400)], { x: 0, y: 0, z: -100, yaw: 0 }, {
    cameras: [{ kind: 'camera', x: 0, y: 4, z: 0, yaw: 0 }],
    // (All beyond the 150 m in which the camera itself sends one to look.)
    patrols: [beat('drone', [170, 0], [171, 0], 30), beat('quadruped', [180, 0], [181, 0]), beat('quadruped', [260, 0], [261, 0])],
  });
  state.time = 12 * 3600; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
  const [drone, near, far, cam] = state.units;
  return { world, state, drone, near, far, cam };
}

describe('silent machines (M4-17)', () => {
  it('a camera switched off while Suspicious draws the nearest drone and quadruped 12 s later', () => {
    const t = scene();
    teleport(t.state.player, 0, 0, 12);
    for (let i = 0; i < secs(2) && (t.cam.aware ?? 0) < 0.45; i++) run(t.state, t.world, 1);
    teleport(t.state.player, 0, 0, -100);
    run(t.state, t.world, 6);
    expect(t.cam.state).toBe('suspicious');
    t.cam.off = t.state.time + 60 * SCALE;
    run(t.state, t.world, secs(SILENT.after - 0.3));
    expect([t.drone.trip, t.near.trip]).toEqual([undefined, undefined]);
    run(t.state, t.world, secs(0.5));
    for (const u of [t.drone, t.near]) {
      expect(u.trip?.kind).toBe('look');
      const end = u.trip!.path[u.trip!.path.length - 1];
      expect(Math.hypot(end.x, end.z)).toBeLessThan(1);
      expect(u.state).toBe('suspicious');
    }
    expect(t.far.trip).toBeUndefined();
    run(t.state, t.world, 6);
    expect(alertOf(t.state, 'yuzhong')).toBe('suspicious');
  });
  it('one that knew nothing draws no one; out, a machine stays where it stopped, and back on it knows nothing', () => {
    const t = scene();
    t.near.off = t.state.time + 30 * SCALE;
    run(t.state, t.world, 6);
    const a = unitPose(t.world, t.near, t.state.time);
    run(t.state, t.world, secs(20));
    expect(t.drone.trip).toBeUndefined();
    expect(unitPose(t.world, t.near, t.state.time)).toEqual(a);
    run(t.state, t.world, secs(12));
    expect(t.near.stop).toBeUndefined();
    expect(unitPose(t.world, t.near, t.state.time).active).toBe(true);
  });
  it('a wreck found by a passing machine starts a small search round it', () => {
    const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: -100, yaw: 0 }, {
      patrols: [beat('quadruped', [0, 3], [0, 4]), beat('quadruped', [-40, 6], [40, 6])],
    });
    state.time = 12 * 3600;
    const [dead, passer] = state.units;
    passer.phase = 0;
    dead.dead = true;
    run(state, world, 6);
    expect(dead.stop).toBeDefined();
    let found = -1;
    for (let i = 0; i < secs(60) && found < 0; i++) { run(state, world, 1); if (dead.found) found = i; }
    expect(found).toBeGreaterThan(0);
    const D = state.hive.districts.yuzhong;
    expect(D.state).toBe('searching');
    expect(D.cap).toBe(SILENT.cap);
    expect(Math.hypot(state.hive.lkp!.x - dead.stop!.x, state.hive.lkp!.z - dead.stop!.z)).toBeLessThan(0.01);
    expect(passer.trip?.kind).toBe('hunt');
    // It searches within 40 m of the wreck.
    const ends: { x: number; z: number }[] = [];
    for (let i = 0; i < secs(120); i++) { run(state, world, 1); const t = passer.trip; if (t?.kind === 'search' && !t.back && t.path.length) ends.push(t.path[t.path.length - 1]); }
    expect(ends.length).toBeGreaterThan(0);
    for (const e of ends) expect(Math.hypot(e.x - dead.stop!.x, e.z - dead.stop!.z)).toBeLessThanOrEqual(SILENT.cap + 0.5);
  });
});
