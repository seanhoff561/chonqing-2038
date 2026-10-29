// Interactions: what he's looking at within reach, E to act, hold-E timed actions that break if interrupted.
import { B, DT, type InputFrame, type SimState } from './types';
import type { World, Inter } from '../world/world';
import { movement as M } from '../data/movement';
import { raycast } from '../world/geom';

export const REACH = 2.0;

type Handler = (s: SimState, w: World, it: Inter) => void;
const handlers = new Map<string, { now?: Handler; done?: Handler; dur?: (s: SimState, it: Inter) => number; can?: (s: SimState, it: Inter) => string | null }>();

/**
 * Register a kind. `dur` > 0 makes it a hold-E action that calls `done` when finished; otherwise `now` runs at once.
 * `can` returns null when allowed or a short reason shown instead of acting.
 */
export function onInteract(kind: string, h: { now?: Handler; done?: Handler; dur?: (s: SimState, it: Inter) => number; can?: (s: SimState, it: Inter) => string | null }) {
  handlers.set(kind, h);
}

function eye(s: SimState) {
  const p = s.player;
  return { x: p.pos.x, y: p.pos.y + M.eye[p.posture], z: p.pos.z };
}

/** The interactable he's looking at: nearest to the look ray within reach and not behind a wall. */
export function lookTarget(s: SimState, w: World): Inter | null {
  const p = s.player, e = eye(s);
  const dx = -Math.sin(p.yaw) * Math.cos(p.pitch), dy = Math.sin(p.pitch), dz = -Math.cos(p.yaw) * Math.cos(p.pitch);
  let best: Inter | null = null, bestScore = Infinity;
  for (const it of w.inter) {
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
  if (task) {
    const it = w.inter.find(i => i.id === task.id);
    const still = it && lookTarget(s, w)?.id === it.id;
    if (!(input.buttons & B.INTERACT) || !still || p.mode !== 'ground') { s.task = null; s.events.push({ t: 'msg', text: 'interrupted' }); return; }
    task.t += DT;
    if (task.t >= task.dur) { s.task = null; handlers.get(it!.kind)?.done?.(s, w, it!); }
    input.pressed &= ~B.INTERACT;
    return;
  }
  const it = p.mode === 'ground' || p.mode === 'swim' ? lookTarget(s, w) : null;
  s.target = it?.id ?? null;
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
