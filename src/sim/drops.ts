// Dropping things (M3-72): a stack dragged out of the backpack falls at his feet and lies there until he picks it
// up again. Whatever lies about is a trace of him (the start hideout's grate).
import { onCmd } from './commands';
import { takeStack, findSpot } from './inventory';
import { onInteract, extraInters } from './interact';
import { item } from '../data/items';
import { raycast } from '../world/geom';

const ID = 'drop:';

onCmd((s, c, w) => {
  if (c.c !== 'drop' || s.dead) return;
  const stack = takeStack(s.inv.pack, c.uid);
  if (!stack) return;
  // It falls to whatever is under him.
  const p = s.player, hit = raycast(w.index, p.pos.x, p.pos.y + 0.2, p.pos.z, 0, -1, 0, 60);
  s.dropped.push({ stack, x: p.pos.x, y: hit ? p.pos.y + 0.2 - hit.t : p.pos.y, z: p.pos.z });
  s.events.push({ t: 'sfx', id: 'drop' });
  s.events.push({ t: 'noise', x: p.pos.x, y: p.pos.y, z: p.pos.z, r: 2, kind: 'drop' });
});

extraInters.push(s => s.dropped.map(d => {
  const it = item(d.stack.id);
  return { id: ID + d.stack.uid, kind: 'pickup', x: d.x, y: d.y + 0.1, z: d.z, r: 0.45, zh: '捡起' + it.zh, en: 'Pick up ' + it.en };
}));

// Back into the backpack where it fits (its hotbar binding still holds its uid).
onInteract('pickup', {
  now: (s, _w, it) => {
    const i = s.dropped.findIndex(d => ID + d.stack.uid === it.id);
    if (i < 0) return;
    const st = s.dropped[i].stack, spot = findSpot(s.inv.pack, st.id);
    if (!spot) { s.events.push({ t: 'msg', text: 'no room' }); return; }
    Object.assign(st, spot);
    s.inv.pack.items.push(st);
    s.dropped.splice(i, 1);
  },
});
