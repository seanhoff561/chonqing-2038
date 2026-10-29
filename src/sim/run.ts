// A new run (U-013): day 1, 06:00, Li Wei in the street with his backpack and no shelter (DESIGN section 9).
// The furnished air-raid shelter of earlier builds stays as a test scene (furnish).
import type { SimState } from './types';
import type { World } from '../world/world';
import { grid, addItem, type Grid } from './inventory';
import { CONTAINER } from './containers';

export const STARTING_SUPPLIES: [string, number, number?][] = [
  ['noodles', 2], ['luncheon', 1], ['bread', 1, 1], ['water', 3], ['bandage', 1],
];

const supply = (s: SimState, g: Grid) => {
  for (const [id, n, ageDays] of STARTING_SUPPLIES) addItem(s, g, id, n, ageDays ? { made: s.time - ageDays * 86400 } : {});
};

export function startRun(s: SimState) {
  supply(s, s.inv.pack);
  s.shelter = { id: '', x: 0, y: 0, z: 0, battery: 0, compromised: false };
}

/** The furnished test shelter: supplies in its stash and a car battery at 60%. */
export function furnish(s: SimState, w: World) {
  if (w.inter.some(i => i.id === 'stash')) {
    supply(s, (s.containers.stash = grid(CONTAINER.stash.w, CONTAINER.stash.h)));
    s.wstate.searched.stash = true;
  }
  const bed = w.inter.find(i => i.kind === 'mattress');
  s.shelter = { id: bed?.id ?? '', x: bed?.x ?? 0, y: bed?.y ?? 0, z: bed?.z ?? 0, battery: 60, compromised: false };
}
