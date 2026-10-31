// M4-14: convergence and escalation (DESIGN section 5). On contact the machines on the ground within 250 m of his
// last known position run to it, the drones within 400 m fly to it; each dock within 500 m launches a hunter drone at
// once and one more every 20 s while the district is Engaged, three at most; after 45 s Engaged the nearest garage
// sends its squad of two humanoids. Counted over time with him standing in a camera's view.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { alertOf } from '../../src/sim/district';
import { CONVERGE } from '../../src/data/units';
import { SCALE } from '../../src/sim/clock';
import type { Patrol } from '../../src/world/world';
import type { Unit } from '../../src/sim/units';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';

const beat = (unit: 'quadruped' | 'drone', x: number, y = 0): Patrol => ({ kind: unit === 'drone' ? 'drone' : 'street', unit, pts: [{ x, y, z: 0 }, { x: x + 1, y, z: 0 }], dwell: [5, 5], hours: [0, 24] });

describe('convergence and escalation (M4-14)', () => {
  it('sends the machines near him, launches hunters from the docks near him every 20 s up to 3, and a squad after 45 s', () => {
    const { world, state } = setup([floor(0, 1000)], { x: 0, y: 0, z: 12, yaw: 0 }, {
      cameras: [{ kind: 'camera', x: 0, y: 4, z: 0, yaw: 0 }],
      patrols: [beat('quadruped', 200), beat('quadruped', -300), beat('drone', 350, 30), beat('drone', -450, 30)],
      docks: [{ x: 400, y: 20, z: 0 }, { x: -600, y: 20, z: 0 }],
      garages: [{ x: 0, y: 0, z: 300 }, { x: 0, y: 0, z: -700 }],
    });
    state.time = 12 * 3600; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
    const [nearDog, farDog, nearDrone, farDrone] = state.units;
    const hunting = (u: Unit) => u.trip?.kind === 'hunt' && !u.trip.back;
    const out = (f: (u: Unit) => boolean) => state.units.filter(u => f(u) && u.trip).length;
    const hunters = (dock: number) => out(u => u.reserve?.dock === dock), squad = (garage: number) => out(u => u.reserve?.garage === garage);
    expect(state.units.filter(u => u.kind === 'hunter').length).toBe(2 * CONVERGE.perDock);
    // Until the camera has told the network, nothing moves.
    for (let i = 0; i < secs(5) && alertOf(state, 'yuzhong') !== 'engaged'; i++) { expect(hunters(0) + squad(0)).toBe(0); expect(hunting(nearDog)).toBe(false); run(state, world, 1); }
    expect(alertOf(state, 'yuzhong')).toBe('engaged');
    const since = state.hive.districts.yuzhong.since, at = () => (state.time - since) / SCALE;
    run(state, world, 7);
    expect(hunting(nearDog), 'quadruped 200 m off').toBe(true);
    expect(hunting(farDog), 'quadruped 300 m off').toBe(false);
    expect(hunting(nearDrone), 'drone 350 m off').toBe(true);
    expect(hunting(farDrone), 'drone 450 m off').toBe(false);
    expect([hunters(0), hunters(1)]).toEqual([1, 0]);
    // One more hunter every 20 s, three at most; the squad at 45 s, from the nearer garage.
    const counts: [number, number, number][] = [];
    while (at() < 70) { run(state, world, 6); counts.push([at(), hunters(0), squad(0)]); }
    const when = (n: number, k: 1 | 2) => counts.find(c => c[k] >= n)![0];
    expect(when(2, 1)).toBeGreaterThan(CONVERGE.every - 0.2);
    expect(when(2, 1)).toBeLessThan(CONVERGE.every + 0.3);
    expect(when(3, 1)).toBeGreaterThan(2 * CONVERGE.every - 0.2);
    expect(when(3, 1)).toBeLessThan(2 * CONVERGE.every + 0.3);
    expect(Math.max(...counts.map(c => c[1]))).toBe(CONVERGE.perDock);
    expect(when(2, 2)).toBeGreaterThan(CONVERGE.squadAfter - 0.2);
    expect(when(2, 2)).toBeLessThan(CONVERGE.squadAfter + 0.3);
    expect(hunters(1)).toBe(0);
    expect(squad(1)).toBe(0);
    // The quadruped got to him and the hunters are over him.
    const dog = nearDog.trip!.pos;
    expect(Math.hypot(dog.x, dog.z - 12)).toBeLessThan(15);
    expect(state.units.some(u => u.reserve?.dock === 0 && u.trip && Math.hypot(u.trip.pos.x, u.trip.pos.z - 12) < 3)).toBe(true);
  });
  it('keeps three hunters on each of the city\'s docks and a squad in each district\'s garage, none by the hideout', () => {
    const w = getWorld('yuzhong'), s = createState(1, w), home = w.teleports.find(t => t.name.startsWith("Friends' hideout"))!;
    expect(w.garages.length).toBe(6);
    for (const g of w.garages) expect(Math.hypot(g.x - home.x, g.z - home.z)).toBeGreaterThan(150);
    expect(s.units.filter(u => u.kind === 'hunter' && u.reserve?.dock !== undefined).length).toBe(w.docks.length * CONVERGE.perDock);
    expect(s.units.filter(u => u.kind === 'humanoid' && u.reserve?.garage !== undefined).length).toBe(w.garages.length * CONVERGE.squad);
  });
});
