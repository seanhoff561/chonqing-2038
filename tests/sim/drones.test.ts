// M4-08: patrol drones and their docks. A drone flies its beat at altitude on a 6-minute battery, out from its
// rooftop dock and home again, then charges 2 minutes: a gap in its cover he can learn. By night its searchlight
// lights a spot.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { getWorld } from '../../src/world/build';
import { unitPose } from '../../src/sim/units';
import { DRONE } from '../../src/data/units';
import { SCALE } from '../../src/sim/clock';
import { B } from '../../src/sim/types';

/** A drone circling over him at 20 m, its dock 60 m off on a roof, by night; him crouched in the open. */
function circling() {
  const loop = [0, 1, 2, 3, 4, 5].map(k => ({ x: Math.cos(k) * 15, y: 20, z: Math.sin(k) * 15 }));
  const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [{ kind: 'drone', unit: 'drone', pts: loop, dwell: loop.map(() => 0), hours: [0, 24], dock: 0 }], docks: [{ x: 60, y: 18, z: 0 }] });
  state.time = 23 * 3600; state.flags.clear = true;
  return { world, state, u: state.units[0] };
}

describe('patrol drones and docks (M4-08)', () => {
  it('flies 6 minutes from its dock and back, then charges 2 on it', () => {
    const { world, state, u } = circling();
    let docked = 0, out = 0, run0 = -1, longest = 0, cur = 0;
    for (let t = 0; t < DRONE.flight + DRONE.charge; t += 1) {
      const p = unitPose(world, u, state.time + t * SCALE);
      if (p.docked) { docked++; cur++; longest = Math.max(longest, cur); expect(Math.hypot(p.x - 60, p.z)).toBeLessThan(0.01); } else { out++; cur = 0; if (run0 < 0) run0 = t; }
    }
    expect(docked).toBeGreaterThanOrEqual(DRONE.charge - 1);
    expect(docked).toBeLessThanOrEqual(DRONE.charge + 1);
    expect(longest).toBeGreaterThanOrEqual(DRONE.charge - 2);
    expect(out).toBeGreaterThanOrEqual(DRONE.flight - 1);
  });
  it('leaves a gap in its cover while it charges', () => {
    const { world, state, u } = circling();
    // Find when it docks next, and when it's over its beat.
    let dockAt = -1, flyAt = -1;
    for (let t = 0; t < DRONE.flight + DRONE.charge && (dockAt < 0 || flyAt < 0); t++) {
      const p = unitPose(world, u, state.time + t * SCALE);
      if (p.docked && dockAt < 0) dockAt = t;
      if (!p.docked && Math.hypot(p.x, p.z) < 16 && flyAt < 0 && t > 30) flyAt = t;
    }
    // Crouched in the open under its beat while it charges: nothing.
    const a = circling();
    a.state.time += (dockAt + 5) * SCALE;
    run(a.state, a.world, secs(60), { buttons: B.CROUCH });
    expect(unitPose(a.world, a.u, a.state.time).docked).toBe(true);
    expect(a.u.aware ?? 0).toBe(0);
    // Standing still out there while it's flying its beat: seen in under a minute.
    const b = circling();
    // (Kept alive: once it has him, the dock's hunters come and shoot, M4-18.)
    b.state.flags.god = true;
    b.state.time += flyAt * SCALE;
    run(b.state, b.world, secs(50));
    expect(b.u.aware ?? 0).toBeGreaterThan(0.3);
    // And standing still there while it charges: still nothing.
    const c = circling();
    c.state.time += (dockAt + 5) * SCALE;
    run(c.state, c.world, secs(50));
    expect(c.u.aware ?? 0).toBe(0);
  });
  it("docks the city's drones on rooftops", () => {
    const w = getWorld('yuzhong'), drones = w.patrols.filter(p => p.kind === 'drone');
    expect(drones.length).toBeGreaterThanOrEqual(3);
    for (const p of drones) {
      expect(p.dock).toBeDefined();
      const d = w.docks[p.dock!], roof = w.plots.find(q => Math.abs(q.top + 2.3 - d.y) < 0.01);
      expect(roof).toBeTruthy();
    }
  });
});
