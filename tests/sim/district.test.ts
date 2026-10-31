// M4-12: each district's alert (DESIGN section 5). Unaware by default; Suspicious while one of its machines is;
// Engaged once one that has him has told the network (a camera after 1 s: M4-13), and kept so while one sees him;
// Searching once none has seen him for 4 s; Engaged again
// on a fresh sighting; Heightened 150 s after the last contact, until 06:00, and Suspicious over it while a machine
// is; then Unaware.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { teleport } from '../../src/sim/player';
import { alertOf, DISTRICT } from '../../src/sim/district';
import { nextHour } from '../../src/sim/clock';
import { BROADCAST } from '../../src/data/units';

/** A camera 4 m up at the origin looking +z over an open floor, at noon; he starts well out of its sight. */
function watched() {
  const { world, state } = setup([floor(0, 300)], { x: 0, y: 0, z: -100, yaw: 0 }, { cameras: [{ kind: 'camera', x: 0, y: 4, z: 0, yaw: 0 }] });
  state.time = 12 * 3600; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
  const cam = state.units[0], alert = () => alertOf(state, 'yuzhong');
  /** Ticks until the district's alert is `a` (or -1 within n). */
  const until = (a: string, n: number) => { for (let i = 0; i < n; i++) { if (alert() === a) return i; run(state, world, 1); } return alert() === a ? n : -1; };
  const inView = () => teleport(state.player, 0, 0, 12), away = () => teleport(state.player, 0, 0, -100);
  return { world, state, cam, alert, until, inView, away };
}

describe('district alert (M4-12)', () => {
  it('is Unaware by default, Suspicious while a machine is, and Unaware again when it lets it go', () => {
    const t = watched();
    run(t.state, t.world, secs(2));
    expect(t.alert()).toBe('unaware');
    expect(t.state.hive.districts).toEqual({});
    // A glimpse: in its view until it's past 0.3, then away.
    t.inView();
    for (let i = 0; i < secs(2) && (t.cam.aware ?? 0) < 0.4; i++) run(t.state, t.world, 1);
    t.away();
    expect(t.cam.aware!).toBeLessThan(1);
    expect(t.until('suspicious', 7)).toBeGreaterThanOrEqual(0);
    // It falls back below 0.3 (0.15 a second), and the district with it.
    const left = ((t.cam.aware! - 0.3) / 0.15) * 60, back = t.until('unaware', secs(5));
    expect(back).toBeGreaterThan(left - 12);
    expect(back).toBeLessThan(left + 12);
  });
  it('turns Engaged once the camera has told the network, Searching 4 s after the last sighting, Engaged again on a fresh one', () => {
    const t = watched();
    t.inView();
    let engagedAt = -1;
    for (let i = 0; i < secs(5) && engagedAt < 0; i++) { run(t.state, t.world, 1); if (t.cam.state === 'engaged') engagedAt = i; }
    expect(engagedAt).toBeGreaterThan(0);
    // Suspicious until it tells (1 s on), then Engaged.
    expect(t.alert()).toBe('suspicious');
    const told = t.until('engaged', secs(2)) / 60;
    expect(told).toBeGreaterThan(BROADCAST.camera - 0.15);
    expect(told).toBeLessThan(BROADCAST.camera + 0.15);
    // Kept Engaged while it sees him.
    run(t.state, t.world, secs(10));
    expect(t.alert()).toBe('engaged');
    t.away();
    const lost = t.until('searching', secs(6)) / 60;
    expect(lost).toBeGreaterThan(DISTRICT.lost - 0.2);
    expect(lost).toBeLessThan(DISTRICT.lost + 0.2);
    // A fresh sighting: back to Engaged at once, and Searching 4 s after it's gone again.
    run(t.state, t.world, secs(3));
    t.inView();
    expect(t.until('engaged', secs(1))).toBeGreaterThanOrEqual(0);
    t.away();
    expect(t.until('searching', secs(6)) / 60).toBeGreaterThan(DISTRICT.lost - 0.2);
  });
  it('turns Heightened 150 s after the last contact until 06:00, Suspicious over it while a machine is, then Unaware', () => {
    const t = watched();
    t.inView();
    t.until('engaged', secs(5));
    t.away();
    t.until('searching', secs(6));
    const heightened = t.until('heightened', secs(200)) / 60 + DISTRICT.lost;
    expect(heightened).toBeGreaterThan(DISTRICT.search - 0.3);
    expect(heightened).toBeLessThan(DISTRICT.search + 0.3);
    const D = t.state.hive.districts.yuzhong;
    expect(D.until).toBe(nextHour(t.state.time, 6));
    // Something seen while Heightened: Suspicious, and Heightened again after.
    t.inView();
    for (let i = 0; i < secs(2) && (t.cam.aware ?? 0) < 0.4; i++) run(t.state, t.world, 1);
    t.away();
    expect(t.until('suspicious', 7)).toBeGreaterThanOrEqual(0);
    expect(t.until('heightened', secs(5))).toBeGreaterThan(0);
    // Just before 06:00 still Heightened; just after, Unaware.
    t.state.time = D.until - 60;
    run(t.state, t.world, 6);
    expect(t.alert()).toBe('heightened');
    expect(t.until('unaware', secs(10))).toBeGreaterThan(0);
    expect(t.state.hive.districts).toEqual({});
  });
});
