// Searchable containers and the stash: hold E to search (time and noise by type), then they open beside the backpack.
import type { SimState } from './types';
import type { Inter } from '../world/world';
import { onInteract } from './interact';
import { grid, addItem } from './inventory';

export const CONTAINER = {
  drawer: { w: 4, h: 3, time: 1.5, noise: 3 },
  cabinet: { w: 5, h: 4, time: 2.0, noise: 4 },
  locker: { w: 4, h: 6, time: 2.0, noise: 6 },
  crate: { w: 6, h: 4, time: 2.5, noise: 5 },
  fridge: { w: 4, h: 5, time: 1.5, noise: 4 },
  car: { w: 6, h: 3, time: 3.0, noise: 6 },
  stash: { w: 10, h: 8, time: 0, noise: 0 },
} as const;
export type ContainerType = keyof typeof CONTAINER;

const typeOf = (it: Inter) => ((it.data?.type as ContainerType) ?? 'crate');

/** Fills a container's grid the first time it's searched. Loot tables plug in here. */
export let fillContainer = (s: SimState, it: Inter) => {
  const g = s.containers[it.id];
  for (const [id, n] of (it.data?.items as [string, number][] | undefined) ?? []) addItem(s, g, id, n);
};
export const setFiller = (f: typeof fillContainer) => { fillContainer = f; };

function open(s: SimState, it: Inter) {
  if (!s.containers[it.id]) {
    const t = CONTAINER[typeOf(it)];
    s.containers[it.id] = grid(t.w, t.h);
    fillContainer(s, it);
  }
  s.wstate.searched[it.id] = true;
  s.openContainer = it.id;
  s.events.push({ t: 'open', id: it.id });
}

onInteract('container', {
  dur: (s, it) => (s.wstate.searched[it.id] ? 0 : CONTAINER[typeOf(it)].time),
  now: (s, _w, it) => open(s, it),
  done: (s, _w, it) => {
    const t = CONTAINER[typeOf(it)];
    if (t.noise) s.events.push({ t: 'noise', x: it.x, y: it.y, z: it.z, r: t.noise, kind: 'search' });
    open(s, it);
  },
});

/** Walking away closes an open container. */
export function stepContainers(s: SimState, w: { inter: Inter[] }) {
  if (!s.openContainer) return;
  const it = w.inter.find(i => i.id === s.openContainer);
  if (!it || Math.hypot(it.x - s.player.pos.x, it.z - s.player.pos.z) > 3) s.openContainer = null;
}
