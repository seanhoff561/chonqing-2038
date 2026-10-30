// Breaches between buildings (M3-76, U-043): where two buildings' rooms or corridors end at walls facing each other
// across a party wall or a gap of a pace or so, at about the same height, a hole is knocked through both (a plank
// across any gap between), and the ant hill runs on from one building into the next without going outside. Each
// end is a 'party' feature the warren left (its outer face, out of it, at its floor); each breach leaves a pair of
// 'breach' features for the route network.
import { carve, turn, buildIndex, query, type Solid } from '../geom';
import { MAT } from '../mats';
import { WALL } from '../city/rooms';
import { member } from './crossings';
import type { Feature } from '../world';

/** How wide and high a breach is; the widest gap it spans; how far off square two ends may be; how far up or down. */
const W = 0.9, H = 1.9, GAP = 1.6, SIDE = 1.0, RISE = 1.0;

export function breaches(out: { solids: Solid[]; features: Feature[] }) {
  const ends = out.features.filter(f => f.kind === 'party'), cells = new Map<number, Feature[]>(), key = (x: number, z: number) => Math.floor(x / 4) * 100003 + Math.floor(z / 4);
  for (const f of ends) { const k = key(f.x, f.z), a = cells.get(k); if (a) a.push(f); else cells.set(k, [f]); }
  const idx = buildIndex(out.solids), used = new Set<Feature>(), ids: number[] = [];
  for (const a of ends) {
    if (used.has(a)) continue;
    const nx = a.nx!, nz = a.nz!;
    let best: Feature | null = null, bd = Infinity;
    for (const dx of [-4, 0, 4]) for (const dz of [-4, 0, 4]) for (const b of cells.get(key(a.x + dx, a.z + dz)) ?? []) {
      if (b === a || used.has(b) || b.nx! * nx + b.nz! * nz > -0.98 || Math.abs(b.y - a.y) > RISE) continue;
      const ex = b.x - a.x, ez = b.z - a.z, along = ex * nx + ez * nz, side = Math.abs(-ex * nz + ez * nx);
      if (along < -0.05 || along > GAP || side > SIDE || along + side >= bd) continue;
      bd = along + side; best = b;
    }
    if (!best) continue;
    used.add(a); used.add(best);
    // The hole: from a's room through both walls into b's, centred between the two ends, at the higher floor.
    const ex = best.x - a.x, ez = best.z - a.z, along = ex * nx + ez * nz, side = -ex * nz + ez * nx;
    const cx = a.x - nz * side / 2, cz = a.z + nx * side / 2, y0 = Math.max(a.y, best.y);
    const s0 = -WALL - 0.05, s1 = along + WALL + 0.05, yaw = Math.atan2(nz, nx);
    // In its own frame (x along a's outward normal from a's outer face, z across), turned into place.
    const hole = { x0: cx + s0, y0, z0: cz - W / 2, x1: cx + s1, y1: y0 + H, z1: cz + W / 2 };
    const r = Math.hypot(s1 - s0, W) + 1;
    for (const i of query(idx, cx - r, cz - r, cx + r, cz + r, ids).slice()) {
      const s = out.solids[i];
      if (!s.orig || s.y1 <= y0 || s.y0 >= y0 + H) continue;
      const pieces = cutTurned(s, hole, yaw, cx, cz);
      if (!pieces) continue;
      out.solids[i] = pieces[0] ?? { ...s, y1: s.y0 };
      out.solids.push(...pieces.slice(1));
    }
    if (along > 0.15) out.solids.push(member([a.x, y0, a.z], [a.x + nx * along, y0, a.z + nz * along], 0.8, 0.06, MAT.wood));
    const g = out.features.length;
    out.features.push({ kind: 'breach', x: a.x - nx * (WALL + 0.3), y: y0, z: a.z - nz * (WALL + 0.3), group: g, nx, nz },
      { kind: 'breach', x: a.x + nx * (along + WALL + 0.3), y: y0, z: a.z + nz * (along + WALL + 0.3), group: g, nx: -nx, nz: -nz });
  }
}

/** Carve a box given in a frame turned by `yaw` about (px, pz) out of a solid, if the solid's own frame is square to
 *  it (a building's pieces are turned with their lot): its pieces, turned back as it was; null if it isn't touched
 *  or can't be cut square. */
function cutTurned(s: Solid, hole: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }, yaw: number, px: number, pz: number): Solid[] | null {
  const r = s.rot, sy = r ? Math.atan2(r.s, r.c) : 0, d = Math.round(((yaw - sy) / (Math.PI / 2)) * 1e3) / 1e3;
  if (Math.abs(d - Math.round(d)) > 0.02) return null;
  // The hole's corners in the solid's own frame: square there too, a box.
  const c = Math.cos(yaw), sn = Math.sin(yaw), ox = r ? r.px : 0, oz = r ? r.pz : 0, rc = r ? r.c : 1, rs = r ? r.s : 0;
  const xs: number[] = [], zs: number[] = [];
  for (const [hx, hz] of [[hole.x0, hole.z0], [hole.x1, hole.z0], [hole.x0, hole.z1], [hole.x1, hole.z1]]) {
    const wx = px + c * (hx - px) - sn * (hz - pz), wz = pz + sn * (hx - px) + c * (hz - pz);
    xs.push(r ? ox + rc * (wx - ox) + rs * (wz - oz) : wx); zs.push(r ? oz - rs * (wx - ox) + rc * (wz - oz) : wz);
  }
  const box = { x0: Math.min(...xs), y0: hole.y0, z0: Math.min(...zs), x1: Math.max(...xs), y1: hole.y1, z1: Math.max(...zs) };
  const own = r ? { ...s, x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, rot: undefined } : s;
  if (box.x1 <= own.x0 || box.x0 >= own.x1 || box.z1 <= own.z0 || box.z0 >= own.z1) return null;
  const pieces = carve([own], box);
  return r ? turn(pieces, Math.atan2(r.s, r.c), r.px, r.pz) : pieces;
}

