// Each district's alert (M4-12, DESIGN section 5), from what its machines know: Unaware; Suspicious while one of them
// is (it saw something, or heard him); Engaged the moment one has him (awareness 1) in sight, and kept so while any
// Engaged one sees him; Searching once none has for 4 s; Heightened when 150 s pass after the last contact without
// another, until 06:00; then Unaware again. A fresh sighting while Searching is Engaged again; suspicion while
// Heightened is Suspicious, and back to Heightened when it's over. The network (M4-13): a machine that has him tells
// it after its kind's delay (one switched off or jammed before then never does), and from then on, while any that has
// told it sees him, it knows where he is as he goes (the last known position); each time it's told, every machine in
// that district and every other within 300 m of him hears where.
import type { SimState } from './types';
import type { World } from '../world/world';
import { STATIC, SPREAD } from '../data/units';
import { unitPose, isOff, type Unit } from './units';
import { districtAt } from '../world/yuzhong/lots';
import { remember } from './hive';
import { SCALE, nextHour } from './clock';

type V3 = { x: number; y: number; z: number };

export type Alert = 'unaware' | 'suspicious' | 'engaged' | 'searching' | 'heightened';
/** A district's alert: its state and since when, its last contact with him (-1 none yet), and how long it stays
 *  Heightened (game seconds). */
export interface District { state: Alert; since: number; contact: number; until: number; /** a small search's radius (M4-17) */ cap?: number }
/** Real seconds without contact before Searching, and before the search ends; the hour Heightened lifts. */
export const DISTRICT = { lost: 4, search: 150, calm: 6 };

/** Which district a place is in: the city's, round its landmarks (anywhere else 'yuzhong'). */
export const districtOf = (x: number, z: number) => districtAt(x, z).district;
const where = (w: World, s: SimState, u: Unit): V3 => (STATIC.has(u.kind) ? w.cameras[u.cam!] : unitPose(w, u, s.time));

export const alertOf = (s: SimState, d: string): Alert => s.hive.districts[d]?.state ?? 'unaware';
/** The districts Heightened just now (M4-16): suspicion over it or not, until their 06:00. */
export const heightened = (s: SimState) => new Set(Object.keys(s.hive.districts).filter(k => s.hive.districts[k].until > s.time));

/** Ten times a second: what the machines that have him tell the network, and each district's state from its units
 *  that aren't Unaware (where each is now). */
export function stepDistricts(s: SimState, w: World) {
  if (s.tick % 6) return;
  const aware = new Set<string>(), told = new Map<string, { t: number; at: V3 }>();
  for (const u of s.units) {
    const off = isOff(s, u);
    // Out, or no longer Engaged: what it had to tell is lost (M4-17 has the hive notice a silence).
    if (off || u.state !== 'engaged') { u.cast = undefined; u.live = undefined; }
    if (off || u.state === 'unaware') continue;
    const d = districtOf(...xz(where(w, s, u)));
    aware.add(d);
    if (u.cast === undefined || s.time < u.cast || u.saw === undefined) continue;
    if (!u.live) { u.live = true; remember(s, u.seen!); }
    if (u.saw > (told.get(d)?.t ?? -1)) told.set(d, { t: u.saw, at: u.seen! });
  }
  const all = new Set([...Object.keys(s.hive.districts), ...aware]);
  for (const k of [...all].sort()) {
    const D = (s.hive.districts[k] ??= { state: 'unaware', since: s.time, contact: -1, until: 0 });
    const to = (state: Alert) => { if (D.state !== state) { D.state = state; D.since = s.time; if (state === 'engaged') D.cap = undefined; } };
    const c = told.get(k);
    if (c && c.t > D.contact) { D.contact = c.t; tell(s, w, k, c.t, c.at); }
    const lost = (s.time - D.contact) / SCALE;
    if (c && lost < DISTRICT.lost) to('engaged');
    else if (D.state === 'engaged') { if (lost >= DISTRICT.lost) to('searching'); }
    else if (D.state === 'searching') { if (lost >= DISTRICT.search) { D.until = nextHour(s.time, DISTRICT.calm); to('heightened'); } }
    else if (aware.has(k)) to('suspicious');
    else to(s.time < D.until ? 'heightened' : 'unaware');
    if (D.state === 'unaware') delete s.hive.districts[k];
  }
  // Heightened (M4-16): its extra walkers out (in once back from wherever they went), its idle cameras on.
  const H = heightened(s);
  for (const u of s.units) {
    if (u.extra) u.on = !!u.trip || H.has(districtOf(...xz(w.patrols[u.patrol].pts[0])));
    else if (u.cam !== undefined && w.cameras[u.cam].dark) u.on = H.has(districtOf(...xz(w.cameras[u.cam])));
  }
}

const xz = (p: V3): [number, number] => [p.x, p.z];

/** The network told where he was at t: its last known position, and the way he's going (from where he was when it
 *  last moved him a metre or more), passed to every machine in the district and every other within 300 m. */
function tell(s: SimState, w: World, k: string, t: number, at: V3) {
  const was = s.hive.lkp;
  if (was && t <= was.t) return;
  let hx = was?.hx ?? 0, hz = was?.hz ?? 0, ax = was?.ax ?? at.x, az = was?.az ?? at.z;
  const dx = at.x - ax, dz = at.z - az, d = Math.hypot(dx, dz);
  if (d >= 1) { hx = dx / d; hz = dz / d; ax = at.x; az = at.z; }
  s.hive.lkp = { x: at.x, y: at.y, z: at.z, t, hx, hz, ax, az };
  for (const u of s.units) {
    if (isOff(s, u)) continue;
    const p = where(w, s, u);
    if (Math.hypot(p.x - at.x, p.z - at.z) <= SPREAD || districtOf(p.x, p.z) === k) u.told = s.time;
  }
}
