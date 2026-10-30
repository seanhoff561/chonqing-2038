// Doors: open and close with E; their collision solid switches with them. Locked doors need their key; a locked
// or jammed one is forced with E held, loudly, and a chained one holds (M3-36). Windows' glass breaks out the same.
import type { SimState } from './types';
import type { World, Inter } from '../world/world';
import { onInteract } from './interact';
import { has } from './inventory';
import { overlaps } from '../world/geom';
import { boxAt } from './physics';
import { movement as M } from '../data/movement';

export const doorSolid = (it: Inter) => it.data?.solid as number;

/** Make the collision index match the dynamic world state (after load, or after a change): doors open, windows
 *  broken (M3-36), grates up (M3-72). */
export function syncWorld(s: SimState, w: World) {
  for (const it of w.inter) {
    if (it.kind !== 'door' && it.kind !== 'window' && it.kind !== 'grate') continue;
    if (doorSolid(it) >= 0) w.index.off[doorSolid(it)] = s.wstate.open[it.id] ? 1 : 0;
  }
}

/** Seconds to force a lock (M3-36): a lock wrenched out, a jammed door shouldered. */
const FORCE: Record<string, number> = { locked: 4, jammed: 2.5 };
const lockOf = (s: SimState, it: Inter) => (s.wstate.unlocked?.[it.id] ? undefined : (it.data?.lock as string | undefined));

function swing(s: SimState, w: World, it: Inter, loud = false) {
  const open = !s.wstate.open[it.id];
  if (!open) {
    // Don't shut a door on him.
    w.index.off[doorSolid(it)] = 0;
    const p = s.player;
    if (overlaps(w.index, boxAt(p.pos.x, p.pos.y, p.pos.z, M.height[p.posture]))) { w.index.off[doorSolid(it)] = 1; return; }
  }
  s.wstate.open[it.id] = open;
  if (it.data?.key || it.data?.lock) (s.wstate.unlocked ??= {})[it.id] = true;
  w.index.off[doorSolid(it)] = open ? 1 : 0;
  s.events.push({ t: 'sfx', id: loud ? 'force' : open ? 'door-open' : 'door-close' });
  s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: loud ? 14 : 4, kind: loud ? 'force' : 'door' });
}

onInteract('door', {
  can: (s, it) => {
    if (s.wstate.open[it.id]) return null;
    const key = it.data?.key as string | undefined;
    if (key && !s.wstate.unlocked?.[it.id] && !has(s.inv.pack, key)) return 'locked';
    // A chain through the handles: bolt cutters' work (M5-25).
    if (lockOf(s, it) === 'chained') return 'chained shut';
    return null;
  },
  // A locked or jammed door is forced: held, and loud.
  dur: (s, it) => (s.wstate.open[it.id] ? 0 : FORCE[lockOf(s, it) ?? ''] ?? 0),
  done: (s, w, it) => swing(s, w, it, true),
  now: (s, w, it) => swing(s, w, it),
});

// A window's glass (M3-36): broken out, held, loud; bars hold.
onInteract('window', {
  can: (s, it) => (s.wstate.open[it.id] ? 'broken' : null),
  dur: () => 1.2,
  done: (s, w, it) => {
    s.wstate.open[it.id] = true;
    w.index.off[doorSolid(it)] = 1;
    s.events.push({ t: 'sfx', id: 'glass' });
    s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: 18, kind: 'glass' });
  },
});
