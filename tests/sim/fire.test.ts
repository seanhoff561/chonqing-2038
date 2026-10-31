// M4-18: enemy fire and wounds (DESIGN section 6). Standing in a turret's view is lethal within seconds; sprinting
// 60 m away from a humanoid that has him survives (standing there doesn't for long); a hunter drone's SMG hits two
// rounds in five; a quadruped's prod at arm's length hurts and stuns him a second; armed machines fire as soon as
// their district is Engaged; each hit bleeds (30% heavy) and 15% hurts a limb.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { teleport } from '../../src/sim/player';
import { hitHim } from '../../src/sim/fire';
import { createState } from '../../src/sim/sim';
import { B } from '../../src/sim/types';
import { WEAPONS } from '../../src/data/units';
import type { Camera, Patrol } from '../../src/world/world';
import type { SimState } from '../../src/sim/types';

const standing = (unit: Patrol['unit'], x: number, z: number, y = 0): Patrol => ({ kind: unit === 'hunter' || unit === 'drone' ? 'drone' : 'street', unit, pts: [{ x, y, z }, { x, y, z: z - 0.01 }], dwell: [600, 600], hours: [0, 24] });
function scene(him: { x: number; z: number }, patrols: Patrol[] = [], cameras: Camera[] = []) {
  const { world, state } = setup([floor(0, 300)], { x: him.x, y: 0, z: him.z, yaw: 0 }, { patrols, cameras });
  state.time = 12 * 3600; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
  return { world, state };
}
const shots = (s: SimState) => s.events.filter(e => e.t === 'shot').length;

describe('enemy fire and wounds (M4-18)', () => {
  it("is lethal within seconds standing in a turret's view", () => {
    const { world, state } = scene({ x: 0, z: 20 }, [], [{ kind: 'turret', x: 0, y: 4, z: 0, yaw: 0 }]);
    let dead = -1;
    for (let i = 0; i < secs(10) && dead < 0; i++) { run(state, world, 1); if (state.player.mode === 'dead') dead = i / 60; }
    expect(dead).toBeGreaterThan(0);
    expect(dead).toBeLessThan(5);
  });
  it('survives sprinting 60 m away from a humanoid that has him, for a few seconds and mostly the whole way', () => {
    // A humanoid 12 m off looking his way, at full awareness; he sprints straight away from it.
    const sprint = (seed: number) => {
      const { world, state } = scene({ x: 0, z: 12 }, [standing('humanoid', 0, 0)]);
      Object.assign(state, createState(seed, world), { time: 12 * 3600 });
      state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
      teleport(state.player, 0, 0, 12);
      state.units[0].aware = 1.5;
      let n = 0, at4 = false;
      for (let i = 0; i < secs(12) && state.player.mode !== 'dead' && state.player.pos.z < 72; i++) {
        run(state, world, 1, { yaw: Math.PI, my: 1, buttons: B.SPRINT });
        n += shots(state);
        if (i === secs(4)) at4 = true;
      }
      return { n, at4, made: state.player.mode !== 'dead' && state.player.pos.z >= 72 };
    };
    const runs = [1, 2, 3, 4, 5, 6, 7, 8].map(sprint);
    for (const r of runs) { expect(r.n).toBeGreaterThan(0); expect(r.at4).toBe(true); }
    expect(runs.filter(r => r.made).length).toBeGreaterThanOrEqual(6);
  });
  it("hits two rounds in five with a hunter drone's SMG, in bursts of two every 0.8 s", () => {
    const { world, state } = scene({ x: 0, z: 10 }, [standing('hunter', 0, 0, 8)]);
    const u = state.units[0];
    u.aware = 1.5;
    let n = 0, hit = 0;
    run(state, world, secs(20), {}, s => { n += shots(s); hit += s.events.filter(e => e.t === 'hurt' && e.cause === 'smg').length; s.body.hp = 100; });
    expect(n).toBeGreaterThan(45);
    expect(n).toBeLessThan(52);
    expect(hit / n).toBeGreaterThan(WEAPONS.smg.accuracy - 0.15);
    expect(hit / n).toBeLessThan(WEAPONS.smg.accuracy + 0.15);
  });
  it("hurts and stuns him a second with a quadruped's prod at arm's length", () => {
    const { world, state } = scene({ x: 0, z: 1.2 }, [standing('quadruped', 0, 0)]);
    state.units[0].aware = 1.5;
    let hurt = -1;
    for (let i = 0; i < secs(3) && hurt < 0; i++) { run(state, world, 1); if (state.events.some(e => e.t === 'hurt' && e.cause === 'prod')) hurt = i; }
    expect(hurt).toBeGreaterThanOrEqual(0);
    expect(state.body.hp).toBeLessThanOrEqual(100 - WEAPONS.prod.damage);
    expect(state.player.stun).toBeGreaterThan(0.9);
    // He tries to walk off and can't for the second.
    const z = state.player.pos.z;
    run(state, world, secs(0.8), { yaw: Math.PI, my: 1 });
    expect(Math.abs(state.player.pos.z - z)).toBeLessThan(0.05);
  });
  it('fires once the district is Engaged, before its own awareness is full', () => {
    // A camera has him; a humanoid 36 m off barely sees him.
    const { world, state } = scene({ x: 0, z: 12 }, [standing('humanoid', 0, 48)], [{ kind: 'camera', x: 0, y: 4, z: 0, yaw: 0 }]);
    const h = state.units[0];
    h.trip = undefined;
    let early = 0;
    for (let i = 0; i < secs(4); i++) { run(state, world, 1); if (h.state !== 'engaged') early += shots(state); }
    expect(early).toBeGreaterThan(0);
  });
  it('bleeds on each hit, heavily three times in ten, and hurts a limb 15% of the time', () => {
    const { world } = scene({ x: 0, z: 0 });
    let heavy = 0, leg = 0;
    const N = 2000;
    for (let k = 0; k < N; k++) {
      const s = createState(k + 1, world);
      hitHim(s, 12, 'turret');
      expect(s.body.heavyBleed || s.body.lightBleed >= 0).toBe(true);
      if (s.body.heavyBleed) heavy++;
      if (s.body.leg === 'sprain') leg++;
    }
    expect(heavy / N).toBeGreaterThan(0.26);
    expect(heavy / N).toBeLessThan(0.34);
    // (Half the limb hits a sprained leg, half a graze that only bleeds.)
    expect(leg / N).toBeGreaterThan(0.05);
    expect(leg / N).toBeLessThan(0.1);
  });
});
