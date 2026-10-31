// M4-19: machines' HP, hit zones and the states hits leave them in (DESIGN section 6): blinded, immobilised, shut
// down, destroyed. Per unit type.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { hurtUnit } from '../../src/sim/damage';
import { unitPose, isOff, type Unit } from '../../src/sim/units';
import { stepHearing } from '../../src/sim/perception';
import { UNITS, ZONES, type UnitKind } from '../../src/data/units';
import type { Camera, Patrol } from '../../src/world/world';

/** A machine of a kind 10 m in front of him (looking at him), at noon. */
function one(kind: UnitKind) {
  const fly = kind === 'drone' || kind === 'hunter', mounted = ['camera', 'sweeper', 'lamppost', 'turret', 'pir', 'tripwire', 'acoustic'].includes(kind);
  const patrols: Patrol[] = mounted ? [] : [{ kind: fly ? 'drone' : 'street', unit: kind, pts: [{ x: 0, y: fly ? 12 : 0, z: 0 }, { x: 0, y: fly ? 12 : 0, z: -30 }], dwell: [600, 5], hours: [0, 24] }];
  const cameras: Camera[] = mounted ? [{ kind: kind as Camera['kind'], x: 0, y: 4, z: 0, yaw: 0, ...(kind === 'tripwire' ? { to: { x: 3, y: 4, z: 0 } } : {}) }] : [];
  const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 10, yaw: 0 }, { patrols, cameras });
  state.time = 12 * 3600; state.flags.clear = true; state.flags.god = true; state.weather = { fog: 0, rain: 0 };
  return { world, state, u: state.units[0] as Unit };
}

describe('machine damage and weak points (M4-19)', () => {
  it('destroys each kind when its HP is gone, hits to the body taking its share', () => {
    for (const kind of Object.keys(UNITS) as UnitKind[]) {
      const t = one(kind), need = UNITS[kind].hp / ZONES[kind].body;
      hurtUnit(t.state, t.world, t.u, 'body', need * 0.99);
      expect(t.u.dead, kind).toBeFalsy();
      expect(t.u.state === 'unaware' && (t.u.aware ?? 0) >= 0.35, `${kind} knows`).toBe(true);
      hurtUnit(t.state, t.world, t.u, 'body', need * 0.02);
      expect(t.u.dead, kind).toBe(true);
      expect(isOff(t.state, t.u)).toBe(true);
    }
    expect([ZONES.drone.body, ZONES.hunter.body, ZONES.quadruped.body, ZONES.humanoid.body, ZONES.turret.body, ZONES.camera.body]).toEqual([1, 0.8, 0.2, 0.1, 0.05, 1]);
  });
  it('downs a drone with a third less through its rotors, and it falls', () => {
    for (const kind of ['drone', 'hunter'] as const) {
      const t = one(kind);
      hurtUnit(t.state, t.world, t.u, 'rotors', UNITS[kind].hp / 1.5 + 0.1);
      expect(t.u.dead).toBe(true);
      run(t.state, t.world, 6);
      expect(unitPose(t.world, t.u, t.state.time).y).toBeCloseTo(0, 1);
    }
  });
  it('blinds a quadruped with 60 to its sensor head: it sees nothing, but still hears', () => {
    const t = one('quadruped');
    hurtUnit(t.state, t.world, t.u, 'head', 59);
    expect(t.u.blind).toBeFalsy();
    hurtUnit(t.state, t.world, t.u, 'head', 2);
    expect(t.u.blind).toBe(true);
    t.u.aware = 0; t.u.state = 'unaware'; t.u.trip = undefined;
    run(t.state, t.world, secs(3));
    expect(t.u.aware ?? 0).toBe(0);
    t.state.events.push({ t: 'noise', x: 0, y: 0, z: 10, r: 16, kind: 'step' });
    stepHearing(t.state, t.world);
    expect(t.u.aware ?? 0).toBeGreaterThanOrEqual(0.35);
    // Its legs take 0.6 of a hit, its belly battery 1.5.
    const a = one('quadruped');
    hurtUnit(a.state, a.world, a.u, 'legs', 100);
    hurtUnit(a.state, a.world, a.u, 'battery', 10);
    expect(a.u.hp).toBeCloseTo(150 - 60 - 15);
  });
  it('slows a humanoid with a knee broken, immobilises it with both (it still shoots), shuts it down at its battery', () => {
    const t = one('humanoid');
    hurtUnit(t.state, t.world, t.u, 'kneeL', 100 / 0.8 + 0.1);
    expect([t.u.limp, t.u.lame]).toEqual([true, undefined]);
    hurtUnit(t.state, t.world, t.u, 'kneeR', 100 / 0.8 + 0.1);
    expect(t.u.lame).toBe(true);
    const at = unitPose(t.world, t.u, t.state.time);
    run(t.state, t.world, secs(6));
    const now = unitPose(t.world, t.u, t.state.time);
    expect(Math.hypot(now.x - at.x, now.z - at.z)).toBeLessThan(0.01);
    expect(now.active).toBe(true);
    let shots = 0;
    run(t.state, t.world, secs(4), {}, s => { shots += s.events.filter(e => e.t === 'shot').length; });
    expect(shots).toBeGreaterThan(0);
    // 120 to its back battery (60 at double) and it's down for good.
    const b = one('humanoid');
    hurtUnit(b.state, b.world, b.u, 'battery', 59);
    expect(b.u.shut).toBeFalsy();
    hurtUnit(b.state, b.world, b.u, 'battery', 1.5);
    expect(b.u.shut).toBe(true);
    expect(b.u.dead).toBeFalsy();
    run(b.state, b.world, secs(60));
    expect(isOff(b.state, b.u)).toBe(true);
    expect(b.u.aware ?? 0).toBeLessThan(0.36);
    // Its head: 75 blinds it.
    const c = one('humanoid');
    hurtUnit(c.state, c.world, c.u, 'head', 75);
    expect(c.u.blind).toBe(true);
  });
  it("blinds a turret with 100 to its sensor: it doesn't fire", () => {
    const t = one('turret');
    hurtUnit(t.state, t.world, t.u, 'head', 100);
    expect(t.u.blind).toBe(true);
    t.u.aware = 1.5; t.u.state = 'engaged';
    let shots = 0;
    run(t.state, t.world, secs(3), {}, s => { shots += s.events.filter(e => e.t === 'shot').length; });
    expect(shots).toBe(0);
  });
  it('destroys a camera with 20 anywhere', () => {
    const t = one('camera');
    hurtUnit(t.state, t.world, t.u, 'lens', 20);
    expect(t.u.dead).toBe(true);
  });
});
