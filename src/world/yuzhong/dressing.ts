// Street dressing on the real streets (M3-41c, after M3-34, U-014, U-020): along every street on the peninsula,
// by rules seeded per street: wrecked traffic in the lanes and lampposts at the kerb of the roads, the odd
// occupier checkpoint across one; bikes, scooters, benches, bins, trees, stalls and mahjong tables on the
// walkways, flowerpots, porters' poles and laundry beside the stairs; litter everywhere. The old centres gone
// cyberpunk keep their stalls and kiosks busier; elsewhere wrecks, rubble and the occupier's notices. Big props
// get collision (cars are cover); nothing lands on a building, over a hole, near a door or in a kept place.
import { solid, overlaps, raycast, type Solid, type SolidIndex } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand, randInt, type Rng } from '../../sim/rng';
import { PROP_BOX } from '../../data/props';
import { heightAt, type Heightfield } from '../heightfield';
import type { Prop, Inter } from '../world';
import { onGround, type Street } from './ground';
import { districtAt } from './lots';

/** Collision boxes for a prop: long footprints turned at an angle are split into short AABB segments. */
export function propBoxes(p: Prop): Solid[] {
  const b = PROP_BOX[p.kind];
  if (!b) return [];
  const w = p.kind === 'rubblepile' ? (p.w ?? 2) * 0.8 : b.w, d = p.kind === 'rubblepile' ? (p.w ?? 2) * 0.8 : b.d;
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw), n = Math.max(1, Math.round(d / 1.4)), out: Solid[] = [];
  for (let i = 0; i < n; i++) {
    const z0 = -d / 2 + (i * d) / n, z1 = z0 + d / n;
    const pts = [[-w / 2, z0], [w / 2, z0], [-w / 2, z1], [w / 2, z1]].map(([x, z]) => [p.x + x * c + z * s, p.z - x * s + z * c]);
    const xs = pts.map(q => q[0]), zs = pts.map(q => q[1]);
    out.push(solid(Math.min(...xs), p.y, Math.min(...zs), Math.max(...xs), p.y + b.h, Math.max(...zs), MAT.hidden));
  }
  return out;
}

const ROAD = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service']);
type Put = (kind: string, x: number, z: number, yaw: number, extra?: Partial<Prop>) => boolean;

/** land: 1 on the peninsula (only there is dressed); clear: places to keep free (tunnel mouths, the grate). */
export function dressStreets(index: SolidIndex, g: Heightfield, sts: Street[], land: Uint8Array, inter: Inter[], clear: { x: number; z: number; r: number }[]) {
  const props: Prop[] = [], solids: Solid[] = [];
  // Doors, containers and gates stay clear: a coarse grid of where they are.
  const near = new Set(inter.map(i => `${Math.floor(i.x / 4)},${Math.floor(i.z / 4)}`));
  const busy = (x: number, z: number) => {
    if (clear.some(c => Math.hypot(x - c.x, z - c.z) < c.r)) return true;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (near.has(`${Math.floor(x / 4) + dx},${Math.floor(z / 4) + dz}`)) return true;
    return false;
  };
  // Placed boxes by 8 m cell, so props never pile into each other.
  const placed = new Map<number, Solid[]>(), key = (i: number, j: number) => i * 8192 + j;
  const hitsPlaced = (b: Solid) => {
    for (let i = Math.floor(b.x0 / 8); i <= Math.floor(b.x1 / 8); i++) for (let j = Math.floor(b.z0 / 8); j <= Math.floor(b.z1 / 8); j++)
      for (const o of placed.get(key(i, j)) ?? []) if (o.x0 < b.x1 && b.x0 < o.x1 && o.z0 < b.z1 && b.z0 < o.z1) return true;
    return false;
  };
  const put: Put = (kind, x, z, yaw, extra = {}) => {
    const gy = heightAt(g, x, z), k = Math.round(z / g.cell) * g.w + Math.round(x / g.cell);
    if (gy === null || land[k] !== 1 || busy(x, z)) return false;
    const down = raycast(index, x, gy + 6, z, 0, -1, 0, 12);
    if (!down || down.ny < 0.85 || gy + 6 - down.t > gy + 0.6) return false;
    const p: Prop = { kind, x, y: gy + 6 - down.t, z, yaw, ...extra };
    const boxes = propBoxes(p);
    for (const b of boxes) if (overlaps(index, { ...b, y0: b.y0 + 0.05 }) || hitsPlaced(b)) return false;
    props.push(p);
    solids.push(...boxes);
    for (const b of boxes) for (let i = Math.floor(b.x0 / 8); i <= Math.floor(b.x1 / 8); i++) for (let j = Math.floor(b.z0 / 8); j <= Math.floor(b.z1 / 8); j++) {
      const a = placed.get(key(i, j)); if (a) a.push(b); else placed.set(key(i, j), [b]);
    }
    return true;
  };
  sts.forEach((s, si) => {
    if (!onGround(s) || s.pts.length < 2) return;
    const r = makeRng(hashString(`dress${si}`));
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], len = Math.hypot(bx - ax, bz - az);
      if (len < 2) continue;
      const ux = (bx - ax) / len, uz = (bz - az) / len, th = Math.atan2(uz, ux);
      const at = (t: number, off: number): [number, number] => [ax + ux * t - uz * off, az + uz * t + ux * off];
      if (ROAD.has(s.kind)) road(s, len, at, th, r, put);
      else if (s.steps) stairs(s, len, at, th, r, put);
      else walkway(s, len, at, th, r, put);
      // Litter, weeds and debris everywhere, more where nobody sweeps.
      for (let t = rand(r) * 8; t < len; t += 6 + rand(r) * 10) {
        const [x, z] = at(t, (rand(r) - 0.5) * (s.w + 2)), cyber = districtAt(x, z).cyber, q = rand(r);
        put(q < 0.35 ? 'weeds' : q < 0.6 ? 'trash' : q < 0.75 ? 'debris' : q < 0.85 ? 'boxes' : q < 0.92 ? 'sign' : cyber ? 'trash' : 'rubblepile', x, z, rand(r) * 6.28, q >= 0.92 && !cyber ? { w: 1.5 + rand(r) * 2 } : {});
      }
    }
  });
  return { props, solids };
}

/** Roads: wrecked traffic along the lanes, the odd bus, lampposts and scooters at the kerb, trees, sometimes a
 *  checkpoint across. */
function road(s: Street, len: number, at: (t: number, off: number) => [number, number], th: number, r: Rng, put: Put) {
  const kerb = s.w / 2 + 0.7, along = Math.PI / 2 - th;
  for (let t = 4 + rand(r) * 10; t < len - 2; t += 9 + rand(r) * 22) {
    const [x, z] = at(t, (rand(r) < 0.5 ? -1 : 1) * (0.9 + rand(r) * Math.max(0.2, s.w / 2 - 2.2))), crash = rand(r) < 0.25, cyber = districtAt(x, z).cyber;
    if (rand(r) < (cyber ? 0.45 : 0.7)) put(rand(r) < 0.06 ? 'bus' : rand(r) < 0.18 ? 'van' : 'car', x, z, along + (rand(r) < 0.5 ? 0 : Math.PI) + (crash ? (rand(r) - 0.5) * 2.4 : (rand(r) - 0.5) * 0.3));
  }
  for (let t = 6 + rand(r) * 10, side = rand(r) < 0.5 ? -1 : 1; t < len; t += 24 + rand(r) * 8, side = -side) { const [x, z] = at(t, side * kerb); put('lamppost', x, z, along + (side > 0 ? 0 : Math.PI)); }
  for (let t = rand(r) * 30; t < len; t += 25 + rand(r) * 30) {
    const side = rand(r) < 0.5 ? -1 : 1, q = rand(r);
    if (q < 0.35) for (let i = 0, n = 2 + randInt(r, 3); i < n; i++) { const [x, z] = at(t + i * 1.2, side * (kerb + 0.6)); put('scooter', x, z, along + Math.PI / 2 + (rand(r) - 0.5) * 0.6); }
    else if (q < 0.6) { const [x, z] = at(t, side * (kerb + 0.3)); put('tree', x, z, rand(r) * 6); }
    else if (q < 0.7) { const [x, z] = at(t, side * (kerb + 0.5)); put('bin', x, z, along); }
    else if (q < 0.76) { const [x, z] = at(t, side * (kerb + 0.6)); put('dronedock', x, z, along); }
  }
  if (len > 30 && s.w >= 7 && rand(r) < 0.04) {
    // An occupier checkpoint across the road: barriers with a scanner gate in the gap and a camera.
    const t = len / 2;
    for (let a = 3.5; a < s.w / 2; a += 2) for (const side of [-1, 1]) { const [x, z] = at(t, side * a); put('jersey', x, z, -th); }
    { const [x, z] = at(t, 0); put('scanner', x, z, along); }
    { const [x, z] = at(t + 2, -kerb); put('campole', x, z, along); }
    { const [x, z] = at(t + 6, kerb); put('edict', x, z, along + Math.PI); }
  }
}

/** Stair streets: the flight stays clear; pots, porters' poles, laundry and the odd stall along its edges. */
function stairs(s: Street, len: number, at: (t: number, off: number) => [number, number], th: number, r: Rng, put: Put) {
  for (let t = rand(r) * 4; t < len; t += 3 + rand(r) * 5) {
    const side = rand(r) < 0.5 ? -1 : 1, [x, z] = at(t, side * (s.w / 2 + 0.5)), q = rand(r);
    put(q < 0.55 ? 'pot' : q < 0.7 ? 'bangbang' : q < 0.82 ? 'laundry' : q < 0.9 ? 'stall' : 'stools', x, z, Math.PI / 2 - th + (side > 0 ? 0 : Math.PI));
  }
}

/** Walkways, lanes and squares: bikes and scooters, benches, bins, trees, stalls, mahjong, kiosks, notices. */
function walkway(s: Street, len: number, at: (t: number, off: number) => [number, number], th: number, r: Rng, put: Put) {
  for (let t = rand(r) * 6; t < len; t += 5 + rand(r) * 9) {
    const [x, z] = at(t, (rand(r) - 0.5) * Math.max(1, s.w - 1)), cyber = districtAt(x, z).cyber, q = rand(r), yaw = Math.PI / 2 - th + (rand(r) < 0.5 ? 0 : Math.PI);
    if (q < 0.18) put('bike', x, z, yaw + (rand(r) - 0.5) * 0.5);
    else if (q < 0.3) put('scooter', x, z, yaw + rand(r) * 6);
    else if (q < 0.38) put('bench', x, z, yaw);
    else if (q < 0.45) put('bin', x, z, yaw);
    else if (q < 0.55) put('pot', x, z, yaw);
    else if (q < 0.62) put('tree', x, z, rand(r) * 6);
    else if (q < (cyber ? 0.78 : 0.68)) put('stall', x, z, yaw);
    else if (q < (cyber ? 0.84 : 0.72)) put('mahjong', x, z, yaw);
    else if (q < (cyber ? 0.88 : 0.75)) put('kiosk', x, z, yaw);
    else if (q < 0.8) put(cyber ? 'stools' : 'dronewreck', x, z, rand(r) * 6);
    else if (q < 0.83 && !cyber) put('edict', x, z, yaw);
  }
}
