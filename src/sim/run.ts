// A new run (U-013, U-018): day 1, 06:00, Li Wei wakes in his friends' old hideout under the vent grate with his
// backpack, their crate and nothing else (DESIGN section 9). The furnished shelter stays as a test scene (furnish).
import type { SimState } from './types';
import type { World } from '../world/world';
import { grid, addItem, newUid, type Grid } from './inventory';
import { onUseId } from './use';
import { VOICEMAIL } from '../data/dialogue';
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
  // In the family flat in upper Shibati (M3-19): his father's badge, and the phone, nearly flat, with its voicemail.
  for (const f of w.features) if (f.kind === 'li:badge' || f.kind === 'li:phone') {
    const id = f.kind.slice(3);
    s.dropped.push({ stack: { uid: newUid(s), id, n: 1, x: 0, y: 0, rot: false, ...(id === 'phone' ? { charge: 6 } : {}) }, x: f.x, y: f.y, z: f.z });
  }
  s.events.length = 0;
}

/** The phone plays its one voicemail, while it has charge. */
onUseId('phone', (s, _w, st) => {
  if ((st.charge ?? 0) <= 0) { s.events.push({ t: 'msg', text: 'the phone is dead' }); return; }
  st.charge = Math.max(0, (st.charge ?? 0) - 1);
  for (const l of VOICEMAIL) s.events.push({ t: 'say', id: l.id });
});

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
