// M4-15: the search (DESIGN section 5). The disc he can be in: centred on his last known position plus 14 m along his
// heading (7 m/s for 2 s), its radius 6 + 3t m up to 140; points in it picked toward hiding places, ways up and down
// and his heading; a machine passing within 1.5 m of a hiding place checks it three times in five; and a search that
// finds him curled up in a crate where he was last seen.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { searchArea, searchPoint, checkHides, SEARCH } from '../../src/sim/search';
import { enterHide } from '../../src/sim/hide';
import { alertOf } from '../../src/sim/district';
import { NAV, type HideSpot, type Feature } from '../../src/world/world';
import { createState } from '../../src/sim/sim';

const hide = (id: number, x: number, z: number): HideSpot => ({ id, kind: 'crate', inner: { x0: x - 0.5, y0: 0, z0: z - 0.5, x1: x + 0.5, y1: 1, z1: z + 0.5 } });
const ladder = (x: number, z: number): Feature => ({ kind: 'ladder', x, y: 0, z, group: 0 });

describe('search (M4-15)', () => {
  it('grows its disc 3 m a second from 6 m to 140, 14 m ahead of where he was going', () => {
    const lkp = { x: 10, z: 20, hx: 0.6, hz: 0.8 };
    expect(searchArea(lkp, 0)).toEqual({ x: 10 + 0.6 * 14, z: 20 + 0.8 * 14, r: 6 });
    expect(searchArea(lkp, 10).r).toBe(36);
    expect(searchArea(lkp, 30).r).toBe(96);
    expect(searchArea(lkp, (140 - 6) / 3).r).toBeCloseTo(140);
    expect(searchArea(lkp, 120).r).toBe(140);
  });
  it('picks points in the disc, hiding places three times and ways up and down twice as often as open ground, more ahead', () => {
    // A 9 x 9 grid of ground 10 m apart; a hiding place and a ladder on each side of him.
    const { world } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { hides: [hide(0, 15, 0), hide(1, -15, 0)], features: [ladder(0, 15), ladder(0, -15)] });
    const pts = [], adj: [number, number, number][][] = [];
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { pts.push({ x: i * 10 + 5, y: 0, z: j * 10 + 5 }); adj.push([[0, 10, NAV.street]]); }
    world.nav = { pts, adj };
    const s = createState(3, world), lkp = { x: 0, y: 0, z: 0, hx: 1, hz: 0 }, area = { x: 0, z: 0, r: 40 };
    const n = new Map<string, number>(), N = 20000;
    for (let i = 0; i < N; i++) {
      const p = searchPoint(s, world, lkp, area);
      expect(Math.hypot(p.x - area.x, p.z - area.z)).toBeLessThanOrEqual(area.r + 1e-9);
      const k = `${p.x},${p.z}`;
      n.set(k, (n.get(k) ?? 0) + 1);
    }
    const f = (x: number, z: number) => (n.get(`${x},${z}`) ?? 0);
    // Straight across his heading (no lead): ground 1, ladder 2, hiding place 3.
    const ground = (f(5, 35) + f(-5, 35) + f(5, -35) + f(-5, -35)) / 4, lad = (f(0, 15) + f(0, -15)) / 2;
    expect(lad / ground).toBeGreaterThan(1.6);
    expect(lad / ground).toBeLessThan(2.5);
    // Ahead counts double straight ahead: the hiding place ahead against the one behind.
    expect(f(15, 0) / f(-15, 0)).toBeGreaterThan(1.6);
    expect(f(-15, 0) / ground).toBeGreaterThan(2.4);
    expect(f(-15, 0) / ground).toBeLessThan(3.7);
  });
  it('checks a hiding place it passes within 1.5 m three times in five, and not one 2 m off', () => {
    const trial = (seed: number, off: number) => {
      const { world } = setup([floor(0, 100)], { x: 0, y: 0, z: 0, yaw: 0 }, { hides: [hide(0, 0, 0)], patrols: [{ kind: 'street', unit: 'quadruped', pts: [{ x: -20, y: 0, z: off }, { x: 20, y: 0, z: off }], dwell: [1, 1], hours: [0, 24] }] });
      const s = createState(seed, world), u = s.units[0];
      s.player.mode = 'hidden'; s.player.hideId = 0;
      u.trip = { kind: 'search', path: [{ x: 20, y: 0, z: off }], i: 0, pos: { x: -20, y: 0, z: off }, yaw: 0, scan: 0, back: false, left: { x: -20, y: 0, z: off }, leftAt: 0 };
      for (let x = -20; x <= 20; x += 0.4) { u.trip.pos = { x, y: 0, z: off }; checkHides(s, world, u); if ((u.aware ?? 0) >= 1) return true; }
      return false;
    };
    let found = 0;
    for (let k = 0; k < 400; k++) found += trial(k + 1, 1.2) ? 1 : 0;
    expect(found / 400).toBeGreaterThan(SEARCH.chance - 0.08);
    expect(found / 400).toBeLessThan(SEARCH.chance + 0.08);
    for (let k = 0; k < 40; k++) expect(trial(k + 1, 2)).toBe(false);
  });
  it('finds him curled up in a crate where he was last seen', () => {
    const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: 12, yaw: 0 }, {
      cameras: [{ kind: 'camera', x: 0, y: 4, z: 0, yaw: 0 }],
      hides: [hide(0, 0, 13)], features: [ladder(12, 20), ladder(-10, 25), ladder(4, 2)],
      patrols: [{ kind: 'street', unit: 'quadruped', pts: [{ x: 100, y: 0, z: 0 }, { x: 101, y: 0, z: 0 }], dwell: [5, 5], hours: [0, 24] }],
    });
    state.time = 12 * 3600; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
    const dog = state.units[0];
    for (let i = 0; i < secs(5) && alertOf(state, 'yuzhong') !== 'engaged'; i++) run(state, world, 1);
    expect(alertOf(state, 'yuzhong')).toBe('engaged');
    // Into the crate beside him.
    expect(enterHide(state, world, 0)).toBe(true);
    run(state, world, secs(1));
    expect(state.player.mode).toBe('hidden');
    let searched = false, found = -1;
    for (let i = 0; i < secs(140) && found < 0; i++) {
      run(state, world, 1);
      if (alertOf(state, 'yuzhong') === 'searching') searched = true;
      if (searched && alertOf(state, 'yuzhong') === 'engaged') found = i;
    }
    // The quadruped searched, opened the crate and has him; the district is Engaged on him again.
    expect(searched).toBe(true);
    expect(found).toBeGreaterThan(0);
    expect(dog.state).toBe('engaged');
    expect(state.player.mode).toBe('hidden');
    expect(Math.hypot(state.hive.lkp!.x, state.hive.lkp!.z - 13)).toBeLessThan(1.5);
  });
});
