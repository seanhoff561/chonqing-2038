// M4-16: the wind-down. The search ends 150 s after the last contact and the searchers go back; the district is then
// Heightened until 06:00: half as many walkers again on its beats, its idle cameras on, its machines' awareness
// climbing 1.3 times as fast. After 06:00 it's all as it was.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { teleport } from '../../src/sim/player';
import { alertOf } from '../../src/sim/district';
import { unitPose } from '../../src/sim/units';
import { SIGHT } from '../../src/data/units';
import type { Patrol } from '../../src/world/world';

const beat = (x: number, z: number): Patrol => ({ kind: 'street', unit: 'quadruped', pts: [{ x, y: 0, z }, { x, y: 0, z: z + 20 }], dwell: [5, 5], hours: [0, 24] });

describe('wind-down and the Heightened district (M4-16)', () => {
  it('ends the search at 150 s, then keeps the district Heightened until 06:00 with more walkers, every camera on, awareness x1.3', () => {
    const { world, state } = setup([floor(0, 600)], { x: 0, y: 0, z: 12, yaw: 0 }, {
      cameras: [{ kind: 'camera', x: 0, y: 4, z: 0, yaw: 0 }, { kind: 'camera', x: 100, y: 4, z: 100, yaw: 0, dark: true }],
      patrols: [beat(-150, 0), beat(400, 0)],
    });
    state.time = 12 * 3600; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
    const [dog, , cam, dark] = state.units, extra = state.units.find(u => u.extra)!;
    const pose = (u: typeof dog) => unitPose(world, u, state.time), alert = () => alertOf(state, 'yuzhong');
    expect(extra.patrol).toBe(1);
    expect(pose(extra).active).toBe(false);
    expect(pose(dark).active).toBe(false);
    // His first moment in the camera's view, normally.
    const climb = () => { teleport(state.player, 0, 0, 12); const a = cam.aware ?? 0; run(state, world, 12); return (cam.aware ?? 0) - a; };
    const normal = climb();
    for (let i = 0; i < secs(5) && alert() !== 'engaged'; i++) run(state, world, 1);
    expect(alert()).toBe('engaged');
    teleport(state.player, -300, 0, 300);
    // The quadruped 150 m off comes and searches; at 150 s the search ends and it goes back.
    let searchedAt = -1, endedAt = -1;
    for (let i = 0; i < secs(200) && endedAt < 0; i++) {
      run(state, world, 1);
      if (searchedAt < 0 && dog.trip?.kind === 'search') searchedAt = i;
      if (alert() === 'heightened') endedAt = i;
    }
    expect(searchedAt).toBeGreaterThan(0);
    const lost = (endedAt / 60) + 0.1;
    expect(lost).toBeGreaterThan(149.5);
    expect(lost).toBeLessThan(150.8);
    run(state, world, secs(30));
    expect(!dog.trip || dog.trip.back).toBe(true);
    // Heightened: the second walker on its beat, the idle camera on, awareness 1.3 times as quick.
    expect(pose(extra).active).toBe(true);
    expect(pose(dark).active).toBe(true);
    expect(cam.aware ?? 0).toBe(0);
    expect(climb() / normal).toBeCloseTo(SIGHT.heightened, 1);
    // After 06:00, as it was.
    teleport(state.player, -300, 0, 300);
    run(state, world, secs(20));
    state.time = state.hive.districts.yuzhong.until + 1;
    run(state, world, secs(2));
    expect(alert()).toBe('unaware');
    expect(pose(dark).active).toBe(false);
    if (!extra.trip) expect(pose(extra).active).toBe(false);
  });
});
