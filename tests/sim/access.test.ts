// M3-36 (U-014, U-034, U-040): buildings as puzzles. A few small rooms carved into each enterable block, each with a
// way or three in; most doors locked, jammed or chained; the main stairwell, where there is one, opening onto few
// rooms; windows broken in, glazed or barred; locks that refuse him, forced with E held and loud; glass broken out
// loud; bars that hold. (Whether a building's ways play well is for the director, U-037.)
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { free } from '../../src/sim/physics';
import { syncWorld } from '../../src/sim/doors';
import { B } from '../../src/sim/types';
import { inside } from '../../src/world/yuzhong/shapes';
import type { Inter } from '../../src/world/world';
import { run, secs, aim } from './helpers';

const w = getWorld('yuzhong'), near = w.plots.filter(p => !p.far);
const rooms = w.features.filter(f => f.kind.startsWith('inside:'));
/** The enterable blocks and the rooms in each. */
const blocks = near.map(p => ({ p, n: rooms.filter(f => inside(p.corners, f.x, f.z)).length })).filter(b => b.n > 0);
const doors = w.inter.filter(i => i.kind === 'door' && /\.(street|d|roof|v)\d+$/.test(i.id)), lockOf = (i: Inter) => (i.data?.lock as string | undefined) ?? 'shut';
const share = (a: Inter[], ...locks: string[]) => a.filter(i => locks.includes(lockOf(i))).length / a.length;

/** Stand in front of a door or window on its floor, looking at it. */
function before(it: Inter) {
  const p = w.props.find(q => q.text === it.id)!, nx = -Math.sin(p.yaw), nz = -Math.cos(p.yaw);
  for (const side of [1, -1]) {
    const x = it.x + nx * side * 0.9, z = it.z + nz * side * 0.9, y = p.y + 0.05;
    if (!free(w.index, x, y, z, 1.8)) continue;
    const s = createState(1, w);
    s.flags.clear = true;
    syncWorld(s, w);
    teleport(s.player, x, y, z);
    run(s, w, 10);
    aim(s, it.x, it.y, it.z);
    run(s, w, 2);
    if (s.target === it.id) return s;
  }
  return null;
}

describe('buildings as puzzles (M3-36)', () => {
  it('carves a few small rooms into each enterable block, the main stairwell into some', () => {
    expect(blocks.length).toBeGreaterThan(300);
    const per = blocks.reduce((a, b) => a + b.n, 0) / blocks.length;
    expect(per).toBeGreaterThan(2);
    expect(per).toBeLessThan(10);
    const cored = blocks.filter(b => b.p.route).length / blocks.length;
    expect(cored).toBeGreaterThan(0.3);
    expect(cored).toBeLessThan(0.8);
    // Kinds of room, and of ways between them: doors, crawl vents, ladders up through holes.
    for (const k of ['bedroom', 'living', 'kitchen', 'store', 'shop']) expect(rooms.some(f => f.kind === `inside:${k}`), k).toBe(true);
    expect(doors.filter(i => /\.v\d+$/.test(i.id)).length).toBeGreaterThan(50);
    expect(w.climbables.filter(c => c.kind === 'ladder' && c.y1 - c.y0 > 3.9).length).toBeGreaterThan(100);
  });

  it('locks most ways: street and roof doors mostly locked, the stairwell\'s doors to rooms mostly shut off', () => {
    const street = doors.filter(i => /\.street\d+$/.test(i.id)), roof = doors.filter(i => /\.roof\d+$/.test(i.id)), inside = doors.filter(i => /\.d\d+$/.test(i.id));
    expect(street.length).toBeGreaterThan(100);
    expect(share(street, 'locked', 'jammed', 'chained')).toBeGreaterThan(0.5);
    expect(share(roof, 'locked', 'jammed')).toBeGreaterThan(0.6);
    expect(share(inside, 'locked', 'jammed', 'chained')).toBeGreaterThan(0.4);
  });

  it('cuts a few windows a block, most glazed or broken in, some barred', () => {
    const panes = w.inter.filter(i => i.kind === 'window'), barred = w.solids.filter(s => s.part && /\.w\d+$/.test(s.part) && !panes.some(p => p.data?.part === s.part));
    const per = (panes.length + barred.length) / blocks.length;
    expect(per).toBeGreaterThan(0.8);
    expect(per).toBeLessThan(8);
    expect(panes.length).toBeGreaterThan(barred.length);
  });

  it('a shut door opens with E; a chained one refuses him; a locked one is forced with E held, loudly', () => {
    const at = (lock: string) => {
      for (const it of doors.filter(i => lockOf(i) === lock && /\.(d|street)\d+$/.test(i.id))) { const s = before(it); if (s) return { s, it }; }
      throw new Error(`no ${lock} door to stand at`);
    };
    const shut = at('shut');
    run(shut.s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    expect(shut.s.wstate.open[shut.it.id]).toBe(true);
    const chained = at('chained');
    run(chained.s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    expect(chained.s.wstate.open[chained.it.id]).toBeFalsy();
    const locked = at('locked');
    run(locked.s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
    expect(locked.s.wstate.open[locked.it.id]).toBeFalsy();
    let loud = 0;
    for (let t = 0; t < secs(4.3); t++) { run(locked.s, w, 1, { buttons: B.INTERACT }); for (const e of locked.s.events) if (e.t === 'noise') loud = Math.max(loud, (e as { r: number }).r); }
    expect(locked.s.wstate.open[locked.it.id]).toBe(true);
    expect(loud).toBeGreaterThanOrEqual(14);
  });

  it("breaks a window's glass out with E held, loudly, and then he can climb through; bars hold", () => {
    for (const it of w.inter.filter(i => i.kind === 'window')) {
      const s = before(it);
      if (!s) continue;
      run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
      let loud = 0;
      for (let t = 0; t < secs(1.5); t++) { run(s, w, 1, { buttons: B.INTERACT }); for (const e of s.events) if (e.t === 'noise') loud = Math.max(loud, (e as { r: number }).r); }
      expect(s.wstate.open[it.id]).toBe(true);
      expect(loud).toBeGreaterThanOrEqual(15);
      expect(free(w.index, it.x, it.y - 0.6, it.z, 1.2, 0.2)).toBe(true);
      const bars = w.solids.find(b => b.part && /\.w\d+$/.test(b.part) && !w.inter.some(i => i.data?.part === b.part))!;
      expect(free(w.index, (bars.x0 + bars.x1) / 2, bars.y0 + 0.2, (bars.z0 + bars.z1) / 2, 1.0, 0.1)).toBe(false);
      return;
    }
    throw new Error('no window to stand at');
  });
});
