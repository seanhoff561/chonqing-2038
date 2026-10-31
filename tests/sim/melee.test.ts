// M4-20: the knife, the crowbar and takedowns (DESIGN section 6). One knife blow downs a patrol drone; a crowbar hits
// harder (55) but slower; from behind a quadruped or humanoid that isn't Engaged (within 1.5 m, its rear 120
// degrees) the knife held 2 s shuts it down; let go early and it breaks free, Engaged.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, LMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { isOff } from '../../src/sim/units';
import { MELEE, TAKEDOWN, UNITS, ZONES } from '../../src/data/units';
import type { Patrol } from '../../src/world/world';
import type { SimState } from '../../src/sim/types';

/** A machine standing (or hovering) at z = -d in front of him, facing `face` (0 = toward +z, his way). */
function facing(unit: Patrol['unit'], d: number, y = 0, away = false) {
  const z = -d, beat: Patrol = { kind: unit === 'drone' ? 'drone' : 'street', unit, pts: [{ x: 0, y, z }, { x: 0, y, z: away ? z - 0.01 : z + 0.01 }], dwell: [600, 600], hours: [0, 24] };
  const { world, state } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat] });
  state.time = 12 * 3600; state.flags.clear = true;
  return { world, state, u: state.units[0] };
}
function hold(s: SimState, id: string) {
  addItem(s, s.inv.pack, id, 1);
  s.inv.hotbar[0] = s.inv.pack.items.find(i => i.id === id)!.uid; s.inv.held = 1;
}

describe('knife, crowbar and takedowns (M4-20)', () => {
  it('downs a patrol drone with one knife blow', () => {
    const t = facing('drone', 1.2, 1.5);
    hold(t.state, 'knife');
    t.state.player.pitch = -0.05;
    run(t.state, t.world, 1, { pressed: LMB, buttons: LMB, pitch: -0.05 });
    expect(t.u.dead).toBe(true);
    expect(MELEE.knife.damage).toBeGreaterThanOrEqual(UNITS.drone.hp / ZONES.drone.body);
  });
  it('hits harder with the crowbar but slower, and rings out', () => {
    // A turret at head height 1.4 m in front, facing him: a blow lands on its sensor, whole.
    const { world, state } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { cameras: [{ kind: 'turret', x: 0, y: 1.5, z: -1.4, yaw: 0 }] });
    state.time = 12 * 3600; state.flags.god = true;
    const u = state.units[0];
    hold(state, 'crowbar');
    let noise = 0;
    const swing = () => run(state, world, 1, { pressed: LMB, buttons: LMB }, s => { noise = Math.max(noise, ...s.events.map(e => (e.t === 'noise' ? e.r : 0))); });
    swing();
    expect(u.hp).toBeCloseTo(UNITS.turret.hp - MELEE.crowbar.damage);
    expect(noise).toBe(MELEE.crowbar.noise);
    // Again at once: it hasn't come back yet. After 1.1 s it has.
    run(state, world, secs(0.5));
    swing();
    expect(u.hp).toBeCloseTo(UNITS.turret.hp - MELEE.crowbar.damage);
    run(state, world, secs(0.7));
    swing();
    expect(u.hp).toBeCloseTo(UNITS.turret.hp - 2 * MELEE.crowbar.damage);
    expect(MELEE.crowbar.damage).toBeGreaterThan(MELEE.knife.damage);
  });
  it('takes a humanoid down from behind in 2 s, quietly; let go early and it breaks free', () => {
    // It faces away from him (toward -z), 1 m off.
    const t = facing('humanoid', 1, 0, true);
    hold(t.state, 'knife');
    run(t.state, t.world, 6);
    expect(t.u.state).toBe('unaware');
    let loud = 0;
    run(t.state, t.world, 1, { pressed: LMB, buttons: LMB });
    expect(t.state.task?.id).toBe(`takedown:${t.u.id}`);
    run(t.state, t.world, secs(TAKEDOWN.time - 0.1), { buttons: LMB }, s => { loud = Math.max(loud, ...s.events.map(e => (e.t === 'noise' ? e.r : 0))); });
    expect(t.u.shut).toBeFalsy();
    run(t.state, t.world, secs(0.2), { buttons: LMB }, s => { loud = Math.max(loud, ...s.events.map(e => (e.t === 'noise' ? e.r : 0))); });
    expect(t.u.shut).toBe(true);
    expect(isOff(t.state, t.u)).toBe(true);
    expect(loud).toBeLessThanOrEqual(TAKEDOWN.noise);
    // Let go a second in: free, and it has him.
    const b = facing('quadruped', 1, 0, true);
    hold(b.state, 'knife');
    run(b.state, b.world, 6);
    run(b.state, b.world, 1, { pressed: LMB, buttons: LMB });
    run(b.state, b.world, secs(1), { buttons: LMB });
    run(b.state, b.world, 2);
    expect(b.state.task).toBeNull();
    expect(b.u.shut).toBeFalsy();
    expect(isOff(b.state, b.u)).toBe(false);
    run(b.state, b.world, 2);
    expect(b.u.state).toBe('engaged');
  });
  it('is just a blow from the front, or on one that is Engaged', () => {
    // Facing him: no takedown, a blow to its armour.
    const t = facing('humanoid', 1);
    hold(t.state, 'knife');
    run(t.state, t.world, 1, { pressed: LMB, buttons: LMB, pitch: -0.3 });
    expect(t.state.task).toBeNull();
    expect(t.u.hp).toBeCloseTo(UNITS.humanoid.hp - MELEE.knife.damage * ZONES.humanoid.body);
    // From behind but Engaged.
    const b = facing('humanoid', 1, 0, true);
    hold(b.state, 'knife');
    b.u.aware = 1.5; b.u.state = 'engaged';
    run(b.state, b.world, 1, { pressed: LMB, buttons: LMB, pitch: -0.3 });
    expect(b.state.task).toBeNull();
  });
});
