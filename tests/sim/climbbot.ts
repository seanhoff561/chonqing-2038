// A climbing bot for the tests (M3-57a, M3-67): up a pole, pipe or ladder hand over hand, as a player would with the
// mouse.
import type { SimState } from '../../src/sim/types';
import type { Climbable, World } from '../../src/world/world';
import { run, secs, aim, LMB, RMB } from './helpers';

const bits: number[] = [LMB, RMB];

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
