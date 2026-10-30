// Street dressing on the real streets (M3-41c, after M3-34, U-014, U-020, U-029, U-030): along every street on the
// peninsula, by rules seeded per street. The carriageways stay clear for the machines' convoys: abandoned cars
// are shoved onto the pavements in twos and threes, lampposts, trees, bins and scooters line the kerbs; bikes,
// benches, stalls and mahjong tables keep to the edges of the walkways, flowerpots, porters' poles and laundry to
// the sides of the stairs; litter gathers along the edges. The old centres gone cyberpunk keep their stalls and
// kiosks busier; elsewhere wrecks, rubble and the occupier's notices. Big props get collision (cars are cover);
// nothing lands on a carriageway, on a building, over a hole, near a door or in a kept place.
import { solid, overlaps, raycast, type Solid, type SolidIndex } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand, randInt, type Rng } from '../../sim/rng';
import { PROP_BOX } from '../../data/props';
import { heightAt, type Heightfield } from '../heightfield';
import type { Prop, Inter } from '../world';
import { onGround, ROAD, KERB_W, PAVE, type Street } from './ground';
import { districtAt } from './lots';

/** Props that break a fall (U-024): rubbish bags, bins, cardboard, a tarp shelter (it gives under him). */
export const SOFT = new Set(['bags', 'bin', 'boxes', 'tarp']);

/** Collision boxes for a prop: long footprints turned at an angle are split into short AABB segments. */
export function propBoxes(p: Prop): Solid[] {
  const b = PROP_BOX[p.kind];
  if (!b) return [];
  // A rubble pile is p.w across; a broken wall p.w long and, along its jagged top, about three quarters of p.h.
  const w = p.kind === 'rubblepile' ? (p.w ?? 2) * 0.8 : b.w, d = p.kind === 'rubblepile' ? (p.w ?? 2) * 0.8 : p.kind === 'halfwall' ? p.w ?? b.d : b.d;
  const h = p.kind === 'halfwall' ? (p.h ?? b.h) * 0.75 : b.h;
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw), n = Math.max(1, Math.round(d / 1.4)), out: Solid[] = [];
  for (let i = 0; i < n; i++) {
    const z0 = -d / 2 + (i * d) / n, z1 = z0 + d / n;
    const pts = [[-w / 2, z0], [w / 2, z0], [-w / 2, z1], [w / 2, z1]].map(([x, z]) => [p.x + x * c + z * s, p.z - x * s + z * c]);
    const xs = pts.map(q => q[0]), zs = pts.map(q => q[1]);
    out.push(solid(Math.min(...xs), p.y, Math.min(...zs), Math.max(...xs), p.y + h, Math.max(...zs), SOFT.has(p.kind) ? MAT.soft : MAT.hidden));
  }
  return out;
}

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
  const onRoad = carriageways(sts), placedAt = new Map<number, Prop[]>();
  const anyNear = (x: number, z: number, r: number) => { for (let i = Math.floor((x - r) / 8); i <= Math.floor((x + r) / 8); i++) for (let j = Math.floor((z - r) / 8); j <= Math.floor((z + r) / 8); j++) if ((placedAt.get(key(i, j)) ?? []).some(p => Math.hypot(p.x - x, p.z - z) < r)) return true; return false; };
  const put: Put = (kind, x, z, yaw, extra = {}) => {
    const gy = heightAt(g, x, z), k = Math.round(z / g.cell) * g.w + Math.round(x / g.cell);
    if (gy === null || land[k] !== 1 || busy(x, z) || onRoad(x, z)) return false;
    const down = raycast(index, x, gy + 6, z, 0, -1, 0, 12);
    if (!down || down.ny < 0.85 || gy + 6 - down.t > gy + 0.6) return false;
    const p: Prop = { kind, x, y: gy + 6 - down.t, z, yaw, ...extra };
    const boxes = propBoxes(p);
    for (const b of boxes) if (overlaps(index, { ...b, y0: b.y0 + 0.05 }) || hitsPlaced(b) || onRoad(b.x0, b.z0) || onRoad(b.x1, b.z0) || onRoad(b.x0, b.z1) || onRoad(b.x1, b.z1)) return false;
    props.push(p);
    const pk = key(Math.floor(x / 8), Math.floor(z / 8)), pa = placedAt.get(pk);
    if (pa) pa.push(p); else placedAt.set(pk, [p]);
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
      if (ROAD.has(s.kind)) road(s, len, at, th, r, put, g);
      else if (s.steps) stairs(s, len, at, th, r, put);
      else walkway(s, len, at, th, r, put);
      // Litter, weeds and debris along the edges, more where nobody sweeps.
      const edge = ROAD.has(s.kind) ? s.w / 2 + KERB_W + 0.2 : s.steps ? s.w / 2 + 0.3 : Math.max(0.3, s.w / 2 - 0.9);
      for (let t = rand(r) * 6; t < len; t += 5 + rand(r) * 8) {
        const side = rand(r) < 0.5 ? -1 : 1, o = edge + 0.3 + rand(r) * 1.5, [x, z] = at(t, side * o), cyber = districtAt(x, z).cyber, q = rand(r), yaw = rand(r) * 6.28;
        const kind = q < 0.35 ? 'weeds' : q < 0.6 ? 'trash' : q < 0.75 ? 'debris' : q < 0.85 ? 'boxes' : q < 0.92 ? 'sign' : cyber ? 'trash' : 'rubblepile', extra = q >= 0.92 && !cyber ? { w: 1.5 + rand(r) * 2 } : {};
        put(kind, x, z, yaw, extra) || put(kind, ...at(t, -side * o), yaw, extra);
      }
      // Wherever that left 8 m of street with nothing beside it, weeds or a bag at its edge.
      for (let t = 4; t < len; t += 8) {
        const [cx, cz] = at(t, 0);
        if (anyNear(cx, cz, s.w / 2 + 5)) continue;
        for (const o of [edge, edge + 0.8, edge + 1.6, -edge, -edge - 0.8, -edge - 1.6]) if (put(rand(r) < 0.6 ? 'weeds' : 'trash', ...at(t + (rand(r) - 0.5) * 4, o), rand(r) * 6.28)) break;
      }
    }
  });
  return { props, solids };
}

/** Roads: the carriageway kept clear (U-030), its abandoned cars shoved onto the pavement in twos and threes;
 *  lampposts and trees at the kerb, scooters, bins and drone docks against the buildings; now and then a camera
 *  pole and a notice. */
function road(s: Street, len: number, at: (t: number, off: number) => [number, number], th: number, r: Rng, put: Put, g: Heightfield) {
  const kerb = s.w / 2 + KERB_W, wall = kerb + PAVE, along = Math.PI / 2 - th;
  for (let t = 4 + rand(r) * 10; t < len - 2; t += 14 + rand(r) * 26) {
    const side = rand(r) < 0.5 ? -1 : 1, cyber = districtAt(...at(t, 0)).cyber;
    // On the pavement, or where a building stands on it, shoved further off into whatever space is beside the road.
    if (rand(r) < (cyber ? 0.35 : 0.55)) for (let i = 0, n = 1 + randInt(r, 3); i < n; i++) {
      // Shoved, so askew and not evenly spaced.
      const kind = rand(r) < 0.15 ? 'van' : 'car', yaw = along + (rand(r) < 0.5 ? 0 : Math.PI) + (rand(r) - 0.5) * 0.4, tt = t + i * (4.6 + rand(r) * 2);
      for (const o of [1.05, 2.6, 4.2, -1.05, -2.6, -4.2]) { const [x, z] = at(tt, side * Math.sign(o) * (kerb + Math.abs(o) + rand(r) * 0.4)); if (put(kind, x, z, yaw)) break; }
    }
  }
  // Lampposts down alternate sides, closer on the arterials; railings along a pavement whose edge drops away.
  // Each on its side if there's pavement there, else across the road (a carriageway may lie against this one).
  const either = (t: number, o: number, first: number, f: (x: number, z: number, side: number) => boolean) => f(...at(t, first * o), first) || f(...at(t, -first * o), -first);
  for (let t = 6 + rand(r) * 10, side = rand(r) < 0.5 ? -1 : 1; t < len; t += (s.w >= 9 ? 16 : 24) + rand(r) * 8, side = -side) either(t, kerb + 0.35, side, (x, z, sd) => put('lamppost', x, z, along + (sd > 0 ? 0 : Math.PI)));
  for (const side of [-1, 1]) for (let t = 1.6; t < len - 1.6; t += 3.2) {
    const [x, z] = at(t, side * (wall - 0.15)), [ox, oz] = at(t, side * (wall + 1.5)), [ix, iz] = at(t, side * kerb), y = heightAt(g, ix, iz), below = heightAt(g, ox, oz);
    if (y !== null && below !== null && y - below > 1) put('railing', x, z, -th);
  }
  for (let t = rand(r) * 30; t < len; t += 25 + rand(r) * 30) {
    const side = rand(r) < 0.5 ? -1 : 1, q = rand(r);
    // Scooters fallen in a heap against the buildings, not parked in a row.
    if (q < 0.35) for (let i = 0, n = 2 + randInt(r, 3); i < n; i++) { const yaw = rand(r) * 6.28; either(t + i * (0.8 + rand(r) * 1.2), wall - 0.4 - rand(r) * 0.9, side, (x, z) => put('scooter', x, z, yaw)); }
    else if (q < 0.6) { const yaw = rand(r) * 6; either(t, kerb + 0.6, side, (x, z) => put('tree', x, z, yaw)); }
    else if (q < 0.66) either(t, wall - 0.5, side, (x, z, sd) => put('bin', x, z, along + (sd > 0 ? Math.PI : 0)));
    else if (q < 0.7) either(t, wall - 0.65, side, (x, z) => put('dumpster', x, z, -th));
    else if (q < 0.73) either(t, wall - 0.6, side, (x, z, sd) => put('dronedock', x, z, along + (sd > 0 ? Math.PI : 0)));
    else if (q < 0.76) either(t, wall + 0.2, side, (x, z, sd) => put('kiosk', x, z, along + (sd > 0 ? Math.PI : 0)));
    // Rubbish bags piled against a wall where the collections stopped; bollards in twos at the kerb.
    else if (q < 0.86) either(t, wall - 0.5, side, (x, z) => put('bags', x, z, rand(r) * 6.28));
    else if (q < 0.93) for (const d of [-0.8, 0.8]) either(t + d, kerb + 0.3, side, (x, z) => put('bollard', x, z, along));
  }
  if (len > 30 && rand(r) < 0.05) {
    const [x, z] = at(len / 2, kerb + 0.4), [ex, ez] = at(len / 2 + 4, -(wall - 0.4));
    put('campole', x, z, along); put('edict', ex, ez, along + Math.PI);
  }
}

/** Stair streets: the flight stays clear; pots, porters' poles, laundry and the odd stall along its edges. */
function stairs(s: Street, len: number, at: (t: number, off: number) => [number, number], th: number, r: Rng, put: Put) {
  for (let t = rand(r) * 4; t < len; t += 3 + rand(r) * 5) {
    const side = rand(r) < 0.5 ? -1 : 1, [x, z] = at(t, side * (s.w / 2 + 0.5)), q = rand(r);
    put(q < 0.55 ? 'pot' : q < 0.7 ? 'bangbang' : q < 0.82 ? 'laundry' : q < 0.9 ? 'stall' : 'boxes', x, z, Math.PI / 2 - th + (side > 0 ? 0 : Math.PI));
  }
}

/** Walkways, lanes and squares: bikes and scooters, benches, bins, trees, stalls, mahjong, kiosks, notices along
 *  their edges (the narrow ones only small things). */
function walkway(s: Street, len: number, at: (t: number, off: number) => [number, number], th: number, r: Rng, put: Put) {
  // In loose groups of one to three a few metres apart (U-031): off the walkway's edge onto the ground beside it,
  // or where something stands there, just inside its edge; never in a row.
  for (let t = rand(r) * 6; t < len; t += 7 + rand(r) * 12) {
    // (The narrow ones, between the buildings, only the small things.)
    const side = rand(r) < 0.5 ? -1 : 1, cyber = districtAt(...at(t, 0)).cyber, q = rand(r) * (s.w < 3 ? 0.55 : 1), n = 1 + randInt(r, 3);
    for (let i = 0; i < n; i++) {
      const tt = t + (rand(r) - 0.5) * 4, face = Math.PI / 2 - th + (side > 0 ? 0 : Math.PI) + (rand(r) - 0.5) * 0.5;
      const off = [s.w / 2 + 0.7 + rand(r) * 1.2, Math.max(0.3, s.w / 2 - 0.9 - rand(r) * 0.4)];
      const place = (kind: string, yaw: number) => off.some(o => put(kind, ...at(tt, side * o), yaw));
      if (q < 0.18) place('bike', face + rand(r) * 6);
      else if (q < 0.3) place('scooter', face + rand(r) * 6);
      else if (q < 0.38) place('bench', face);
      else if (q < 0.45) place('bin', face);
      else if (q < 0.55) place('pot', rand(r) * 6);
      else if (q < 0.62) place('tree', rand(r) * 6);
      else if (q < (cyber ? 0.78 : 0.68)) place('stall', face);
      else if (q < (cyber ? 0.84 : 0.72)) place('mahjong', face);
      else if (q < (cyber ? 0.88 : 0.75)) place('kiosk', face);
      else if (q < 0.8) place(cyber ? 'boxes' : 'dronewreck', rand(r) * 6);
      else if (q < 0.83 && !cyber) place('edict', face);
    }
  }
}

/** Whether a point is on a road's carriageway: road segments filed by 16 m cell. */
function carriageways(sts: Street[]): (x: number, z: number) => boolean {
  const cells = new Map<number, number[][]>(), key = (i: number, j: number) => i * 65536 + j;
  for (const s of sts) if (onGround(s) && ROAD.has(s.kind)) for (let k = 0; k + 1 < s.pts.length; k++) {
    const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], h = s.w / 2;
    for (let i = Math.floor((Math.min(ax, bx) - h) / 16); i <= Math.floor((Math.max(ax, bx) + h) / 16); i++)
      for (let j = Math.floor((Math.min(az, bz) - h) / 16); j <= Math.floor((Math.max(az, bz) + h) / 16); j++) {
        const c = cells.get(key(i, j)); if (c) c.push([ax, az, bx, bz, h]); else cells.set(key(i, j), [[ax, az, bx, bz, h]]);
      }
  }
  return (x, z) => {
    for (const [ax, az, bx, bz, h] of cells.get(key(Math.floor(x / 16), Math.floor(z / 16))) ?? []) {
      const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
      if (Math.hypot(x - ax - vx * t, z - az - vz * t) < h) return true;
    }
    return false;
  };
}
