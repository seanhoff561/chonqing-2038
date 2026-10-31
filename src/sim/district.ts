// Each district's alert (M4-12, DESIGN section 5), from what its machines know: Unaware; Suspicious while one of them
// is (it saw something, or heard him); Engaged the moment one has him (awareness 1) in sight, and kept so while any
// Engaged one sees him; Searching once none has for 4 s; Heightened when 150 s pass after the last contact without
// another, until 06:00; then Unaware again. A fresh sighting while Searching is Engaged again; suspicion while
// Heightened is Suspicious, and back to Heightened when it's over.
import type { SimState } from './types';
import type { World } from '../world/world';
import { STATIC } from '../data/units';
import { unitPose } from './units';
import { districtAt } from '../world/yuzhong/lots';
import { SCALE, GAME_PER_TICK, nextHour } from './clock';

export type Alert = 'unaware' | 'suspicious' | 'engaged' | 'searching' | 'heightened';
/** A district's alert: its state and since when, its last contact with him, and how long it stays Heightened (game
 *  seconds). */
export interface District { state: Alert; since: number; contact: number; until: number }
/** Real seconds without contact before Searching, and before the search ends; the hour Heightened lifts. */
export const DISTRICT = { lost: 4, search: 150, calm: 6 };

/** Which district a place is in: the city's, round its landmarks (anywhere else one, 'yuzhong'). */
export const districtOf = (w: World, x: number, z: number) => (w.ground ? districtAt(x, z).district : 'yuzhong');

export const alertOf = (s: SimState, d: string): Alert => s.hive.districts[d]?.state ?? 'unaware';

/** Ten times a second: each district's state from its units that aren't Unaware (where each is now). */
export function stepDistricts(s: SimState, w: World) {
  if (s.tick % 6) return;
  const aware = new Set<string>(), seen = new Map<string, number>();
  for (const u of s.units) {
    if (u.state === 'unaware') continue;
    const at = STATIC.has(u.kind) ? w.cameras[u.cam!] : unitPose(w, u, s.time), d = districtOf(w, at.x, at.z);
    aware.add(d);
    if ((u.aware ?? 0) >= 1 && u.saw !== undefined && s.time - u.saw <= 6 * GAME_PER_TICK + 1e-6) seen.set(d, Math.max(seen.get(d) ?? 0, u.saw));
  }
  const all = new Set([...Object.keys(s.hive.districts), ...aware]);
  for (const k of [...all].sort()) {
    const D = (s.hive.districts[k] ??= { state: 'unaware', since: s.time, contact: s.time, until: 0 });
    const to = (state: Alert) => { if (D.state !== state) { D.state = state; D.since = s.time; } };
    const calm = () => to(s.time < D.until ? 'heightened' : 'unaware');
    const lost = (s.time - D.contact) / SCALE;
    if (seen.has(k)) { D.contact = seen.get(k)!; to('engaged'); }
    else if (D.state === 'engaged') { if (lost >= DISTRICT.lost) to('searching'); }
    else if (D.state === 'searching') { if (lost >= DISTRICT.search) { D.until = nextHour(s.time, DISTRICT.calm); to('heightened'); } }
    else if (aware.has(k)) to('suspicious');
    else calm();
    if (D.state === 'unaware') delete s.hive.districts[k];
  }
}
