// M4-11: the fixed sensors (DESIGN section 7). A laser tripwire engages the moment his body crosses its beam (a
// running jump clears one at shin height); a motion sensor sees movement within its 10 m cone over 0.5 m/s as his
// posture shows it, so a slow crawl slides under it; an Engaged turret that sees him fires six rounds a second, 70%
// hitting within 40 m and fewer on to 60, each hit 12 damage and a bleed; an acoustic sensor hears at twice the
// radius. The city has them: turrets over the factory's gates, tripwires and acoustic sensors in the Grand Tunnel,
// motion sensors in the shelters.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, sprintJumpAt } from './helpers';
import { getWorld } from '../../src/world/build';
import { stepHearing } from '../../src/sim/perception';
import { B } from '../../src/sim/types';
import type { Camera } from '../../src/world/world';

function sensed(c: Camera, at: { x: number; z: number }) {
  const { world, state } = setup([floor(0, 200)], { x: at.x, y: 0, z: at.z, yaw: 0 }, { cameras: [c] });
  state.time = 12 * 3600; state.flags.clear = true;
  return { world, state, u: state.units[0] };
}
const wire = (): Camera => ({ kind: 'tripwire', x: -3, y: 0.4, z: 0, yaw: Math.PI / 2, to: { x: 3, y: 0.4, z: 0 } });

describe('fixed sensors (M4-11)', () => {
  it('engages a tripwire when he walks through its beam, and not when he jumps it', () => {
    const t = sensed(wire(), { x: 0, z: 4 });
    run(t.state, t.world, secs(1), { my: 1 });
    expect(t.u.state).toBe('unaware');
    run(t.state, t.world, secs(3), { my: 1 });
    expect(t.state.player.pos.z).toBeLessThan(-1);
    expect(t.u.state).toBe('engaged');
    // A running jump over it.
    const j = sensed(wire(), { x: 0, z: 8 });
    sprintJumpAt(j.state, j.world, 1.4);
    run(j.state, j.world, secs(1), { my: 1 });
    expect(j.state.player.pos.z).toBeLessThan(-1);
    expect(j.u.aware ?? 0).toBe(0);
    expect(j.u.state).toBe('unaware');
  });
  it('a motion sensor ignores a slow crawl through its cone, but not a crouch-walk or a walk', () => {
    const pir = (): Camera => ({ kind: 'pir', x: 0, y: 2.2, z: 0, yaw: 0 });
    const across = (buttons: number, crawl: boolean) => {
      const t = sensed(pir(), { x: -5, z: 6 });
      if (crawl) { run(t.state, t.world, 1, { yaw: -Math.PI / 2, pressed: B.CRAWL }); run(t.state, t.world, secs(1), { yaw: -Math.PI / 2 }); }
      let most = 0;
      for (let i = 0; i < secs(crawl ? 13 : 6) && t.state.player.pos.x < 5; i++) { run(t.state, t.world, 1, { yaw: -Math.PI / 2, my: 1, buttons }); most = Math.max(most, t.u.aware ?? 0); }
      expect(t.state.player.pos.x, 'got across').toBeGreaterThan(4);
      return { most, state: t.u.state, posture: t.state.player.posture };
    };
    const crawl = across(0, true);
    expect(crawl.posture).toBe('crawl');
    expect(crawl.most).toBe(0);
    expect(crawl.state).toBe('unaware');
    const crouch = across(B.CROUCH, false);
    expect(crouch.posture).toBe('crouch');
    expect(crouch.state).toBe('engaged');
    expect(across(0, false).state).toBe('engaged');
  });
  it('an Engaged turret that sees him fires: 6 rounds a second, hits hurt and bleed, fewer hit past 40 m', () => {
    const turret = (): Camera => ({ kind: 'turret', x: 0, y: 4, z: 0, yaw: 0 });
    // Behind it, it doesn't see him and doesn't fire.
    const back = sensed(turret(), { x: 0, z: -20 });
    let shots = 0;
    run(back.state, back.world, secs(5), {}, s => { shots += s.events.filter(e => e.t === 'shot').length; });
    expect(back.u.state).toBe('unaware');
    expect(shots).toBe(0);
    expect(back.state.body.hp).toBe(100);
    // In front of it at 20 m: it engages, opens up, and he's hit and bleeding.
    const front = sensed(turret(), { x: 0, z: 20 });
    let first = -1;
    run(front.state, front.world, secs(4), {}, (s, i) => { if (first < 0 && s.events.some(e => e.t === 'shot')) first = i; });
    expect(front.u.state).toBe('engaged');
    expect(first).toBeGreaterThan(0);
    expect(front.state.body.hp).toBeLessThan(100);
    expect(front.state.body.heavyBleed || front.state.body.lightBleed >= 0).toBe(true);
    // Hits per round, near and far (kept alive to count).
    const rate = (z: number) => {
      const t = sensed(turret(), { x: 0, z });
      t.u.aware = 1.5; t.u.state = 'engaged';
      let n = 0, hit = 0;
      run(t.state, t.world, secs(10), {}, s => { n += s.events.filter(e => e.t === 'shot').length; hit += s.events.filter(e => e.t === 'hurt' && e.cause === 'turret').length; s.body.hp = 100; });
      return { n, hit: hit / n };
    };
    const near = rate(20), far = rate(54);
    expect(near.n).toBeGreaterThanOrEqual(55);
    expect(near.n).toBeLessThanOrEqual(61);
    expect(near.hit).toBeGreaterThan(0.55);
    expect(near.hit).toBeLessThan(0.85);
    expect(far.hit).toBeLessThan(0.35);
  });
  it('an acoustic sensor hears at twice the radius', () => {
    const t = sensed({ kind: 'acoustic', x: 0, y: 2, z: 0, yaw: 0 }, { x: 0, z: 40 });
    const noise = (z: number) => { t.state.events.length = 0; t.state.events.push({ t: 'noise', x: 0, y: 0, z, r: 10, kind: 'step' }); stepHearing(t.state, t.world); return t.u.aware ?? 0; };
    expect(noise(22)).toBe(0);
    expect(noise(18)).toBeGreaterThanOrEqual(0.35);
  });
  it('the city has turrets at the factory gates, tripwires and acoustic sensors in the Grand Tunnel, motion sensors in the shelters', () => {
    const w = getWorld('yuzhong'), n = (k: string) => w.cameras.filter(c => c.kind === k);
    expect(n('turret').length).toBe(w.features.filter(f => f.kind === 'gate').length);
    expect(n('tripwire').length).toBe(2);
    for (const c of n('tripwire')) expect(Math.hypot(c.to!.x - c.x, c.to!.z - c.z)).toBeGreaterThan(4.5);
    expect(n('acoustic').length).toBeGreaterThanOrEqual(3);
    expect(n('pir').length).toBeGreaterThanOrEqual(3);
    // None hears or sees into the friends' hideout.
    const home = w.teleports.find(t => t.name.startsWith("Friends' hideout"))!;
    for (const c of w.cameras.filter(c => c.kind !== 'camera' && c.kind !== 'sweeper' && c.kind !== 'lamppost')) expect(Math.hypot(c.x - home.x, c.z - home.z), c.kind).toBeGreaterThan(20);
  });
});
