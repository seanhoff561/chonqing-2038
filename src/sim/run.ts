// A new run (U-013, U-018): day 1, 06:00, Li Wei wakes in his friends' old hideout under the vent grate with his
// backpack, their crate and nothing else (DESIGN section 9). The furnished shelter stays as a test scene (furnish).
import type { SimState } from './types';
import type { World } from '../world/world';
import { grid, addItem, type Grid } from './inventory';
import { CONTAINER } from './containers';
import { claimBed } from './shelter';

export const STARTING_SUPPLIES: [string, number, number?][] = [
  ['noodles', 2], ['luncheon', 1], ['bread', 1, 1], ['water', 3], ['bandage', 1],
];

const supply = (s: SimState, g: Grid) => {
  for (const [id, n, ageDays] of STARTING_SUPPLIES) addItem(s, g, id, n, ageDays ? { made: s.time - ageDays * 86400 } : {});
};

/** What the friends left in their crate: a string of firecrackers, tape, a rag, a headlamp at 60%. */
export const FRIENDS_CRATE: [string, number, number?][] = [['firecrackers', 1], ['tape', 1], ['cloth', 1], ['headlamp', 1, 60]];
export const START_BED = 'airraid-mattress', START_CRATE = 'airraid-stash';

export function startRun(s: SimState, w: World) {
  supply(s, s.inv.pack);
  s.shelters = [];
  const bed = w.inter.find(i => i.id === START_BED);
  if (bed) claimBed(s, bed);
  if (w.inter.some(i => i.id === START_CRATE)) {
    const g = (s.containers[START_CRATE] = grid(CONTAINER.crate.w, CONTAINER.crate.h));
    for (const [id, n, charge] of FRIENDS_CRATE) addItem(s, g, id, n, charge ? { charge } : {});
    s.wstate.searched[START_CRATE] = true;
  }
  s.events.length = 0;
}

/** The furnished test shelter: supplies in its stash and a car battery at 60%. */
export function furnish(s: SimState, w: World) {
  if (w.inter.some(i => i.id === 'stash')) {
    supply(s, (s.containers.stash = grid(CONTAINER.stash.w, CONTAINER.stash.h)));
    s.wstate.searched.stash = true;
  }
  const bed = w.inter.find(i => i.kind === 'mattress');
  s.shelters = [];
  if (bed) claimBed(s, bed, 60);
  s.events.length = 0;
}
