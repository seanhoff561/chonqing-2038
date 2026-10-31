// Shibati's Yangtze riverfront (M3-20). Below the lower city the riverfront road runs along the bank; on its river
// side the machines have walled the river off with prefab concrete panels (3.4 m, a coil of wire along the top,
// 禁止通行 banners facing the road), a panel down here and there where it was knocked over or never stood, a way
// through over it. Past the wall the riverside falls to the bank's edge, and flights of stone steps run from it
// down into the water. The river itself is the world's water volume.
import { solid, rampSolid, turn, query, xzHit, topOver, type Solid, type SolidIndex, type Box } from '../geom';
import { MAT } from '../mats';
import { heightAt, type Heightfield } from '../heightfield';
import { WATER_Y, type Street } from './ground';
import { stepsFor } from '../steps';
import { makeRng, rand } from '../../sim/rng';
import type { Feature, Prop } from '../world';

const MAIN = new Set(['trunk', 'primary', 'secondary', 'tertiary']);
const PANEL = { w: 1.5, gap: 0.05, h: 3.4, t: 0.3 };

/** True where a box meets a solid already there (the ground aside). */
function hits(idx: SolidIndex, b: Box): boolean {
  for (const i of query(idx, b.x0, b.z0, b.x1, b.z1)) {
    const s = idx.solids[i];
    if (b.x1 <= s.x0 || b.x0 >= s.x1 || b.z1 <= s.z0 || b.z0 >= s.z1) continue;
    if (s.rot && !xzHit(s, b.x0, b.z0, b.x1, b.z1)) continue;
    if (b.y1 <= s.y0 || b.y0 >= topOver(s, b.x0, b.z0, b.x1, b.z1)) continue;
    return true;
  }
  return false;
}

export function riverfront(idx: SolidIndex, g: Heightfield, sts: Street[], from: { x: number; z: number }) {
  const solids: Solid[] = [], decor: Solid[] = [], props: Prop[] = [], features: Feature[] = [], r = makeRng(2038);
  const h = (x: number, z: number) => heightAt(g, x, z);
  const wet = (x: number, z: number) => { const y = h(x, z); return y !== null && y < WATER_Y - 0.5; };
  /** Marching from a point along a heading, where the water starts (the first of 16 m of riverbed), or null. */
  const shore = (x: number, z: number, dx: number, dz: number, max: number) => {
    for (let d = 0, run = 0; d < max; d += 1) { run = wet(x + dx * d, z + dz * d) ? run + 1 : 0; if (run >= 16) return d - 16; }
    return null;
  };
  // The nearest water from the foot of the stairs, and which way it lies.
  let best: { d: number; dx: number; dz: number } | null = null;
  for (let a = 0; a < 128; a++) { const dx = Math.cos((a / 128) * Math.PI * 2), dz = Math.sin((a / 128) * Math.PI * 2), d = shore(from.x, from.z, dx, dz, 900); if (d !== null && (!best || d < best.d)) best = { d, dx, dz }; }
  if (!best) throw new Error('no river below Shibati');
  const { dx, dz } = best, S = { x: from.x + dx * best.d, z: from.z + dz * best.d }, px = -dz, pz = dx;

  // Steps down the bank every 120 m along it: from its edge out and down to 2 m under the surface.
  for (let t = -360; t <= 360; t += 120) {
    const ox = S.x + px * t - dx * 80, oz = S.z + pz * t - dz * 80, d = shore(ox, oz, dx, dz, 200);
    if (d === null) continue;
    // (From 2 m inland of the edge, level with the ground there, so the bank's last drop is under it.)
    const ex = ox + dx * (d - 2), ez = oz + dz * (d - 2), top = h(ex, ez);
    if (top === null || top < WATER_Y + 1) continue;
    const L = Math.max(4, (top - (WATER_Y - 2)) * 2), yaw = Math.atan2(dz, dx);
    const ramp = rampSolid(ex, WATER_Y - 4.5, ez - 3, ex + L, ez + 3, WATER_Y - 2, top, 2, MAT.stone), steps: Solid[] = [];
    stepsFor(ramp, steps, MAT.stone);
    const [rs] = turn([ramp], yaw, ex, ez);
    if (hits(idx, { x0: rs.x0, y0: top - 0.5, z0: rs.z0, x1: rs.x1, y1: top + 3, z1: rs.z1 })) continue;
    solids.push(rs);
    decor.push(...turn(steps, yaw, ex, ez));
    features.push({ kind: 'river:steps', x: ex - dx * 0.5, y: top, z: ez - dz * 0.5, group: features.length, nx: dx, nz: dz });
  }

  // The wall along the river side of the main roads running with the bank on this side of the river, within 420 m
  // of the shore here and 120 m of the water. Side streets down to the river are walled off with it.
  for (const s of sts) {
    if (!MAIN.has(s.kind) || s.steps) continue;
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], len = Math.hypot(bx - ax, bz - az);
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, ux = (bx - ax) / len, uz = (bz - az) / len;
      if (len < 3 || Math.hypot(mx - S.x, mz - S.z) > 420 || (mx - S.x) * dx + (mz - S.z) * dz > 0 || Math.abs(ux * dx + uz * dz) > 0.5) continue;
      // Its river side: the side the water is nearer.
      let side = 0, bq = Infinity;
      for (const sd of [-1, 1]) { const q = shore(mx, mz, -uz * sd, ux * sd, 120); if (q !== null && q < bq) { bq = q; side = sd; } }
      if (!side) continue;
      const nx = -uz * side, nz = ux * side, off = s.w / 2 + 1.2;
      for (let a = PANEL.w / 2; a < len; a += PANEL.w + PANEL.gap) {
        const cx = ax + ux * a + nx * off, cz = az + uz * a + nz * off, y = h(cx, cz);
        if (y === null || y < WATER_Y + 1) continue;
        const yaw = Math.atan2(uz, ux), x0 = cx - PANEL.w / 2, z0 = cz - PANEL.t / 2;
        const [p] = turn([solid(x0, y - 0.6, z0, x0 + PANEL.w, y + PANEL.h, z0 + PANEL.t, MAT.concrete)], yaw, cx, cz);
        if (hits(idx, { x0: p.x0, y0: y + 0.3, z0: p.z0, x1: p.x1, y1: y + PANEL.h, z1: p.z1 }) || sts.some(o => o !== s && MAIN.has(o.kind) && near(o, cx, cz, o.w / 2 + 0.6))) continue;
        // One in 22 is down: lying flat on the river side, a way over it.
        if (rand(r) < 1 / 22) {
          const [f] = turn([solid(cx - PANEL.w / 2, y - 0.2, cz + 0.4, cx + PANEL.w / 2, y + 0.1, cz + 0.4 + PANEL.h, MAT.concrete)], yaw + (side > 0 ? 0 : Math.PI), cx, cz);
          solids.push(f);
          features.push({ kind: 'river:breach', x: cx, y, z: cz, group: features.length, nx, nz });
          continue;
        }
        solids.push(p);
        // Its foot, and the wire along its top.
        decor.push(...turn([solid(x0 - 0.02, y - 0.6, z0 - 0.35, x0 + PANEL.w + 0.02, y + 0.25, z0 + PANEL.t + 0.35, MAT.concrete),
          solid(x0, y + PANEL.h, cz - 0.12, x0 + PANEL.w, y + PANEL.h + 0.25, cz + 0.12, MAT.metal)], yaw, cx, cz));
        features.push({ kind: 'river:wall', x: cx, y, z: cz, group: features.length, nx, nz });
        // Now and then a banner on its road side: 禁止通行.
        if (rand(r) < 0.04) props.push({ kind: 'redbanner', x: cx - nx * (PANEL.t / 2 + 0.05), y: y + 1.6, z: cz - nz * (PANEL.t / 2 + 0.05), yaw: Math.atan2(-nx, -nz), w: 1.4, text: '9' });
      }
    }
  }
  return { solids, decor, props, features };
}

/** Whether a point is within d of a street's line. */
function near(s: Street, x: number, z: number, d: number) {
  for (let k = 0; k + 1 < s.pts.length; k++) {
    const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz || 1;
    const u = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / L));
    if (Math.hypot(ax + vx * u - x, az + vz * u - z) < d) return true;
  }
  return false;
}
