// M3-72 (U-038): the start hideout's grate. Up the shaft's ladder to it; from below, drawing the bolts and pushing
// it up takes seconds and is loud, and so is pulling it shut and bolting it; from above it lifts only unbolted.
// Asleep under it left open, the bags off it, or his things dropped by it, he's found and killed; shut, bolted and
// clean, he wakes. And in the city: the chamber under an alley with neon over it.
import { describe, it, expect } from 'vitest';
import { buildHideoutScene } from '../../src/world/sets/hideout-scene';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { syncWorld } from '../../src/sim/doors';
import { GRATE, bagsId } from '../../src/sim/grate';
import { addItem } from '../../src/sim/inventory';
import { B, type SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';
import { run, secs, aim, LMB, RMB, settle } from './helpers';

const w = buildHideoutScene(), g = w.inter.find(i => i.kind === 'grate')!, ladder = w.climbables.find(c => c.kind === 'ladder')!;

function fresh() {
  const s = createState(1, w);
  s.flags.clear = true;
  s.wstate = { searched: {}, open: {}, gone: {} };
  syncWorld(s, w);
  return s;
}

/** Hand over hand up the ladder until the grate stops him. */
function climbToGrate(s: SimState) {
  teleport(s.player, ladder.x, 0.01, ladder.z + 0.7);
  run(s, w, 5);
  const bits = [LMB, RMB];
  let hand = 0, last = -1;
  for (let k = 0; k < 40; k++) {
    const p = s.player, holding = p.hands.reduce((a, h, i) => a | (h.grip ? bits[i] : 0), 0);
    aim(s, ladder.x, Math.min(g.y - 0.2, p.pos.y + 2.2), ladder.z + 0.08);
    run(s, w, 2, { buttons: holding | bits[hand] });
    run(s, w, secs(0.8), { buttons: bits[hand], my: 1 });
    hand = 1 - hand;
    if (p.mode === 'grip' && Math.abs(p.pos.y - last) < 0.02) break;
    last = p.pos.y;
  }
  return s.player.hands.reduce((a, h, i) => a | (h.grip ? bits[i] : 0), 0);
}

/** Hold E on the grate (keeping whatever hands hold) for t seconds; the loudest noise and when it opened or shut. */
function hold(s: SimState, t: number, keep = 0) {
  const was = !!s.wstate.open[g.id];
  let loud = 0, at = -1;
  aim(s, g.x, g.y, g.z);
  run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT | keep });
  for (let i = 0; i < secs(t); i++) {
    run(s, w, 1, { buttons: B.INTERACT | keep });
    for (const e of s.events) if (e.t === 'noise' && e.kind === 'grate') loud = Math.max(loud, e.r);
    if (at < 0 && !!s.wstate.open[g.id] !== was) at = (i + 2) / 60;
  }
  return { loud, at };
}

const sleep = (s: SimState, world: World, hours: number) => run(s, world, 1, { cmds: [{ c: 'act', name: 'sleep', arg: hours }] });

describe('the start hideout grate (M3-72)', () => {
  it('climbs the ladder to it; unbolting and pushing it up from below takes seconds and is loud', () => {
    const s = fresh(), keep = climbToGrate(s);
    expect(s.player.mode).toBe('grip');
    expect(s.player.pos.y).toBeGreaterThan(g.y - 3);
    // Let go of E halfway: nothing happens.
    const half = hold(s, GRATE.unbolt / 2, keep);
    run(s, w, 2, { buttons: keep });
    expect(half.at).toBe(-1);
    const o = hold(s, GRATE.unbolt + 0.5, keep);
    expect(o.at).toBeGreaterThan(GRATE.unbolt - 0.1);
    expect(o.at).toBeLessThan(GRATE.unbolt + 0.2);
    expect(o.loud).toBeGreaterThanOrEqual(12);
    expect(s.wstate.open[bagsId(g)]).toBe(true);
    // And shut again from below: seconds, loud; bolted, the bags dragged back over.
    const c = hold(s, GRATE.shut + 0.5, keep);
    expect(s.wstate.open[g.id]).toBe(false);
    expect(c.at).toBeGreaterThan(GRATE.shut - 0.1);
    expect(c.loud).toBeGreaterThanOrEqual(12);
    expect(s.wstate.open[bagsId(g)]).toBe(false);
    expect(s.wstate.unlocked?.[g.id]).toBeFalsy();
  });

  it('climbs out through it once open; from above it will not lift while bolted, lifts unbolted, and the bags go back by hand', () => {
    const s = fresh(), keep = climbToGrate(s);
    hold(s, GRATE.unbolt + 0.3, keep);
    // Up and over the rails onto the alley.
    for (let k = 0; k < 6 && s.player.mode !== 'ground'; k++) run(s, w, secs(0.5), { buttons: keep, my: 1, pressed: B.JUMP });
    run(s, w, secs(1));
    expect(s.player.pos.y).toBeGreaterThan(g.y - 0.1);
    // Step clear and lower it: quicker, quieter than the bolts.
    teleport(s.player, g.x - 2.6, g.y + 0.02, g.z);
    run(s, w, 5);
    const lower = hold(s, GRATE.lower + 0.3);
    expect(s.wstate.open[g.id]).toBe(false);
    expect(lower.loud).toBeLessThan(12);
    // The bags stay off till he drags them back; then, unbolted, it lifts again from above.
    expect(s.wstate.open[bagsId(g)]).toBe(true);
    const cover = hold(s, GRATE.cover + 0.3);
    expect(s.wstate.open[bagsId(g)]).toBe(false);
    expect(cover.loud).toBeLessThanOrEqual(GRATE.quiet);
    const lift = hold(s, GRATE.lift + 0.3);
    expect(lift.at).toBeGreaterThan(GRATE.lift - 0.1);
    // Bolted (from a fresh night below), it won't.
    const b = fresh();
    teleport(b.player, g.x - 2.6, g.y + 0.02, g.z);
    run(b, w, 5);
    expect(hold(b, GRATE.lift + 0.3).at).toBe(-1);
    expect(b.wstate.open[g.id]).toBeFalsy();
  });

  it('asleep under it left open, the bags off it or his things dropped by it, he is found and killed; shut and clean, he wakes', () => {
    const bed = w.inter.find(i => i.kind === 'mattress')!;
    const night = (setup: (s: SimState) => void) => {
      const s = fresh();
      s.time = 22 * 3600;
      setup(s);
      teleport(s.player, bed.x, bed.y, bed.z + 0.2);
      run(s, w, 5);
      sleep(s, w, 8);
      return s;
    };
    expect(night(() => {}).dead).toBeNull();
    expect(night(s => { s.wstate.open[g.id] = true; syncWorld(s, w); }).dead).toBe('found');
    expect(night(s => { s.wstate.open[bagsId(g)] = true; }).dead).toBe('found');
    const dropped = night(s => {
      // Up top, he lets a bandage fall by the grate.
      teleport(s.player, g.x - 2.6, g.y + 0.02, g.z);
      run(s, w, 5);
      addItem(s, s.inv.pack, 'bandage', 1);
      const uid = s.inv.pack.items.find(i => i.id === 'bandage')!.uid;
      run(s, w, 1, { cmds: [{ c: 'drop', uid }] });
      expect(s.dropped.length).toBe(1);
      expect(s.dropped[0].y).toBeCloseTo(g.y, 0);
    });
    expect(dropped.dead).toBe('found');
    // Found partway through the night, not at its end.
    expect(dropped.time).toBeLessThan(22 * 3600 + 3 * 3600);
  });

  it('in the city the chamber is under an alley: walls close either side of the grate, neon over it, the ladder up the shaft', async () => {
    await settle();
    const yz = getWorld('yuzhong'), gr = yz.inter.find(i => i.id === 'airraid-grate')!;
    expect(gr).toBeTruthy();
    expect(yz.climbables.some(c => c.kind === 'ladder' && Math.hypot(c.x - gr.x, c.z - gr.z) < 2 && c.y1 > gr.y + 0.5 && c.y0 < gr.y - 8)).toBe(true);
    expect(yz.props.filter(p => p.kind === 'neon' && Math.hypot(p.x - gr.x, p.z - gr.z) < 10).length).toBeGreaterThanOrEqual(2);
    expect(yz.props.some(p => p.kind === 'cover' && Math.hypot(p.x - gr.x, p.z - gr.z) < 0.5)).toBe(true);
    // Walls within 3 m of it on two opposite sides, at head height and well over it.
    const { raycast } = await import('../../src/world/geom');
    const walls = [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * Math.PI / 4; return !!raycast(yz.index, gr.x, gr.y + 1.6, gr.z, Math.cos(a), 0, Math.sin(a), 3) && !!raycast(yz.index, gr.x, gr.y + 8, gr.z, Math.cos(a), 0, Math.sin(a), 3.5); });
    expect(walls.some((hit, k) => hit && walls[(k + 4) % 8])).toBe(true);
  });
});
