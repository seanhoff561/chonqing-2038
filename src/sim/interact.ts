// Interactions: what he's looking at within reach, F to act (U-032), hold-F timed actions that break if interrupted.
import { B, DT, type InputFrame, type SimState } from './types';
import type { World, Inter } from '../world/world';
import { movement as M } from '../data/movement';
import { raycast } from '../world/geom';

export const REACH = 2.0;
/** the hold-E task that lies him down to sleep rough, and its length in seconds */
export const ROUGH = 'rough', ROUGH_HOLD = 1.2;

type Handler = (s: SimState, w: World, it: Inter) => void;
const handlers = new Map<string, { now?: Handler; done?: Handler; dur?: (s: SimState, it: Inter) => number; can?: (s: SimState, it: Inter) => string | null }>();

/**
 * Register a kind. `dur` > 0 makes it a hold-E action that calls `done` when finished; otherwise `now` runs at once.
 * `can` returns null when allowed or a short reason shown instead of acting.
 */
export function onInteract(kind: string, h: { now?: Handler; done?: Handler; dur?: (s: SimState, it: Inter) => number; can?: (s: SimState, it: Inter) => string | null }) {
  handlers.set(kind, h);
}

/** Interactables that live in sim state rather than the static world (placed furniture). */
export const extraInters: ((s: SimState) => Inter[])[] = [];

/** Every interactable: the world's and the ones in state. */
export function allInters(s: SimState, w: World): Inter[] {
  return extraInters.length ? w.inter.concat(...extraInters.map(f => f(s))) : w.inter;
}

function eye(s: SimState) {
  const p = s.player;
  return { x: p.pos.x, y: p.pos.y + M.eye[p.posture], z: p.pos.z };
}

/** The world's interactables in 8 m cells (built on first use, rebuilt if the list grows), and the widest reach
 *  of any: a look only scans the cells round him (M3-38 made them many). */
const grids = new WeakMap<Inter[], { n: number; r: number; cells: Map<number, Inter[]> }>();
const CELL = 8, key = (i: number, j: number) => i * 65536 + j;
function near(s: SimState, w: World, x: number, z: number, d: number): Inter[] {
  let g = grids.get(w.inter);
  if (!g || g.n !== w.inter.length) {
    g = { n: w.inter.length, r: 0, cells: new Map() };
    for (const it of w.inter) {
      const k = key(Math.floor(it.x / CELL), Math.floor(it.z / CELL)), a = g.cells.get(k);
      if (a) a.push(it); else g.cells.set(k, [it]);
      g.r = Math.max(g.r, it.r);
    }
    grids.set(w.inter, g);
  }
  const out: Inter[] = extraInters.length ? ([] as Inter[]).concat(...extraInters.map(f => f(s))) : [];
  const m = d + g.r;
  for (let i = Math.floor((x - m) / CELL); i <= Math.floor((x + m) / CELL); i++) for (let j = Math.floor((z - m) / CELL); j <= Math.floor((z + m) / CELL); j++) {
    const a = g.cells.get(key(i, j));
    if (a) for (const it of a) out.push(it);
  }
  return out;
}

/** The interactable he's looking at: nearest to the look ray within reach and not behind a wall. */
export function lookTarget(s: SimState, w: World): Inter | null {
  const p = s.player, e = eye(s);
  const dx = -Math.sin(p.yaw) * Math.cos(p.pitch), dy = Math.sin(p.pitch), dz = -Math.cos(p.yaw) * Math.cos(p.pitch);
  let best: Inter | null = null, bestScore = Infinity;
  for (const it of near(s, w, e.x, e.z, REACH)) {
    if (s.wstate.gone[it.id]) continue;
    const vx = it.x - e.x, vy = it.y - e.y, vz = it.z - e.z;
    const along = vx * dx + vy * dy + vz * dz;
    if (along < 0 || along > REACH + it.r) continue;
    const off = Math.hypot(vx - dx * along, vy - dy * along, vz - dz * along);
    if (off > it.r) continue;
    const hit = raycast(w.index, e.x, e.y, e.z, dx, dy, dz, along);
    if (hit && hit.t < along - it.r - 0.05) continue;
    const score = off + along * 0.1;
    if (score < bestScore) { bestScore = score; best = it; }
  }
  return best;
}

/** Runs before movement. Consumes the E press when it lands on an interactable. */
export function stepInteract(s: SimState, w: World, input: InputFrame) {
  const p = s.player;
  if (p.mode === 'dead') return;
  const task = s.task;
  if (task?.id === ROUGH) {
    // Holding E on open floor lays him down to sleep rough (U-013); moving, hiding or a target cancels it.
    if (!(input.buttons & B.INTERACT) || p.mode !== 'ground' || lookTarget(s, w) || Math.hypot(p.vel.x, p.vel.z) > 0.5) { s.task = null; return; }
    task.t += DT;
    if (task.t >= task.dur) { s.task = null; s.events.push({ t: 'sleep-menu', id: ROUGH }); }
    return;
  }
  if (task) {
    const it = allInters(s, w).find(i => i.id === task.id);
    const still = it && lookTarget(s, w)?.id === it.id;
    if (!(input.buttons & B.INTERACT) || !still || p.mode !== 'ground') { s.task = null; s.events.push({ t: 'msg', text: 'interrupted' }); return; }
    task.t += DT;
    if (task.t >= task.dur) { s.task = null; handlers.get(it!.kind)?.done?.(s, w, it!); }
    input.pressed &= ~B.INTERACT;
    return;
  }
  const it = p.mode === 'ground' || p.mode === 'swim' ? lookTarget(s, w) : null;
  s.target = it?.id ?? null;
  // E with nothing in view starts the rough-sleep hold, leaving the press for hiding in a box.
  if (!it && (input.pressed & B.INTERACT) && p.mode === 'ground') { s.task = { id: ROUGH, t: 0, dur: ROUGH_HOLD }; return; }
  if (!it || !(input.pressed & B.INTERACT)) return;
  input.pressed &= ~B.INTERACT;
  const h = handlers.get(it.kind);
  if (!h) return;
  const why = h.can?.(s, it) ?? null;
  if (why) { s.events.push({ t: 'msg', text: why }); return; }
  const dur = h.dur?.(s, it) ?? 0;
  if (dur > 0) s.task = { id: it.id, t: 0, dur };
  else h.now?.(s, w, it);
}
