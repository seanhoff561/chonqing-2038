// Doors: open and close with E; their collision solid switches with them. Locked doors need their key.
import type { SimState } from './types';
import type { World, Inter } from '../world/world';
import { onInteract } from './interact';
import { has } from './inventory';
import { overlaps } from '../world/geom';
import { boxAt } from './physics';
import { movement as M } from '../data/movement';

export const doorSolid = (it: Inter) => it.data?.solid as number;

/** Make the collision index match the dynamic world state (after load, or after a change). */
export function syncWorld(s: SimState, w: World) {
  for (const it of w.inter) {
    if (it.kind !== 'door') continue;
    w.index.off[doorSolid(it)] = s.wstate.open[it.id] ? 1 : 0;
  }
}

onInteract('door', {
  can: (s, it) => {
    const key = it.data?.key as string | undefined;
    if (!s.wstate.open[it.id] && key && !s.wstate.unlocked?.[it.id] && !has(s.inv.pack, key)) return 'locked';
    return null;
  },
  now: (s, w, it) => {
    const open = !s.wstate.open[it.id];
    if (!open) {
      // Don't shut a door on him.
      w.index.off[doorSolid(it)] = 0;
      const p = s.player;
      if (overlaps(w.index, boxAt(p.pos.x, p.pos.y, p.pos.z, M.height[p.posture]))) { w.index.off[doorSolid(it)] = 1; return; }
    }
    s.wstate.open[it.id] = open;
    if (it.data?.key) (s.wstate.unlocked ??= {})[it.id] = true;
    w.index.off[doorSolid(it)] = open ? 1 : 0;
    s.events.push({ t: 'sfx', id: open ? 'door-open' : 'door-close' });
    s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: 4, kind: 'door' });
  },
});
