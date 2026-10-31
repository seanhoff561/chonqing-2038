// M4-13: the hivemind's broadcast (DESIGN section 5). A machine that has him (Engaged) tells the network after its
// kind's delay; from then the network's last known position follows him while it sees him; the word goes to every
// machine in its district and to those within 300 m in the districts next to it. Switched off before its delay, it
// never tells: the network stays unaware.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs } from './helpers';
import { teleport } from '../../src/sim/player';
import { alertOf, districtOf } from '../../src/sim/district';
import { BROADCAST, SPREAD } from '../../src/data/units';
import { SCALE } from '../../src/sim/clock';
import { GEO } from '../../src/world/geo';
import type { Camera, Patrol } from '../../src/world/world';

type P = { x: number; z: number };
/** A sensor 4 m up at o looking +z, machines standing at each of `at`, at noon; he stands 12 m in front of it. */
function scene(kind: Camera['kind'], o: P, at: P[] = []) {
  const patrols: Patrol[] = at.map(p => ({ kind: 'street', unit: 'quadruped', pts: [{ x: p.x, y: 0, z: p.z }, { x: p.x + 1, y: 0, z: p.z }], dwell: [5, 5], hours: [0, 24] }));
  const { world, state } = setup([at.length ? floor(0, 4000) : floor(0, 300)], { x: o.x, y: 0, z: o.z + 12, yaw: 0 }, { cameras: [{ kind, x: o.x, y: 4, z: o.z, yaw: 0 }], patrols });
  state.time = 12 * 3600; state.flags.clear = true; state.weather = { fog: 0, rain: 0 };
  const cam = state.units.find(u => u.cam !== undefined)!;
  return { world, state, cam, units: state.units.filter(u => u !== cam) };
}

/** Ticks from it turning Engaged until the network knows where he is. */
function delay(kind: Camera['kind']) {
  const t = scene(kind, { x: 0, z: 0 });
  for (let i = 0; i < secs(5) && t.cam.state !== 'engaged'; i++) run(t.state, t.world, 1);
  expect(t.cam.state).toBe('engaged');
  let n = 0;
  for (; n < secs(5) && !t.state.hive.lkp; n++) run(t.state, t.world, 1);
  return n / 60;
}

describe('hivemind broadcast (M4-13)', () => {
  it('tells the network after its kind\'s delay: a turret in half a second, a camera in one', () => {
    for (const k of ['turret', 'camera'] as const) {
      const d = delay(k);
      expect(d, k).toBeGreaterThan(BROADCAST[k] - 0.12);
      expect(d, k).toBeLessThan(BROADCAST[k] + 0.12);
    }
  });
  it('follows him with the last known position while it sees him, and the way he goes', () => {
    const t = scene('camera', { x: 0, z: 0 });
    run(t.state, t.world, secs(3));
    expect(t.state.hive.lkp).toBeDefined();
    // He walks off across its view (toward +x); the position goes with him, where he was a moment (a think or two) ago.
    const was = new Map<number, { x: number; z: number }>();
    for (let i = 0; i < secs(3) && t.state.player.pos.x < 6; i++) {
      const T = t.state.time;
      run(t.state, t.world, 1, { yaw: -Math.PI / 2, my: 1 });
      was.set(T, { ...t.state.player.pos });
      const k = t.state.hive.lkp!, then = was.get(k.t);
      if (i % 30 !== 29) continue;
      expect((t.state.time - k.t) / SCALE).toBeLessThan(0.21);
      expect(Math.hypot(k.x - then!.x, k.z - then!.z)).toBeLessThan(0.01);
    }
    expect(t.state.player.pos.x).toBeGreaterThan(3);
    expect(t.state.hive.lkp!.hx).toBeGreaterThan(0.9);
    // Gone from its sight, it stays where it last saw him.
    const left = { ...t.state.hive.lkp! };
    teleport(t.state.player, 0, 0, -100);
    run(t.state, t.world, secs(2));
    expect(t.state.hive.lkp).toEqual(left);
  });
  it('spreads the word through its district and to machines within 300 m in the next', () => {
    // A camera in Jiefangbei 60 m in from its edge with Xiaoshizi.
    const L = GEO.landmarks.jiefangbei, K = GEO.landmarks.xiaoshizi, me = districtOf(L.x, L.z), D = Math.hypot(K.x - L.x, K.z - L.z);
    let s = 0;
    while (districtOf(L.x + ((K.x - L.x) * (s + 5)) / D, L.z + ((K.z - L.z) * (s + 5)) / D) === me) s += 5;
    const o = { x: L.x + ((K.x - L.x) * (s - 60)) / D, z: L.z + ((K.z - L.z) * (s - 60)) / D }, him = { x: o.x, z: o.z + 12 };
    expect(me).toBe('jiefangbei');
    /** A spot r from him (trying round the circle) whose district passes `ok`. */
    const ring = (r: number, ok: (d: string) => boolean) => {
      for (let a = 0; a < 360; a += 5) { const p = { x: him.x + Math.sin((a * Math.PI) / 180) * r, z: him.z + Math.cos((a * Math.PI) / 180) * r }; if (ok(districtOf(p.x, p.z))) return p; }
      throw new Error(`nowhere ${r} m off`);
    };
    const far = ring(SPREAD + 40, d => d === me), next = ring(SPREAD - 60, d => d !== me), beyond = ring(SPREAD + 80, d => d !== me);
    const t = scene('camera', o, [far, next, beyond]);
    run(t.state, t.world, secs(3));
    expect(t.state.hive.lkp).toBeDefined();
    expect(alertOf(t.state, me)).toBe('engaged');
    const [a, b, c] = t.units;
    expect(a.told, 'same district, 340 m off').toBeDefined();
    expect(b.told, 'next district, 240 m off').toBeDefined();
    expect(c.told, 'next district, 380 m off').toBeUndefined();
  });
  it('switched off before its delay, it never tells: the network stays unaware', () => {
    const t = scene('camera', { x: 0, z: 0 }, [{ x: 50, z: 0 }]);
    for (let i = 0; i < secs(5) && t.cam.state !== 'engaged'; i++) run(t.state, t.world, 1);
    expect(t.cam.state).toBe('engaged');
    run(t.state, t.world, secs(BROADCAST.camera / 2));
    t.cam.off = t.state.time + 60 * SCALE;
    run(t.state, t.world, secs(5));
    expect(t.state.hive.lkp).toBeUndefined();
    expect(t.state.hive.seen).toEqual([]);
    expect(alertOf(t.state, 'yuzhong')).not.toBe('engaged');
    expect(t.units[0].told).toBeUndefined();
  });
});
