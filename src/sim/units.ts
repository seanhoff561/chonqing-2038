// The machines on their beats (M4-01, DESIGN section 7). A unit is plain data: its kind, the beat it walks (world
// patrols), where in its loop this run starts it, and its state. While Unaware, where it is is a pure function of the
// game time: walking at its pace, out along its beat and back, pausing where the beat says, between the hours it keeps
// (parked at the beat's start otherwise). So sleeping skips time for free and he can learn exact timings. Movement
// runs in real seconds, the hours on the game clock.
import type { World, Patrol, Convoy } from '../world/world';
import { UNITS, PHASE, COLUMN, type UnitKind } from '../data/units';
import { makeRng, rand, hashString } from './rng';
import { SCALE, hourOf } from './clock';

export interface Unit {
  id: number; kind: UnitKind; /** the beat it walks (world patrols), or -1 in a column */ patrol: number; /** real seconds into its loop it starts */ phase: number; state: 'unaware';
  /** in a column (M4-01b): which way out of the factory, which of its squads in turn, which member of the squad */
  convoy?: { path: number; slot: number; member: number };
  /** how aware of him it is (M4-03): 0.3 suspicious, 1 engaged */
  aware?: number;
}
export interface Pose { x: number; y: number; z: number; yaw: number; active: boolean }

/** A beat as a timeline, out and back: pauses and walks, each from t0 for dur real seconds. */
type Leg = { t0: number; dur: number; a: number; b: number; yaw: number };
const timelines = new WeakMap<Patrol, { legs: Leg[]; T: number }>();
function timeline(p: Patrol, speed: number) {
  const hit = timelines.get(p);
  if (hit) return hit;
  const n = p.pts.length, stops = n > 1 ? [...Array(n).keys(), ...Array.from({ length: n - 2 }, (_, k) => n - 2 - k)] : [0], legs: Leg[] = [];
  let t = 0, yaw = 0;
  stops.forEach((a, k) => {
    const b = stops[(k + 1) % stops.length], pa = p.pts[a], pb = p.pts[b], d = Math.hypot(pb.x - pa.x, pb.y - pa.y, pb.z - pa.z);
    if (p.dwell[a] > 0) { legs.push({ t0: t, dur: p.dwell[a], a, b: a, yaw }); t += p.dwell[a]; }
    if (d > 0.01) { yaw = Math.atan2(pb.x - pa.x, pb.z - pa.z); legs.push({ t0: t, dur: d / speed, a, b, yaw }); t += d / speed; }
  });
  const tl = { legs, T: Math.max(t, 1e-3) };
  timelines.set(p, tl);
  return tl;
}

/** How long a unit's loop takes, out and back (real seconds). */
export const loopOf = (w: World, u: Unit) => timeline(w.patrols[u.patrol], UNITS[u.kind].patrol).T;

/** Each beat's walker, started somewhere in the first 8% of its loop by the run's seed; and each column's squads. */
export function createUnits(seed: number, w: World): Unit[] {
  const r = makeRng(hashString(`units${seed}`));
  const out: Unit[] = w.patrols.map((p, i) => ({ id: i, kind: p.unit, patrol: i, phase: rand(r) * PHASE * timeline(p, UNITS[p.unit].patrol).T, state: 'unaware' as const }));
  (w.convoys ?? []).forEach((c, path) => {
    for (let slot = 0; slot < column(c).slots; slot++) COLUMN.squad.forEach((m, member) => out.push({ id: out.length, kind: m.kind, patrol: -1, phase: 0, state: 'unaware', convoy: { path, slot, member } }));
  });
  return out;
}

/** A column's way: its length along, and how many squads are out on it at once (a squad leaves every COLUMN.every
 *  seconds; each takes the way's length at the pace, a bounding cycle and a detour's time to clear it). */
const columns = new WeakMap<Convoy, { s: number[]; L: number; slots: number }>();
function column(c: Convoy) {
  let hit = columns.get(c);
  if (hit) return hit;
  const s = [0];
  for (let i = 1; i < c.pts.length; i++) s.push(s[i - 1] + Math.hypot(c.pts[i].x - c.pts[i - 1].x, c.pts[i].z - c.pts[i - 1].z));
  const L = s[s.length - 1], transit = (L + 20) / COLUMN.pace + COLUMN.bound + 90;
  hit = { s, L, slots: Math.ceil(transit / COLUMN.every) };
  columns.set(c, hit);
  return hit;
}

/** How far along a fire team is, τ real seconds out: by bounds, double pace for half a cycle and holding for the
 *  other half, the two teams by turns (team 2 keeps the pace). */
function bounded(tau: number, team: number) {
  const { pace, bound: P } = COLUMN;
  if (team === 2) return pace * tau;
  const t = tau + (team ? P / 2 : 0), k = Math.floor(t / P);
  return pace * (k * P + 2 * Math.min(t - k * P, P / 2)) - (team ? pace * P : 0);
}

/** Where along a column's way, and to which side, a point is. */
function along(c: Convoy, s: number, side: number) {
  const { s: S } = column(c);
  let i = 1;
  while (i < S.length - 1 && S[i] < s) i++;
  const a = c.pts[i - 1], b = c.pts[i], seg = S[i] - S[i - 1] || 1, f = Math.min(1, Math.max(0, (s - S[i - 1]) / seg)), dx = (b.x - a.x) / seg, dz = (b.z - a.z) / seg;
  return { x: a.x + (b.x - a.x) * f + dz * side, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f - dx * side, yaw: Math.atan2(dx, dz) };
}

/** A column member at real time t: its squad out since it left the gate, in formation, bounding; the pair that peels
 *  off goes to the alley, looks, comes back and runs to catch up. Inside the factory (not yet out, or the squad gone
 *  out of the city) it isn't anywhere. */
function columnPose(w: World, u: Unit, t: number): Pose {
  const { path, slot, member } = u.convoy!, c = w.convoys![path], col = column(c), m = COLUMN.squad[member], cycle = col.slots * COLUMN.every;
  const since = t - slot * COLUMN.every, tau = ((since % cycle) + cycle) % cycle, squad = Math.floor(since / cycle);
  const none: Pose = { x: c.pts[0].x, y: c.pts[0].y, z: c.pts[0].z, yaw: 0, active: false };
  const place = (s: number): Pose => { if (s < 0 || s > col.L) return none; const a = along(c, s, m.side); return { ...a, y: a.y + (m.kind === 'drone' ? UNITS.drone.fly : 0), active: true }; };
  let s = bounded(tau, m.team) - m.back;
  const spur = COLUMN.peel.includes(member) && c.spurs.length ? c.spurs[(((squad * 7 + slot) % c.spurs.length) + c.spurs.length) % c.spurs.length] : null;
  if (spur && s >= spur.s) {
    // When it reached the turn-off: the first moment its place in the column passed it.
    let lo = 0, hi = tau;
    for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (bounded(mid, m.team) - m.back >= spur.s) hi = mid; else lo = mid; }
    const on = along(c, spur.s, m.side), d = Math.hypot(spur.at.x - on.x, spur.at.z - on.z), walk = d / UNITS.humanoid.patrol, back = hi + 2 * walk + COLUMN.look, dt = tau - hi;
    const lerp = (f: number, yaw: number): Pose => ({ x: on.x + (spur.at.x - on.x) * f, y: on.y + (spur.at.y - on.y) * f, z: on.z + (spur.at.z - on.z) * f, yaw, active: true });
    const out = Math.atan2(spur.at.x - on.x, spur.at.z - on.z);
    if (dt < walk) return lerp(dt / walk, out);
    if (dt < walk + COLUMN.look) return lerp(1, out);
    if (tau < back) return lerp(1 - (dt - walk - COLUMN.look) / walk, out + Math.PI);
    // Running to catch up, until it's back in its place.
    s = Math.min(s, spur.s + UNITS.humanoid.chase * (tau - back));
  }
  return place(s);
}

const keeps = ([a, b]: [number, number], h: number) => (a <= b ? h >= a && h < b : h >= a || h < b);

/** Where an Unaware unit is at a game time, and facing which way (its +z: yaw from +z toward +x). Columns march at
 *  all hours. */
export function unitPose(w: World, u: Unit, time: number): Pose {
  if (u.convoy) return columnPose(w, u, time / SCALE);
  const p = w.patrols[u.patrol], start = p.pts[0];
  if (!keeps(p.hours, hourOf(time))) return { x: start.x, y: start.y, z: start.z, yaw: 0, active: false };
  const { legs, T } = timeline(p, UNITS[u.kind].patrol), t = (((time / SCALE + u.phase) % T) + T) % T;
  let lo = 0, hi = legs.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (legs[m].t0 <= t) lo = m; else hi = m - 1; }
  const L = legs[lo], f = L.a === L.b ? 0 : Math.min(1, (t - L.t0) / L.dur), a = p.pts[L.a], b = p.pts[L.b];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, yaw: L.yaw, active: true };
}
