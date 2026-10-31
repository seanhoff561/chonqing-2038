// The humanoids hunt him as soldiers would (M4-10, U-031): one that notices him calls the others near it, who come to
// the place; the second and third come round it from the sides; fighting him they get behind cover where they can
// still see him; and where he was, they don't just look about, they go through the hiding places near it, one by
// one.
import type { SimState } from './types';
import type { World } from '../world/world';
import { raycast } from '../world/geom';
import { unitPose, type Unit } from './units';

type V3 = { x: number; y: number; z: number };
export const SQUAD = { call: 60, flank: 7, search: 15, spots: 3, look: 3, cover: [3, 6, 9] };

/** One that's noticed him calls the humanoids within 60 m that haven't: they come to where it saw him. */
export function callOut(s: SimState, w: World, u: Unit) {
  const at = unitPose(w, u, s.time);
  s.events.push({ t: 'call', x: at.x, y: at.y + 1.6, z: at.z });
  for (const o of s.units) {
    if (o === u || o.kind !== 'humanoid' || o.convoy || o.state !== 'unaware') continue;
    const p = unitPose(w, o, s.time);
    if (!p.active || Math.hypot(p.x - at.x, p.z - at.z) > SQUAD.call) continue;
    o.aware = Math.max(o.aware ?? 0, 0.35);
    o.seen = { ...u.seen! };
  }
}

/** Where a humanoid going to a place comes round from: if others are already on their way to it, a point to one side
 *  of it (the next to the other side), 7 m off the way it comes in. */
export function flankPoint(s: SimState, w: World, u: Unit, from: V3, to: V3): V3 | null {
  const k = s.units.filter(o => o !== u && o.kind === 'humanoid' && o.trip && !o.trip.back && o.trip.path.length && Math.hypot(o.trip.path[o.trip.path.length - 1].x - to.x, o.trip.path[o.trip.path.length - 1].z - to.z) < 5).length;
  if (!k) return null;
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz) || 1, side = k % 2 ? 1 : -1;
  // Off to the side of the place, a little short of it.
  const p = { x: to.x - (dx / d) * 2 + (-dz / d) * side * SQUAD.flank, y: to.y, z: to.z - (dz / d) * 2 + (dx / d) * side * SQUAD.flank };
  const down = raycast(w.index, p.x, p.y + 2, p.z, 0, -1, 0, 4);
  return down ? { ...p, y: p.y + 2 - down.t } : null;
}

/** The hiding places within 15 m of where he was, nearest first: up to three to go through. */
export function searchSpots(w: World, at: V3): V3[] {
  return w.hides.map(h => ({ x: (h.inner.x0 + h.inner.x1) / 2, y: h.inner.y0, z: (h.inner.z0 + h.inner.z1) / 2 }))
    .filter(p => Math.hypot(p.x - at.x, p.z - at.z) < SQUAD.search && Math.abs(p.y - at.y) < 3)
    .sort((a, b) => Math.hypot(a.x - at.x, a.z - at.z) - Math.hypot(b.x - at.x, b.z - at.z)).slice(0, SQUAD.spots);
}

/** Cover near a humanoid fighting him: a spot 3-9 m off it, reached straight, with ground under it, where something
 *  stands between him and its body (at 1 m) but it can see him over or past it (from 1.7 m); nearest him first. */
export function coverNear(s: SimState, w: World, from: V3): V3 | null {
  const eye = { x: s.player.pos.x, y: s.player.pos.y + 1.5, z: s.player.pos.z };
  let best: V3 | null = null, bd = Infinity;
  for (const r of SQUAD.cover) for (let a = 0; a < 8; a++) {
    const x = from.x + Math.cos((a * Math.PI) / 4) * r, z = from.z + Math.sin((a * Math.PI) / 4) * r;
    const down = raycast(w.index, x, from.y + 2, z, 0, -1, 0, 4);
    if (!down) continue;
    const p = { x, y: from.y + 2 - down.t, z };
    if (Math.abs(p.y - from.y) > 0.5 || !clear(w, { ...from, y: from.y + 1 }, { ...p, y: p.y + 1 })) continue;
    if (clear(w, eye, { ...p, y: p.y + 1 }) || !clear(w, { ...p, y: p.y + 1.7 }, eye)) continue;
    const d = Math.hypot(p.x - eye.x, p.z - eye.z);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function clear(w: World, a: V3, b: V3) {
  const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  return d < 0.05 || !raycast(w.index, a.x, a.y, a.z, (b.x - a.x) / d, (b.y - a.y) / d, (b.z - a.z) / d, d - 0.05);
}
