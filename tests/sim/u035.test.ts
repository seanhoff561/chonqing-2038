// M3-69 (U-034, U-035): what looks solid on a facade is solid and grabbable (AC units, cages, metal skins,
// canopies); hanging free from a bar, Space held hauls him up onto it; holding crouch he won't walk off an edge.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { solid } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';
import { free } from '../../src/sim/physics';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { B } from '../../src/sim/types';
import { setup, run, secs, floor, aim, LMB, settle } from './helpers';

describe('quick fixes from U-034 and U-035 (M3-69)', () => {
  it('builds the AC units and the metal skins on the facades solid, and an AC unit takes a grab', async () => {
    await settle();
    const w = getWorld('yuzhong'), own = (p: (typeof w.plots)[number]) => w.solids.slice(p.own!.solids[0], p.own!.solids[1]);
    const size = (s: (typeof w.solids)[number]) => { const e = s.rot ?? s; return [e.x1 - e.x0, s.y1 - s.y0, e.z1 - e.z0]; };
    const acs = w.plots.filter(p => !p.far).flatMap(own).filter(s => { const [a, h, b] = size(s); return s.mat === MAT.metal && Math.abs(h - 0.5) < 0.03 && Math.abs(Math.min(a, b) - 0.42) < 0.01; });
    const skins = w.plots.filter(p => !p.far).flatMap(own).filter(s => { const [a, h, b] = size(s); return (s.mat === MAT.metal || s.mat === MAT.tealMetal) && h > 5 && Math.abs(Math.min(a, b) - 0.16) < 0.01; });
    expect(acs.length).toBeGreaterThan(300);
    expect(skins.length).toBeGreaterThan(50);
    // A skin stops him: no room for him where one stands.
    expect(skins.filter(k => free(w.index, (k.x0 + k.x1) / 2, k.y0 + 0.5, (k.z0 + k.z1) / 2, 1.8)).length).toBe(0);
    // Hanging in the air before one, he grabs its top. (Out of the wall: across its short side, in its own frame.)
    const ac = acs[0], cx = (ac.x0 + ac.x1) / 2, cz = (ac.z0 + ac.z1) / 2, e = ac.rot!, c = e.c, sn = e.s;
    const [ox, oz] = e.x1 - e.x0 < e.z1 - e.z0 ? [c, sn] : [-sn, c];
    let got = false;
    for (const side of [-1, 1]) {
      const s = createState(1, w), x = cx + ox * side * 0.75, z = cz + oz * side * 0.75;
      if (!free(w.index, x, ac.y1 - 1.6, z, 1.8)) continue;
      s.flags.clear = true;
      teleport(s.player, x, ac.y1 - 1.6, z);
      aim(s, cx, ac.y1 - 0.04, cz);
      run(s, w, 3, { buttons: LMB });
      got ||= s.player.hands[0].grip?.kind === 'lip';
    }
    expect(got).toBe(true);
  });

  it('hanging free from a bar, Space held hauls him up onto it', () => {
    // A bar 2.5 m up between two posts 3 m apart, nothing under it.
    const { world, state } = setup([floor(), solid(-1.5, 2.44, -0.03, 1.5, 2.5, 0.03, MAT.metal), solid(-1.6, 0, -0.1, -1.5, 2.5, 0.1), solid(1.5, 0, -0.1, 1.6, 2.5, 0.1)], { x: 0, y: 0, z: 0.6, yaw: 0 });
    run(state, world, 10);
    run(state, world, 1, { pressed: B.JUMP, buttons: B.JUMP });
    for (let i = 0; i < 40 && !state.player.hands[0].grip; i++) { aim(state, 0, 2.48, 0.04); run(state, world, 1, { buttons: LMB | B.JUMP }); }
    expect(state.player.hands[0].grip).toBeTruthy();
    run(state, world, secs(0.5), { buttons: LMB });
    expect(state.player.mode).toBe('grip');
    // A tap pumps a swing; held, a muscle-up.
    run(state, world, secs(1.5), { buttons: LMB | B.JUMP, pressed: B.JUMP });
    run(state, world, secs(1));
    expect(state.player.mode).toBe('ground');
    expect(state.player.pos.y).toBeCloseTo(2.5, 1);
  });

  it('holding crouch he stops at the edge of a roof; walking, he goes over', () => {
    for (const crouch of [true, false]) {
      const { world, state } = setup([floor(), solid(-5, 0, -5, 5, 4, 5)], { x: 0, y: 4, z: 0, yaw: 0 });
      run(state, world, 10);
      run(state, world, secs(4), { my: 1, yaw: 0, buttons: crouch ? B.CROUCH : 0 });
      if (crouch) {
        expect(state.player.pos.y).toBeCloseTo(4, 2);
        expect(state.player.pos.z).toBeGreaterThan(-5.3);
      } else expect(state.player.pos.y).toBeLessThan(1);
    }
  });
});
