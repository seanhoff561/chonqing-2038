// The Li family flat (M3-19, DESIGN section 13): a flat on an upper floor nearest the top of Shibati's stair, its
// room gone through: drawers pulled out and tipped, chairs over, papers, clothes and books across the floor, broken glass,
// the family photo face down. His father's work badge and the cracked phone with its one voicemail lie on its
// floor (put there when a run starts, sim/run.ts, from the 'li:' features).
import type { World } from '../world';
import { raycast, solid } from '../geom';
import { MAT } from '../mats';
import { heightAt } from '../heightfield';
import { districtAt } from './lots';
import { makeRng, rand, randInt } from '../../sim/rng';

/** Free floor in the room round a flat's point, at its floor's height: points 0.5 m apart within 4.5 m that are
 *  floor (headroom over them, nothing within 0.3 m) and seen from the point. */
function floorAround(w: World, x: number, y: number, z: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = -9; i <= 9; i++) for (let j = -9; j <= 9; j++) {
    const px = x + i * 0.5, pz = z + j * 0.5, d = Math.hypot(px - x, pz - z);
    if (d > 4.5) continue;
    const down = raycast(w.index, px, y + 1, pz, 0, -1, 0, 1.3);
    if (!down || Math.abs(down.t - 1) > 0.12) continue;
    const up = raycast(w.index, px, y + 1, pz, 0, 1, 0, 1.5);
    if (up && up.t < 1.1) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => raycast(w.index, px, y + 0.3, pz, a, 0, b, 0.3))) continue;
    if (d > 0.1 && raycast(w.index, x, y + 1.2, z, (px - x) / d, 0, (pz - z) / d, d)) continue;
    out.push([px, pz]);
  }
  return out;
}

export function liFlat(w: World) {
  const top = w.teleports.find(t => t.name === 'Shibati top')!, g = w.ground!;
  // A living room or bedroom on an upper floor (not the ground floor) of a house in Shibati, the nearest to the top
  // of the stair with room to turn over: from the corner its feature marks, across to the far one.
  const rooms = w.features.filter(f => (f.kind === 'inside:living' || f.kind === 'inside:bedroom') && districtAt(f.x, f.z).district === 'shibati' && f.y > (heightAt(g, f.x, f.z) ?? 0) + 2.5)
    .map(f => ({ x: f.x + f.nx! / 2, y: f.y, z: f.z + f.nz! / 2 }))
    .sort((a, b) => Math.hypot(a.x - top.x, a.z - top.z) - Math.hypot(b.x - top.x, b.z - top.z));
  for (const s of rooms) {
    const free = floorAround(w, s.x, s.y, s.z);
    if (free.length < 24) continue;
    const r = makeRng(7), take = () => free.splice(randInt(r, free.length), 1)[0];
    const prop = (kind: string, wd: number, h: number, d: number, fallen = false) => { const [x, z] = take(); w.props.push({ kind: `f:${kind}`, x, y: s.y, z, yaw: rand(r) * Math.PI * 2, w: wd, h, d, ...(fallen ? { text: 'fallen' } : {}) }); };
    // What they kept, thrown down; what they couldn't carry, tipped over.
    prop('drawer', 0.9, 0.8, 0.5, true);
    prop('chair', 0.45, 0.9, 0.45, true);
    prop('chair', 0.45, 0.9, 0.45, true);
    prop('box', 0.5, 0.35, 0.4, true);
    for (let i = 0; i < 4; i++) prop('papers', 0.5, 0.02, 0.4);
    for (let i = 0; i < 3; i++) prop('clothes', 0.6, 0.05, 0.5);
    prop('books', 0.4, 0.2, 0.3);
    // Broken glass from the cabinet's doors and the window, and the family photo face down in its frame.
    for (let i = 0; i < 6; i++) { const [x, z] = take(), a = 0.05 + rand(r) * 0.12; w.decor.push({ ...solid(x - a, s.y + 0.03, z - a * 0.6, x + a, s.y + 0.04, z + a * 0.6, MAT.glass), inner: true }); }
    const [px, pz] = take();
    w.decor.push({ ...solid(px - 0.17, s.y + 0.03, pz - 0.13, px + 0.17, s.y + 0.055, pz + 0.13, MAT.wood), inner: true });
    // His father's badge and the phone, apart.
    const [bx, bz] = take(), [qx, qz] = take();
    w.features.push({ kind: 'li:badge', x: bx, y: s.y + 0.03, z: bz, group: w.features.length }, { kind: 'li:phone', x: qx, y: s.y + 0.03, z: qz, group: w.features.length + 1 });
    w.teleports.push({ name: 'Li family flat', x: s.x, y: s.y + 1.5, z: s.z, yaw: Math.atan2(s.x - bx, s.z - bz) });
    return s;
  }
  throw new Error('no flat for the Li family in upper Shibati');
}
