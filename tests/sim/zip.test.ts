// M3-52 (U-021): ziplines. He rigs a line with rope and two hooks and rides it down hanging from a pulley, hook
// or gloved hands, faster the steeper it is; he rides the cables strung between buildings the same way, lets go
// with Ctrl or at the end, and a live power line throws him off with a shock.
import { describe, it, expect } from 'vitest';
import { setup, run, secs, floor, aim, LMB } from './helpers';
import { solid } from '../../src/world/geom';
import { addItem } from '../../src/sim/inventory';
import { B, type SimState } from '../../src/sim/types';
import type { Line } from '../../src/world/world';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';

/** A line from 12 m up at z = 0 down to `low` m at z = -30, ground under it; him hanging at its top. */
function onLine(low: number, gear = ['trolley'], extra: Partial<Line> = {}) {
  const line: Line = { a: { x: 0, y: 12, z: 0 }, b: { x: 0, y: low, z: -30 }, ...extra };
  const r = setup([floor()], { x: 0, y: 12 - 2.05, z: -0.5, yaw: 0 }, { lines: [line] });
  for (const id of gear) addItem(r.state, r.state.inv.pack, id);
  r.state.flags.god = false;
  run(r.state, r.world, 1, { pressed: LMB, buttons: LMB });
  return r;
}
const ride = (r: ReturnType<typeof onLine>, until: (s: SimState) => boolean, max = secs(10)) => { let n = 0; while (n < max && !until(r.state)) { run(r.state, r.world, 1); n++; } return n; };

describe('ziplines (M3-52)', () => {
  it('rides a cable down hanging from a pulley, and drops off the end still moving', () => {
    const r = onLine(6);
    expect(r.state.player.mode).toBe('zip');
    ride(r, s => s.player.mode !== 'zip');
    const p = r.state.player;
    expect(p.pos.z).toBeLessThan(-28);
    expect(p.mode).toBe('air');
    expect(-p.vel.z).toBeGreaterThan(3);
    run(r.state, r.world, secs(3));
    expect(p.onGround).toBe(true);
    expect(r.state.body.hp).toBeGreaterThan(90);
  });
  it('goes faster on a steeper line, slower on a hook than a pulley', () => {
    const t = (low: number, gear: string[]) => ride(onLine(low, gear), s => s.player.mode !== 'zip');
    expect(t(2, ['trolley'])).toBeLessThan(t(8, ['trolley']));
    expect(t(6, ['trolley'])).toBeLessThan(t(6, ['hook']));
  });
  it('lets go with Ctrl', () => {
    const r = onLine(6);
    run(r.state, r.world, secs(1));
    run(r.state, r.world, 1, { pressed: B.CROUCH, buttons: B.CROUCH });
    expect(r.state.player.mode).toBe('air');
    expect(r.state.player.pos.z).toBeGreaterThan(-20);
  });
  it('needs something to hang from: bare hands slip', () => {
    expect(onLine(6, []).state.player.mode).not.toBe('zip');
    expect(onLine(6, ['gloves']).state.player.mode).toBe('zip');
  });
  it('a live line throws him off with a shock, unless his gloves are insulated', () => {
    const r = onLine(6, ['trolley'], { live: true });
    expect(r.state.player.mode).not.toBe('zip');
    expect(r.state.body.hp).toBeLessThan(80);
    const safe = onLine(6, ['trolley', 'insgloves'], { live: true });
    expect(safe.state.player.mode).toBe('zip');
    expect(safe.state.body.hp).toBe(100);
  });
  it('rigs a line with rope and two hooks from a railing to a lower roof and rides it', () => {
    // A roof 10 m up with a railing post at its edge, a lower roof 4 m up 28 m away with a mast on it to hook.
    const { world, state } = setup([floor(), solid(-6, 0, -2, 6, 10, 8), solid(-0.1, 10, -2, 0.1, 11.1, -1.8), solid(-6, 0, -40, 6, 4, -30), solid(-0.1, 4, -33.2, 0.1, 7.5, -33)], { x: 0, y: 10, z: -0.5, yaw: 0 });
    for (const id of ['rope', 'hook', 'hook', 'trolley']) addItem(state, state.inv.pack, id);
    const rope = state.inv.pack.items.find(x => x.id === 'rope')!;
    state.inv.hotbar[0] = rope.uid; state.inv.held = 1;
    aim(state, 0, 10.9, -1.85);
    run(state, world, 1, { pressed: B.USE, buttons: B.USE });
    expect(state.rig).toBeTruthy();
    aim(state, 0, 7, -33);
    run(state, world, 1, { pressed: B.USE, buttons: B.USE });
    expect(state.lines?.length).toBe(1);
    expect(state.inv.pack.items.some(x => x.id === 'rope' || x.id === 'hook')).toBe(false);
    // Empty hands, a step back from the anchor, then off the edge reaching for the line.
    state.inv.held = 0;
    Object.assign(state.player.pos, { x: 0.6, y: 10, z: -1.0 });
    let zipped = false;
    for (let i = 0; i < 60 && !zipped; i++) { run(state, world, 1, { my: 1, pressed: LMB, buttons: LMB }); zipped = state.player.mode === 'zip'; }
    expect(zipped).toBe(true);
    for (let i = 0; i < secs(8) && state.player.mode === 'zip'; i++) run(state, world, 1);
    run(state, world, secs(2));
    expect(state.player.pos.z).toBeLessThan(-30);
    expect(state.player.pos.y).toBeCloseTo(4, 1);
  });
  it("won't rig a line too long or too flat", () => {
    const { world, state } = setup([floor(), solid(-6, 0, -2, 6, 10, 8), solid(-0.1, 10, -2, 0.1, 11.1, -1.8), solid(-6, 0, -50, 6, 9.5, -45)], { x: 0, y: 10, z: -0.5, yaw: 0 });
    for (const id of ['rope', 'hook', 'hook']) addItem(state, state.inv.pack, id);
    state.inv.hotbar[0] = state.inv.pack.items.find(x => x.id === 'rope')!.uid; state.inv.held = 1;
    aim(state, 0, 10.9, -1.85); run(state, world, 1, { pressed: B.USE, buttons: B.USE });
    aim(state, 0, 9.5, -46); run(state, world, 1, { pressed: B.USE, buttons: B.USE });
    expect(state.lines?.length ?? 0).toBe(0);
  });
  it('strings cables across Yuzhong streets to ride, a few of them live', { timeout: 60000 }, () => {
    const w = getWorld('yuzhong');
    expect(w.lines.length).toBeGreaterThan(80);
    expect(w.lines.filter(l => l.live).length).toBeGreaterThan(5);
    for (const l of w.lines) {
      const run = Math.hypot(l.b.x - l.a.x, l.b.z - l.a.z);
      expect(Math.hypot(run, l.b.y - l.a.y)).toBeLessThanOrEqual(40);
      expect(Math.abs(l.b.y - l.a.y)).toBeGreaterThanOrEqual(0.1 * run - 1e-6);
    }
    // From the high roof, a pulley on, across and down onto the low one: most of them carry him over.
    let over = 0;
    const dead = w.lines.filter(l => !l.live).slice(0, 10);
    for (const l of dead) {
      const s = createState(1, w), [hi, lo] = l.a.y > l.b.y ? [l.a, l.b] : [l.b, l.a];
      addItem(s, s.inv.pack, 'trolley');
      teleport(s.player, hi.x, hi.y - 1.2 + 0.05, hi.z);
      run(s, w, 20);
      run(s, w, 1, { pressed: LMB, buttons: LMB });
      for (let i = 0; i < secs(10) && s.player.mode === 'zip'; i++) run(s, w, 1);
      run(s, w, secs(2));
      if (Math.hypot(s.player.pos.x - lo.x, s.player.pos.z - lo.z) < 5 && Math.abs(s.player.pos.y - (lo.y - 3.3)) < 1) over++;
    }
    expect(over).toBeGreaterThanOrEqual(dead.length * 0.6);
  });
});
