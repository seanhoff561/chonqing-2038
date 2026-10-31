// M4-03: seeing him (DESIGN section 5). Visibility: five body points in a unit's cone with clear sight, the light on
// him (night-vision floors), posture, motion, falloff and weather; awareness climbs at 2.5 x visibility a second.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';
import { visibility, bodyPoints } from '../../src/sim/perception';
import type { UnitKind } from '../../src/data/units';
import type { Solid } from '../../src/world/geom';

/** A unit of a kind standing d metres from him, looking at him; and the world it's in. */
function watched(kind: UnitKind, d: number, hour: number, more: Solid[] = []) {
  const { world, state } = setup([floor(), ...more], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [{ kind: 'street', unit: kind, pts: [{ x: 0, y: 0, z: -d }], dwell: [1], hours: [0, 24] }] });
  state.time = hour * 3600;
  state.weather = { fog: 0, rain: 0 };
  return { world, state, unit: state.units[0] };
}

/** Seconds until the unit is fully aware of him (or the limit). */
function spotted(st: ReturnType<typeof watched>, limit: number, input = {}) {
  const { world, state, unit } = st;
  for (let t = 0; t < secs(limit); t++) {
    run(state, world, 1, input);
    state.weather = { fog: 0, rain: 0 };
    if ((unit.aware ?? 0) >= 1) return t / 60;
  }
  return Infinity;
}

describe('seeing him (M4-03)', () => {
  it('spots him standing and jogging at 10 m by day in about half a second', () => {
    for (const kind of ['quadruped', 'humanoid'] as const) {
      const st = watched(kind, 10, 12);
      run(st.state, st.world, 10);
      // Jogging across its view.
      const t = spotted(st, 3, { mx: 1 });
      expect(t, kind).toBeGreaterThan(0.3);
      expect(t, kind).toBeLessThan(0.8);
    }
  });
  it('never spots him crouched and still in the dark at 15 m by night', () => {
    const st = watched('humanoid', 15, 1);
    run(st.state, st.world, secs(1), { buttons: B.CROUCH });
    expect(st.state.player.posture).toBe('crouch');
    expect(spotted(st, 30, { buttons: B.CROUCH })).toBe(Infinity);
    expect(st.unit.aware ?? 0).toBe(0);
  });
  it('never spots him behind a wall', () => {
    const st = watched('humanoid', 10, 12, [solid(-6, 0, -6, 6, 4, -5.5)]);
    expect(spotted(st, 10, { mx: 1 })).toBe(Infinity);
    expect(visibility(st.state, st.world, 'humanoid', { x: 0, y: 0, z: -10, yaw: 0, active: true })).toBe(0);
  });
  it('sees only inside its cone and range, and him less crouched, crawling or still', () => {
    const st = watched('humanoid', 10, 12), { state, world } = st;
    run(state, world, 10);
    const front = { x: 0, y: 0, z: -10, yaw: 0, active: true }, away = { ...front, yaw: Math.PI }, far = { ...front, z: -45 };
    expect(visibility(state, world, 'humanoid', away)).toBe(0);
    expect(visibility(state, world, 'humanoid', far)).toBe(0);
    const still = visibility(state, world, 'humanoid', front);
    expect(still).toBeGreaterThan(0.3);
    run(state, world, secs(1), { buttons: B.CROUCH });
    expect(visibility(state, world, 'humanoid', front)).toBeLessThan(still * 0.6);
    expect(bodyPoints(state)).toHaveLength(5);
    // Fog cuts its range.
    state.weather = { fog: 0.9, rain: 0 };
    expect(visibility(state, world, 'humanoid', { ...front, z: -25 })).toBe(0);
  });
});
