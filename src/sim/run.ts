// A new run: the hideout as Li Wei finds it on day 1 (DESIGN section 9).
import type { SimState } from './types';
import type { World } from '../world/world';
import { grid, addItem } from './inventory';
import { CONTAINER } from './containers';

export const STARTING_STASH: [string, number, number?][] = [
  ['noodles', 2], ['luncheon', 1], ['bread', 1, 1], ['water', 3], ['bandage', 1],
];

export function startRun(s: SimState, w: World) {
  const stash = w.inter.find(i => i.id === 'stash');
  if (stash) {
    const g = (s.containers.stash = grid(CONTAINER.stash.w, CONTAINER.stash.h));
    for (const [id, n, ageDays] of STARTING_STASH) addItem(s, g, id, n, ageDays ? { made: s.time - ageDays * 86400 } : {});
    s.wstate.searched.stash = true;
  }
  s.shelter = { id: 'hideout', battery: 60, compromised: false };
}
