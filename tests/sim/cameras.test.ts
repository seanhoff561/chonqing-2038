// M4-07: cameras. Fixed, sweeping and lamppost cameras with their cones and ranges from data (SENSES); a sweeper
// pans 45 degrees either side, 10 s a pass. Walking through a cone engages; timing the sweep gets past. The city has
// them everywhere (U-038).
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { teleport } from '../../src/sim/player';
import { getWorld } from '../../src/world/build';
import { SENSES, SWEEP } from '../../src/data/units';
import { SCALE } from '../../src/sim/clock';
import type { Camera } from '../../src/world/world';

/** One camera 4 m up at the origin looking +z; a wall 3 m high along z = 10 with a 3 m gap at x = 0 if `wall`. */
function watched(kind: Camera['kind'], wall: boolean) {
  const walls = wall ? [solid(-30, 0, 10, -1.5, 3, 10.3), solid(1.5, 0, 10, 30, 3, 10.3)] : [];
  const { world, state } = setup([floor(0, 200), ...walls], { x: -6, y: 0, z: 12, yaw: 0 }, { cameras: [{ kind, x: 0, y: 4, z: 0, yaw: 0 }] });
  state.time = 12 * 3600; state.flags.clear = true;
  return { world, state, cam: state.units[0] };
}

/** Walk (jog) 12 m along z = 12 across its view; the most aware it got. */
function walkAcross(w: ReturnType<typeof watched>) {
  teleport(w.state.player, -6, 0, 12);
  let most = 0;
  for (let t = 0; t < secs(4.2); t++) { run(w.state, w.world, 1, { yaw: -Math.PI / 2, my: 1 }); most = Math.max(most, w.cam.aware ?? 0); }
  return most;
}

/** Set a sweeper's pan so it's at k (0..2: +45 at 0, -45 at 1, back to +45 at 2) when he starts walking. */
const panAt = (w: ReturnType<typeof watched>, k: number) => { w.cam.phase = k * SWEEP.pass - w.state.time / SCALE; };

describe('cameras (M4-07)', () => {
  it('has fixed, sweeping and lamppost cameras with their cones and ranges, all over the city', () => {
    expect([SENSES.camera.fov, SENSES.camera.day, SENSES.camera.night]).toEqual([70, 30, 18]);
    expect([SENSES.sweeper.fov, SENSES.lamppost.fov, SENSES.lamppost.day, SENSES.lamppost.night]).toEqual([60, 90, 22, 14]);
    const w = getWorld('yuzhong'), n = (k: string) => w.cameras.filter(c => c.kind === k).length;
    expect(n('lamppost')).toBeGreaterThan(200);
    expect(n('camera')).toBeGreaterThan(40);
    expect(n('sweeper')).toBeGreaterThanOrEqual(4);
  });
  it('engages when he walks through a fixed camera\'s cone', () => {
    const w = watched('camera', false);
    expect(walkAcross(w)).toBeGreaterThanOrEqual(1);
    expect(w.cam.state).toBe('engaged');
    expect(w.state.hive.seen.length).toBe(1);
  });
  it('lets him past a sweeper watching a gap if he times its pan', () => {
    // Pointing at the gap as he crosses it: seen.
    const caught = watched('sweeper', true);
    panAt(caught, 1.32);
    expect(walkAcross(caught)).toBeGreaterThanOrEqual(1);
    // Turned away (40-45 degrees off) as he crosses: never.
    const timed = watched('sweeper', true);
    panAt(timed, 1.8);
    expect(walkAcross(timed)).toBe(0);
    expect(timed.cam.state).toBe('unaware');
  });
  it('sends the nearest unit on its beat to look where a camera saw him', () => {
    const { world, state } = setup([floor(0, 200)], { x: -6, y: 0, z: 12, yaw: 0 }, { cameras: [{ kind: 'camera', x: 0, y: 4, z: 0, yaw: 0 }], patrols: [{ kind: 'street', unit: 'quadruped', pts: [{ x: 0, y: 0, z: -60 }], dwell: [1], hours: [0, 24] }] });
    state.time = 12 * 3600; state.flags.clear = true;
    const cam = state.units.find(u => u.cam !== undefined)!, dog = state.units.find(u => u.kind === 'quadruped')!;
    for (let t = 0; t < secs(4.2) && cam.state === 'unaware'; t++) run(state, world, 1, { yaw: -Math.PI / 2, my: 1 });
    run(state, world, 2);
    expect(cam.state).not.toBe('unaware');
    expect(dog.state).not.toBe('unaware');
    expect(dog.seen).toBeTruthy();
  });
});
