// A climbing bot for the tests (M3-57a, M3-67): up a pole, pipe or ladder hand over hand, and along a line of
// holds (stubs, floors, block edges) by reaches and dynos, as a player would with the mouse and Space.
import { B, type SimState } from '../../src/sim/types';
import type { Climbable, Feature, World } from '../../src/world/world';
import { run, secs, aim, LMB, RMB } from './helpers';

const bits: number[] = [LMB, RMB];
const ground = (s: SimState) => s.player.mode === 'ground';

/** Hand over hand up a climbable until a hand holds it within `stop` of its top (from the ground at its foot, or
 *  already on it); false if he never gets there. */
export function climbPole(s: SimState, w: World, c: Climbable, stop = 0.3): boolean {
  const p = s.player;
  let hand = 0;
  for (let step = 0; step < 80; step++) {
    if (p.hands.some(h => h.grip && h.grip.y >= c.y1 - stop)) return true;
    const held = p.hands.map((h, i) => (h.grip ? bits[i] : 0)).reduce((a, b) => a | b, 0);
    aim(s, c.x + c.nx * 0.08, Math.min(c.y1 - 0.05, p.pos.y + 2.2), c.z + c.nz * 0.08);
    run(s, w, 2, { buttons: held | bits[hand] });
    run(s, w, secs(1), { buttons: bits[hand], my: 1 });
    hand = 1 - hand;
  }
  return false;
}

/** Climb a line of holds in order: from standing (walk under the next, face it, jump and grab) or from hanging
 *  (pull up, aim, push off unless it's in reach, catch with the other hand); over a floor or a block's edge, let
 *  go below and pull over. `from`: the height of what he's hanging from, if he starts hanging. */
export function climbHolds(s: SimState, w: World, fs: Feature[], from = 0): { ok: boolean; got: number; at: string } {
  const p = s.player;
  // hand: the one holding on (the last to grab).
  let hand = p.hands[1].grip && !p.hands[0].grip ? 1 : 0, prev = from;
  const grab = (f: Feature, n = 50, extra = 0) => { for (let i = 0; i < n && !p.hands[hand].grip; i++) { aim(s, f.x - f.nx! * 0.01, f.y - 0.04, f.z - f.nz! * 0.01); run(s, w, 1, { buttons: bits[hand] | extra }); } return !!p.hands[hand].grip; };
  for (let k = 0; k < fs.length; k++) {
    const f = fs[k];
    if (ground(s)) {
      // On a roof, a deck or a broken floor's cornice: walk to under the hold (on a cornice, its edge), face it,
      // jump and grab. (Out of a hole, first out onto its cornice, then along it.)
      const out = k > 0 && fs[k - 1].kind === 'rest' ? 0.3 : 0.55;
      const walk = (x: number, z: number) => {
        for (let i = 0; i < secs(6) && Math.hypot(p.pos.x - x, p.pos.z - z) > 0.12; i++) {
          const dx = x - p.pos.x, dz = z - p.pos.z;
          run(s, w, 1, { my: Math.min(1, Math.hypot(dx, dz) * 2), yaw: Math.atan2(-dx, -dz) });
        }
      };
      if (out < 0.5) { const o = (p.pos.x - f.x) * f.nx! + (p.pos.z - f.z) * f.nz!; walk(p.pos.x + f.nx! * (out - o), p.pos.z + f.nz! * (out - o)); }
      walk(f.x + f.nx! * out, f.z + f.nz! * out);
      p.yaw = Math.atan2(f.nx!, f.nz!);
      run(s, w, 5, { yaw: p.yaw });
      run(s, w, 1, { pressed: B.JUMP, buttons: B.JUMP });
      hand = 0;
      if (!grab(f, 40, B.JUMP)) return { ok: false, got: k, at: `jump to ${f.kind} ${f.y.toFixed(1)} from ${p.pos.y.toFixed(1)} ${p.mode} d ${Math.hypot(p.pos.x - f.x, p.pos.z - f.z).toFixed(2)}` };
    } else {
      run(s, w, secs(1.2), { buttons: bits[hand], my: 1 });
      aim(s, f.x - f.nx! * 0.01, f.y - 0.04, f.z - f.nz! * 0.01);
      const near = f.y - prev < 1.1, was = hand;
      if (!near) run(s, w, 1, { buttons: bits[was], pressed: B.JUMP });
      hand = 1 - hand;
      if (!grab(f, 50, near ? bits[was] : 0)) return { ok: false, got: k, at: `${near ? 'reach' : 'dyno'} to ${f.kind} ${f.y.toFixed(1)}` };
    }
    if (f.kind === 'rest' || f.kind === 'routeTop') {
      // Let go below, over the edge onto the floor or the roof, and get the grip back.
      run(s, w, secs(2.5), { buttons: LMB | RMB, my: 1 });
      if (!ground(s)) return { ok: false, got: k, at: `pull over ${f.kind} ${f.y.toFixed(1)}` };
      run(s, w, secs(3));
    }
    prev = f.y;
  }
  const last = fs[fs.length - 1];
  return { ok: ground(s) && Math.abs(p.pos.y - last.y) < 1.5 && !s.dead, got: fs.length, at: 'top' };
}
