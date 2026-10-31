// M4-21: the pistol (DESIGN section 6). Hitscan along his look thrown off by the spread (tight aimed, wide from the
// hip, wider moving); fifteen to a magazine, reloading from his pack; every shot a hostile noise heard 150 m round;
// head shots blind a quadruped.
import { describe, it, expect } from 'vitest';
import { setup, floor, run, secs, LMB, RMB } from './helpers';
import { addItem } from '../../src/sim/inventory';
import { spreadOf } from '../../src/sim/pistol';
import { B, type SimState } from '../../src/sim/types';
import { PISTOL } from '../../src/data/units';
import { unitPose } from '../../src/sim/units';
import type { Patrol } from '../../src/world/world';

/** A quadruped standing d m in front of him, facing him; he holds the pistol with `rounds` in it and `mags` full magazines. */
function range(d: number, rounds = 15, mags = 2) {
  const beat: Patrol = { kind: 'street', unit: 'quadruped', pts: [{ x: 0, y: 0, z: -d }, { x: 0, y: 0, z: -d + 0.01 }], dwell: [600, 600], hours: [0, 24] };
  const { world, state } = setup([floor(0, 200)], { x: 0, y: 0, z: 0, yaw: 0 }, { patrols: [beat] });
  state.time = 12 * 3600; state.flags.clear = true; state.flags.god = true;
  addItem(state, state.inv.pack, 'pistol', 1, { charge: rounds });
  if (mags) addItem(state, state.inv.pack, 'mag9', mags);
  state.inv.hotbar[0] = state.inv.pack.items.find(i => i.id === 'pistol')!.uid; state.inv.held = 1;
  return { world, state, u: state.units[0] };
}
const gun = (s: SimState) => s.inv.pack.items.find(i => i.id === 'pistol')!;
/** Squeeze off one round (aimed or not) at a pitch, waiting out the time between shots first. */
function shoot(t: ReturnType<typeof range>, pitch: number, aimed = true, yaw = 0) {
  run(t.state, t.world, secs(0.4), { pitch, yaw, buttons: aimed ? RMB : 0 });
  let noise = 0, fired = false;
  run(t.state, t.world, 1, { pitch, yaw, pressed: LMB, buttons: LMB | (aimed ? RMB : 0) }, s => { for (const e of s.events) { if (e.t === 'noise' && e.kind === 'pistol') noise = e.r; if (e.t === 'fire') fired = true; } });
  return { noise, fired };
}

describe('pistol (M4-21)', () => {
  it('blinds a quadruped with head shots, aimed: three of them', () => {
    // Aimed at its sensor head (0.8 m up at its front) wherever it's got to, 10 m off to start.
    const t = range(10);
    let n = 0;
    while (!t.u.blind && n < 8) {
      const q = unitPose(t.world, t.u, t.state.time), hx = q.x + Math.sin(q.yaw) * 0.55, hz = q.z + Math.cos(q.yaw) * 0.55, p = t.state.player.pos, d = Math.hypot(hx - p.x, hz - p.z);
      const r = shoot(t, Math.atan2(q.y + 0.8 - p.y - 1.62, d), true, Math.atan2(-(hx - p.x), -(hz - p.z)));
      expect(r.fired).toBe(true); expect(r.noise).toBe(PISTOL.noise); n++;
    }
    expect(t.u.blind).toBe(true);
    expect(n).toBeLessThanOrEqual(4);
    expect(t.u.hits!.head).toBeGreaterThanOrEqual(60);
  });
  it('spreads wider from the hip and moving than aimed and still, and its kick settles', () => {
    const t = range(10);
    expect(spreadOf(t.state, false)).toBeGreaterThan(spreadOf(t.state, true) * 3);
    t.state.player.vel.x = 3;
    expect(spreadOf(t.state, true)).toBeGreaterThan(PISTOL.spread.aim + 1.5);
    t.state.player.vel.x = 0;
    // From the hip at 25 m, fewer land than aimed.
    const hits = (aimed: boolean) => {
      const r = range(25, 15, 0), pitch = Math.atan2(0.6 - 1.62, 25);
      let h = 0;
      for (let k = 0; k < 15; k++) { const hp = r.u.hp ?? 150; shoot(r, pitch, aimed); if ((r.u.hp ?? 150) < hp) h++; }
      return h;
    };
    expect(hits(true)).toBeGreaterThan(hits(false));
    shoot(t, 0);
    expect(t.state.player.kick).toBeGreaterThan(PISTOL.kick * 0.9);
    run(t.state, t.world, secs(1));
    expect(t.state.player.kick).toBeLessThan(PISTOL.kick * 0.01);
  });
  it('holds fifteen, clicks empty, and reloads from the fullest magazine, keeping a part-spent one', () => {
    const t = range(50, 2, 1);
    expect(shoot(t, 0.3).fired).toBe(true);
    expect(gun(t.state).charge).toBe(1);
    // R: 2.2 s, then fifteen in it and the one with a round back in the pack.
    run(t.state, t.world, 1, { pressed: B.RELOAD });
    run(t.state, t.world, secs(PISTOL.reload - 0.2));
    expect(gun(t.state).charge).toBe(1);
    run(t.state, t.world, secs(0.3));
    expect(gun(t.state).charge).toBe(PISTOL.mag);
    const mags = t.state.inv.pack.items.filter(i => i.id === 'mag9');
    expect(mags.map(m => [m.n, m.charge])).toEqual([[1, 1]]);
    // Emptied: it clicks.
    for (let k = 0; k < PISTOL.mag; k++) expect(shoot(t, 0.3).fired).toBe(true);
    expect(shoot(t, 0.3).fired).toBe(false);
    // Reloading the part-spent one gives one round.
    run(t.state, t.world, 1, { pressed: B.RELOAD });
    run(t.state, t.world, secs(PISTOL.reload + 0.1));
    expect(gun(t.state).charge).toBe(1);
    expect(t.state.inv.pack.items.some(i => i.id === 'mag9')).toBe(false);
  });
  it("is heard by machines 150 m off as a hostile noise", () => {
    const t = range(140, 15, 0);
    t.u.aware = 0;
    shoot(t, 0.3);
    run(t.state, t.world, 2);
    expect(t.u.aware ?? 0).toBeGreaterThanOrEqual(0.35);
    expect(t.state.hive.seen.length).toBeGreaterThan(0);
  });
});
