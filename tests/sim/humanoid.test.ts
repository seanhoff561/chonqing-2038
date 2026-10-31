// M4-10 (U-031): humanoids. 2.5 m/s walking, 4.5 running, stairs only (no jumps), armoured and armed; and they hunt
// him like soldiers: calling each other, coming round from the sides, getting behind cover, going through the
// hiding places where he was one by one.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { solid } from '../../src/world/geom';
import { teleport } from '../../src/sim/player';
import { unitPose } from '../../src/sim/units';
import { UNITS } from '../../src/data/units';
import { NAV } from '../../src/world/world';
import { navPath } from '../../src/sim/nav';
import { getWorld } from '../../src/world/build';
import { raycast } from '../../src/world/geom';
import type { Patrol, HideSpot } from '../../src/world/world';
import type { Solid } from '../../src/world/geom';

const post = (x: number, z: number, yaw = 0): Patrol => ({ kind: 'street', unit: 'humanoid', pts: [{ x, y: 0, z }, { x: x + Math.sin(yaw) * 0.01, y: 0, z: z + Math.cos(yaw) * 0.01 }], dwell: [600, 600], hours: [0, 24] });
function world(patrols: Patrol[], more: Solid[] = [], hides: HideSpot[] = []) {
  const { world, state } = setup([floor(0, 300), ...more], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols, hides });
  state.time = 12 * 3600; state.flags.clear = true;
  return { world, state };
}
const at = (g: ReturnType<typeof world>, i: number) => unitPose(g.world, g.state.units[i], g.state.time);

describe('humanoids (M4-10)', () => {
  it('walks at 2.5 m/s to look and runs at 4.5 fighting him; stairs but no jumps; armoured and armed', () => {
    expect([UNITS.humanoid.patrol, UNITS.humanoid.chase, UNITS.humanoid.hp, UNITS.humanoid.armour, UNITS.humanoid.weapon]).toEqual([2.5, 4.5, 300, 0.1, 'rifle']);
    for (const [aware, speed] of [[0.4, 2.5], [1.2, 4.5]] as const) {
      const g = world([post(0, -60)]), u = g.state.units[0];
      teleport(g.state.player, 0, 0, 200);
      Object.assign(u, { aware, seen: { x: 0, y: 0, z: 40 } });
      run(g.state, g.world, secs(1));
      const a = at(g, 0);
      run(g.state, g.world, secs(4));
      const b = at(g, 0);
      expect(Math.hypot(b.x - a.x, b.z - a.z) / 4).toBeCloseTo(speed, 1);
    }
    const w = getWorld('yuzhong'), T = (n: string) => w.teleports.find(t => t.name === n)!;
    const p = navPath(w.nav!, { x: T('Shibati bottom').x, y: T('Shibati bottom').y - 1.5, z: T('Shibati bottom').z }, { x: T('Shibati top').x, y: T('Shibati top').y - 1.5, z: T('Shibati top').z }, 'humanoid')!;
    expect(p.kinds.includes(NAV.stairs)).toBe(true);
    expect(p.kinds.includes(NAV.jump)).toBe(false);
  });
  it('calls the others near it when it notices him', () => {
    // One facing him 20 m off, one 40 m from it facing away.
    const g = world([post(0, -20), post(40, -20, Math.PI)]);
    let called = false;
    for (let t = 0; t < secs(3) && g.state.units[1].state === 'unaware'; t++) run(g.state, g.world, 1, {}, s => { if (s.events.some(e => e.t === 'call')) called = true; });
    expect(g.state.units[0].state).not.toBe('unaware');
    expect(called).toBe(true);
    expect(g.state.units[1].state).not.toBe('unaware');
    expect(Math.hypot(g.state.units[1].seen!.x, g.state.units[1].seen!.z)).toBeLessThan(1);
  });
  it('comes round from a side when another is already making for the place', () => {
    const g = world([post(0, -40), post(2, -40)]), [a, b] = g.state.units;
    teleport(g.state.player, 0, 0, 200);
    Object.assign(a, { aware: 0.4, seen: { x: 0, y: 0, z: 0 } });
    run(g.state, g.world, 2);
    Object.assign(b, { aware: 0.4, seen: { x: 0, y: 0, z: 0 } });
    run(g.state, g.world, 2);
    // Off the straight line from where it was to the place by 4 m or more on the way.
    let off = 0;
    for (let t = 0; t < secs(14); t++) { run(g.state, g.world, 1); const p = at(g, 1); off = Math.max(off, Math.abs(p.x - 2 + (p.z + 40) * (2 / 40))); }
    expect(off).toBeGreaterThan(4);
  });
  it('goes through the hiding places where he was, one by one', () => {
    const box = (x: number, z: number, id: number): HideSpot => ({ id, kind: 'crate', inner: { x0: x - 0.4, y0: 0, z0: z - 0.4, x1: x + 0.4, y1: 0.8, z1: z + 0.4 } });
    const spots = [[5, 3], [-6, 4], [2, -7]];
    const g = world([post(0, -40)], [], spots.map(([x, z], i) => box(x, z, i))), u = g.state.units[0];
    teleport(g.state.player, 0, 0, 200);
    Object.assign(u, { aware: 0.4, seen: { x: 0, y: 0, z: 0 } });
    const near = spots.map(() => false);
    for (let t = 0; t < secs(80); t++) { run(g.state, g.world, 1); const p = at(g, 0); spots.forEach(([x, z], i) => { if (Math.hypot(p.x - x, p.z - z) < 1.3) near[i] = true; }); }
    expect(near).toEqual([true, true, true]);
    expect(u.trip).toBeUndefined();
  });
  it('gets behind cover where it can still see him', () => {
    // A low wall 1.2 m high to its side between it and him; him in the open 25 m off.
    const g = world([post(0, -25)], [solid(2, 0, -21, 6, 1.2, -20.6)]), u = g.state.units[0];
    run(g.state, g.world, secs(4));
    expect(u.state).toBe('engaged');
    run(g.state, g.world, secs(6));
    const p = at(g, 0), eye = { x: g.state.player.pos.x, y: 1.5, z: g.state.player.pos.z };
    const d = Math.hypot(p.x - eye.x, p.y + 1 - eye.y, p.z - eye.z);
    expect(raycast(g.world.index, eye.x, eye.y, eye.z, (p.x - eye.x) / d, (p.y + 1 - eye.y) / d, (p.z - eye.z) / d, d - 0.1)).toBeTruthy();
  });
});
