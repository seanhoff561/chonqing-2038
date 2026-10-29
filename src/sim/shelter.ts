// Hideouts (U-013, U-018, DESIGN section 9): he starts in the friends' old one under the vent grate and makes
// more: claim a bed or lay one down, turn a table into a workbench with a toolbox, keep things in containers
// near the bed. A hideout is a claimed bed and everything within SHELTER_R of it; he can have any number.
import type { SimState, Shelter } from './types';
import type { World, Inter } from '../world/world';
import { onUseId } from './use';
import { onInteract, extraInters, lookTarget } from './interact';
import { raycast } from '../world/geom';
import { free } from './physics';
import { movement as M } from '../data/movement';
import { takeStack } from './inventory';
import { districtAt, DISTRICT_NAMES } from '../world/yuzhong/lots';

export const SHELTER_R = 15;
const PLACE_REACH = 3;

const BEDS = new Set(['bedroll', 'mattress']);

/** Placed furniture as interactables: beds to sleep in, crates to store things. */
function placedInters(s: SimState): Inter[] {
  return s.placed.map(p => BEDS.has(p.item)
    ? { id: p.id, kind: 'mattress', x: p.x, y: p.y + 0.2, z: p.z, r: 0.9, zh: '床', en: 'Bed' }
    : { id: p.id, kind: 'container', x: p.x, y: p.y + 0.4, z: p.z, r: 0.6, zh: '折叠箱', en: 'Crate', data: { type: 'crate' } });
}
extraInters.push(placedInters);

/** Claim a bed: a new hideout, or nothing if it's already one of his. */
export function claimBed(s: SimState, it: Inter, battery = 0) {
  if (s.shelters.some(h => h.id === it.id)) return;
  s.shelters.push({ id: it.id, x: it.x, y: it.y, z: it.z, battery, compromised: false });
  s.events.push({ t: 'msg', text: s.shelters.length > 1 ? 'another hideout' : 'your bed now' });
}

export const hasShelter = (s: SimState) => s.shelters.length > 0;
/** The hideout whose bed is nearest (x, y, z) within SHELTER_R, or null. */
export function shelterAt(s: SimState, x: number, y: number, z: number): Shelter | null {
  let best: Shelter | null = null, bd = SHELTER_R;
  for (const h of s.shelters) { const d = Math.hypot(x - h.x, y - h.y, z - h.z); if (d <= bd) { best = h; bd = d; } }
  return best;
}
export const inShelter = (s: SimState, x: number, y: number, z: number) => shelterAt(s, x, y, z) !== null;

/** A hideout's own storage: the containers nearer its bed than any other hideout's, within reach, and those of
 *  the room its bed is in. */
export function stashIds(s: SimState, w: World, h: Shelter | null = shelterAt(s, s.player.pos.x, s.player.pos.y, s.player.pos.z)): string[] {
  if (!h) return [];
  const room = w.sites.find(x => x.bed === h.id)?.containers ?? [];
  return w.inter.concat(placedInters(s)).filter(i => i.kind === 'container' && (shelterAt(s, i.x, i.y, i.z) === h || room.includes(i.id))).map(i => i.id);
}

export const isBench = (s: SimState, it: Inter) => it.kind === 'bench' || (it.kind === 'table' && !!s.wstate.benches?.[it.id]);

/** The floor point he's looking at within reach, with room above it, or null. */
function floorAhead(s: SimState, w: World): { x: number; y: number; z: number } | null {
  const p = s.player, ey = p.pos.y + M.eye[p.posture];
  const dx = -Math.sin(p.yaw) * Math.cos(p.pitch), dy = Math.sin(p.pitch), dz = -Math.cos(p.yaw) * Math.cos(p.pitch);
  const h = raycast(w.index, p.pos.x, ey, p.pos.z, dx, dy, dz, PLACE_REACH);
  if (!h || h.ny < 0.7) return null;
  const x = p.pos.x + dx * h.t, y = ey + dy * h.t, z = p.pos.z + dz * h.t;
  return free(w.index, x, y + 0.05, z, 0.5, 0.45) ? { x, y, z } : null;
}

function place(s: SimState, w: World, uid: number, item: string) {
  if (s.player.mode !== 'ground') return;
  const at = floorAhead(s, w);
  if (!at) { s.events.push({ t: 'msg', text: 'no room to put it down there' }); return; }
  takeStack(s.inv.pack, uid);
  s.inv.held = 0;
  const id = `placed${s.nextUid++}`;
  s.placed.push({ id, item, ...at, yaw: s.player.yaw });
  // Laying down a bed claims it.
  if (BEDS.has(item)) claimBed(s, placedInters(s).find(i => i.id === id)!);
}

for (const id of ['bedroll', 'mattress', 'foldcrate']) onUseId(id, (s, w, st) => place(s, w, st.uid, id));

onUseId('toolbox', (s, w, st) => {
  const t = lookTarget(s, w);
  if (!t || t.kind !== 'table') { s.events.push({ t: 'msg', text: 'put it on a table' }); return; }
  if (s.wstate.benches?.[t.id]) return;
  takeStack(s.inv.pack, st.uid);
  s.inv.held = 0;
  (s.wstate.benches ??= {})[t.id] = true;
  s.events.push({ t: 'msg', text: 'workbench set up' });
});

onInteract('table', {
  now: (s, _w, it) => { s.events.push({ t: 'msg', text: isBench(s, it) ? 'workbench' : 'a table: put a toolbox on it to make a workbench' }); },
});

/** His hideouts for the journal: where each is (district) and what its bed is, nearest first. */
export function hideoutList(s: SimState, w: World): { id: string; zh: string; en: string; place: [string, string]; dist: number }[] {
  const beds = allBeds(s, w), p = s.player.pos;
  return s.shelters.map(h => {
    const d = w.ground ? DISTRICT_NAMES[districtAt(h.x, h.z).district] : null;
    const b = beds.find(i => i.id === h.id);
    return { id: h.id, zh: b?.zh ?? '床', en: b?.en ?? 'Bed', place: d ?? ['城里', 'the city'] as [string, string], dist: Math.hypot(h.x - p.x, h.z - p.z) };
  }).sort((a, b) => a.dist - b.dist);
}
const allBeds = (s: SimState, w: World) => w.inter.concat(placedInters(s)).filter(i => i.kind === 'mattress');
