import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { setup, run, floor, secs, aim, LMB, RMB, sprintJumpAt } from './helpers';
import { solid } from '../../src/world/geom';
import { B, type SimState } from '../../src/sim/types';

const cues = new Set<string>();
const collect = (s: SimState) => { for (const e of s.events) if (e.t === 'sfx') cues.add(e.id); };

describe('movement sound cues (M1-31)', () => {
  it('every movement action emits its cue', () => {
    // Steps by gait, jump, land, slide.
    for (const [buttons, pressed] of [[0, 0], [B.SPRINT, 0], [B.CROUCH, 0], [0, B.CRAWL]] as const) {
      const r = setup([floor()]);
      run(r.state, r.world, 1, { pressed });
      run(r.state, r.world, secs(2), { my: 1, buttons }, collect);
    }
    const j = setup([floor()]);
    run(j.state, j.world, 5);
    run(j.state, j.world, secs(1.5), { pressed: B.JUMP, buttons: B.JUMP }, collect);
    const sl = setup([floor()]);
    run(sl.state, sl.world, secs(1.5), { my: 1, buttons: B.SPRINT });
    run(sl.state, sl.world, secs(1), { my: 1, buttons: B.CROUCH, pressed: B.CROUCH }, collect);
    // Hard landing and roll.
    for (const roll of [false, true]) {
      const d = setup([solid(-5, -1, -30, 5, 0, 30), solid(-5, 0, -2, 5, 5, 10)], { x: 0, y: 5, z: 0, yaw: 0 });
      let pressed = false;
      for (let i = 0; i < secs(4); i++) {
        const near = roll && !pressed && !d.state.player.onGround && d.state.player.pos.y < 0.6 && d.state.player.vel.y < 0;
        if (near) pressed = true;
        run(d.state, d.world, 1, { my: 1, pressed: near ? B.CROUCH : 0 }, collect);
      }
    }
    // Vault and hop.
    for (const [h, b] of [[1.0, B.SPRINT], [1.0, 0]] as const) {
      const v = setup([floor(), solid(-5, 0, b ? -3.6 : -10, 5, h, -3)], { x: 0, y: 0, z: 6, yaw: 0 });
      run(v.state, v.world, secs(1.2), { my: 1, buttons: b });
      for (let i = 0; i < secs(5); i++) {
        const near = v.state.player.pos.z - 0.25 + 3 <= 0.5;
        run(v.state, v.world, 1, { my: 1, buttons: b, pressed: near ? B.JUMP : 0 }, collect);
        if (near) break;
      }
      run(v.state, v.world, secs(1), { my: 1 }, collect);
    }
    // Wall kick along a wall.
    const w = setup([solid(-5, -1, 0, 5, 0, 40), solid(-5, -1, -40, 5, 0, -6), solid(-20, -12, -60, 20, -10, 60), solid(-1.2, -10, -40, -1.0, 4, 40)], { x: -0.5, y: 0, z: 30, yaw: 0 });
    sprintJumpAt(w.state, w.world, 0.05);
    run(w.state, w.world, 1, { my: 1, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP }, collect);
    // Jump into a wall: cling.
    const c = setup([floor(), solid(-5, 0, -30, 5, 8, -3)], { x: 0, y: 0, z: 4, yaw: 0 });
    for (let i = 0; i < secs(4) && c.state.player.pos.z > -1.6; i++) run(c.state, c.world, 1, { my: 1 });
    run(c.state, c.world, 1, { my: 1, pressed: B.JUMP, buttons: B.JUMP }, collect);
    run(c.state, c.world, secs(1), { my: 1, buttons: B.JUMP }, collect);
    // Grab, two-hand grab, release, pull-over, dyno, slip.
    const g = setup([floor(), solid(-2, 0, -30, 2, 4.0, -3), solid(-2, 1.9, -3, 2, 2.0, -2.85)], { x: 0, y: 0, z: -2.5, yaw: 0 });
    for (let i = 0; i < 5; i++) { aim(g.state, 0, 1.95, -2.85); run(g.state, g.world, 1, { buttons: LMB }, collect); }
    run(g.state, g.world, 3, { buttons: LMB | RMB }, collect);
    run(g.state, g.world, 2, {}, collect);
    for (let i = 0; i < 5; i++) { aim(g.state, 0, 1.95, -2.85); run(g.state, g.world, 1, { buttons: LMB }, collect); }
    run(g.state, g.world, secs(1.2), { buttons: LMB, my: 1 }, collect);
    run(g.state, g.world, 1, { buttons: LMB, pressed: B.JUMP }, collect);
    for (let i = 0; i < 30; i++) { aim(g.state, 0, 3.9, -3); run(g.state, g.world, 1, { buttons: RMB }, collect); }
    run(g.state, g.world, secs(2), { buttons: RMB, my: 1 }, collect);
    const sl2 = setup([floor(), solid(-2, 0, -30, 2, 2.0, -3), solid(-2, 2.0, -30, 2, 6, -3.4)], { x: 0, y: 0, z: -2.55, yaw: 0 });
    for (let i = 0; i < 5; i++) { aim(sl2.state, 0, 1.9, -3); run(sl2.state, sl2.world, 1, { buttons: LMB }); }
    run(sl2.state, sl2.world, secs(20), { buttons: LMB }, collect);
    const want = ['step-crawl', 'step-crouch', 'step-jog', 'step-sprint', 'jump', 'land', 'land-hard', 'roll', 'vault', 'hop', 'slide', 'wallkick', 'cling', 'grab', 'grab2', 'release', 'pullover', 'dyno', 'slip'];
    expect(want.filter(c => !cues.has(c))).toEqual([]);
    // Every cue has a sound.
    const src = fs.readFileSync('src/audio/moves.ts', 'utf8');
    for (const c of want) expect(src.includes(`'${c}'`) || src.includes(`  ${c}:`), c).toBe(true);
  });
});
