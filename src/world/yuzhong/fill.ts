// The open ground filled (M3-56, U-022, U-024, U-028): nothing between the buildings stays an empty slab. One
// slot every 8 m over the marks' open ground gets something that belongs where it is, turned to the nearest wall:
// against a wall, a lean-to with its roof sloping off it (a step up to the building), rubbish bags and bins (soft
// to land on), a stack of crates, a car pulled in, or a yard wall out from the building with a gate in it; out in
// the open, back buildings, wrecks, an abandoned market, people's tarp shelters, sandbagged positions from the
// fighting, barriers; on the grass, vegetable beds, trees and benches. Banks get stairs down them.
import { solid, rampSolid, turn, overlaps, query, type Solid, type SolidIndex } from '../geom';
import { heightAt, type Heightfield } from '../heightfield';
import { MAT } from '../mats';
import { makeRng, hashString, rand, type Rng } from '../../sim/rng';
import { stair } from '../steps';
import type { Prop, Plot } from '../world';
import { propBoxes } from './dressing';
import { ENVELOPE as E } from '../../data/envelope';
import { MARK, markAt, grassAt, type Marks } from './marks';

interface Wall { d: number; px: number; pz: number; ux: number; uz: number; nx: number; nz: number }

export function fill(index: SolidIndex, g: Heightfield, mk: Marks, plots: Plot[]): { props: Prop[]; solids: Solid[]; decor: Solid[] } {
  const props: Prop[] = [], solids: Solid[] = [], decor: Solid[] = [];
  // Building walls by 16 m cell, for the nearest one to a point.
  const edges = new Map<number, number[][]>(), key = (i: number, j: number) => i * 65536 + j;
  for (const p of plots) if (!p.far) for (let e = 0; e < 4; e++) {
    const [ax, az] = p.corners[e], [bx, bz] = p.corners[(e + 1) % 4], [cx, cz] = p.corners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4], [0, 0]);
    for (let i = Math.floor((Math.min(ax, bx) - 16) / 16); i <= Math.floor((Math.max(ax, bx) + 16) / 16); i++)
      for (let j = Math.floor((Math.min(az, bz) - 16) / 16); j <= Math.floor((Math.max(az, bz) + 16) / 16); j++) {
        const c = edges.get(key(i, j)); if (c) c.push([ax, az, bx, bz, cx, cz]); else edges.set(key(i, j), [[ax, az, bx, bz, cx, cz]]);
      }
  }
  /** The nearest building wall to (x, z) within 16 m: the foot of the perpendicular, along it, and out of it. */
  const wallNear = (x: number, z: number): Wall | null => {
    let best: Wall | null = null;
    for (const [ax, az, bx, bz, cx, cz] of edges.get(key(Math.floor(x / 16), Math.floor(z / 16))) ?? []) {
      const vx = bx - ax, vz = bz - az, l = Math.hypot(vx, vz) || 1, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (l * l)));
      const px = ax + vx * t, pz = az + vz * t, d = Math.hypot(x - px, z - pz);
      if (d > 16 || (best && d >= best.d)) continue;
      // Out of the wall: away from the building's middle.
      let nx = -vz / l, nz = vx / l;
      if ((px - cx) * nx + (pz - cz) * nz < 0) { nx = -nx; nz = -nz; }
      best = { d, px, pz, ux: nz, uz: -nx, nx, nz };
    }
    return best;
  };
  // Doors stay clear: nothing within 2.5 m of one.
  const doors = new Map<number, [number, number][]>();
  for (const p of plots) if (p.route) { const [x, z] = [p.route[0].x, p.route[0].z], k = key(Math.floor(x / 16), Math.floor(z / 16)), a = doors.get(k); if (a) a.push([x, z]); else doors.set(k, [[x, z]]); }
  const byDoor = (x: number, z: number) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if ((doors.get(key(Math.floor(x / 16) + i, Math.floor(z / 16) + j)) ?? []).some(([dx, dz]) => Math.hypot(dx - x, dz - z) < 2.5)) return true; return false; };
  // What's been placed here, by 8 m cell, so pieces don't pile into each other.
  const mine = new Map<number, Solid[]>();
  /** Whether boxes are clear of everything built (and, with ground, of the ground but a slope at their foot). */
  const free = (bs: Solid[], ground = true) => bs.every(b => {
    if (byDoor(b.x0, b.z0) || byDoor(b.x1, b.z1) || byDoor((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2)) return false;
    if (ground ? overlaps(index, { x0: b.x0, y0: b.y0 + 0.6, z0: b.z0, x1: b.x1, y1: b.y1, z1: b.z1 }) : query(index, b.x0, b.z0, b.x1, b.z1).some(i => { const o = index.solids[i]; return o.y1 > b.y0 && o.y0 < b.y1; })) return false;
    for (let i = Math.floor(b.x0 / 8); i <= Math.floor(b.x1 / 8); i++) for (let j = Math.floor(b.z0 / 8); j <= Math.floor(b.z1 / 8); j++)
      for (const o of mine.get(i * 65536 + j) ?? []) if (o.x0 < b.x1 && b.x0 < o.x1 && o.z0 < b.z1 && b.z0 < o.z1 && o.y0 < b.y1 && b.y0 < o.y1) return false;
    return true;
  });
  const keep = (bs: Solid[]) => { for (const b of bs) for (let i = Math.floor(b.x0 / 8); i <= Math.floor(b.x1 / 8); i++) for (let j = Math.floor(b.z0 / 8); j <= Math.floor(b.z1 / 8); j++) { const k = i * 65536 + j, a = mine.get(k); if (a) a.push(b); else mine.set(k, [b]); } };
  /** A prop at (x, z) on the ground there (near its slot), if it fits. */
  const put = (kind: string, x: number, z: number, yaw: number, extra: Partial<Prop> = {}) => {
    const y = heightAt(g, x, z);
    if (y === null) return false;
    const p: Prop = { kind, x, y, z, yaw, ...extra }, bs = propBoxes(p);
    if (!free(bs)) return false;
    props.push(p); solids.push(...bs); keep(bs);
    return true;
  };
  /** Solids built in a wall's frame (x along it, z out of it, from its foot), turned into place, if they fit. */
  const build = (w: Wall, local: Solid[], dec: Solid[]) => {
    const yaw = Math.atan2(w.uz, w.ux), move = (s: Solid) => ({ ...s, x0: s.x0 + w.px, x1: s.x1 + w.px, z0: s.z0 + w.pz, z1: s.z1 + w.pz });
    const ss = turn(local.map(move), yaw, w.px, w.pz), ds = turn(dec.map(move), yaw, w.px, w.pz);
    // Footings go into the ground, so only what's built is in the way; the ground under it must be near level.
    const hs = ss.flatMap(b => [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]].map(([x, z]) => heightAt(g, x, z) ?? NaN));
    if (!(Math.max(...hs) - Math.min(...hs) < 1) || !free(ss, false)) return false;
    solids.push(...ss); decor.push(...ds); keep(ss);
    return true;
  };
  /** Prop yaw facing out of the wall, and along it. */
  const out = (w: Wall) => Math.atan2(w.nx, w.nz), along = (w: Wall) => Math.atan2(w.ux, w.uz);

  for (let j = 0; j < mk.h; j += 2) for (let i = 0; i < mk.w; i += 2) {
    // One of the slot's open cells, at random.
    const r = makeRng(hashString(`fill${i},${j}`)), open = [[0, 0], [1, 0], [0, 1], [1, 1]].filter(([a, b]) => i + a < mk.w && j + b < mk.h && mk.m[(j + b) * mk.w + i + a] === MARK.open);
    if (!open.length) continue;
    const [a, b] = open[Math.floor(rand(r) * open.length)];
    const x = (i + a + 0.2 + rand(r) * 0.6) * mk.cell, z = (j + b + 0.2 + rand(r) * 0.6) * mk.cell, y = heightAt(g, x, z);
    if (y === null) continue;
    const w = wallNear(x, z), q = rand(r);
    // By a wall: something against it, and litter blown into the corner of the yard.
    if (w && w.d < 4.5) { againstWall(w, y, q, r) || put(q < 0.6 ? 'bags' : 'boxes', x, z, out(w)); put(['weeds', 'trash', 'debris'][Math.floor(rand(r) * 3)], x, z, rand(r) * 6.3); }
    else if (grassAt(mk, x, z)) onGrass(x, z, w, q, r) || put('weeds', x, z, rand(r) * 6.3);
    else inOpen(x, z, y, w, q, r) || put('debris', x, z, rand(r) * 6.3);
  }
  banks();
  return { props, solids, decor };

  function againstWall(w: Wall, y: number, q: number, r: Rng): boolean {
    const t = (rand(r) - 0.5) * 2, at = (s: number, o: number): [number, number] => [w.px + w.ux * s + w.nx * o, w.pz + w.uz * s + w.nz * o];
    if (q < 0.22) {
      // A lean-to against the wall: a tin-roofed shed, the roof sloping off the wall: run up it to the building.
      // Its eave in reach of a jump and a grab (M3-50).
      const W = 3 + rand(r) * 2, D = 2 + rand(r), H = E.mantleStanding.comfortable + rand(r) * (E.mantleJump.comfortable - E.mantleStanding.comfortable);
      return build(w, [solid(t - W / 2, y - 1, 0.05, t + W / 2, y + H, D, rand(r) < 0.5 ? MAT.brick : MAT.metal), rampSolid(t - W / 2 - 0.1, y + H - 0.1, 0.05, t + W / 2 + 0.1, D + 0.4, y + H - 0.1, y + H + 0.6, 4, MAT.metal)],
        [solid(t - 0.5, y, D - 0.02, t + 0.5, y + 2, D, MAT.tealMetal)]);
    }
    if (q < 0.42) {
      // Rubbish bags heaped under the wall, and a bin or two: soft to drop onto (U-024).
      let n = +put('bags', ...at(t, 0.85), out(w));
      if (rand(r) < 0.35) n += +put('dumpster', ...at(t + 1.9, 0.7), along(w) - Math.PI / 2);
      else for (let k = 0; k < 1 + (rand(r) < 0.5 ? 1 : 0); k++) n += +put('bin', ...at(t + 1.4 + k * 0.8, 0.45), out(w));
      return n > 0;
    }
    if (q < 0.52 && rand(r) < 0.4) return put('drum', ...at(t, 0.6), out(w)) && (put('drum', ...at(t + 1.1, 0.6), out(w)) || true);
    if (q < 0.52) {
      // Crates stacked against the wall: steps up it.
      const s = 0.9;
      return build(w, [solid(t, y - 0.5, 0.05, t + s, y + s, 0.05 + s, MAT.crate), solid(t + s + 0.05, y - 0.5, 0.05, t + 2 * s + 0.05, y + s, 0.05 + s, MAT.crate), solid(t + 0.4, y + s, 0.05, t + 0.4 + s, y + 2 * s, 0.05 + s, MAT.crate)], []);
    }
    if (q < 0.66) return put(rand(r) < 0.2 ? 'van' : 'car', ...at(t, 1.6), along(w) + (rand(r) < 0.5 ? 0 : Math.PI) + (rand(r) - 0.5) * 0.1);
    if (q < 0.82) {
      // A yard wall out from the building, a gate standing open in it: the open ground becomes courtyards.
      // Over a hop, under a jump and a grab: he has to use his hands to get over it (M3-50).
      const L = 4 + rand(r) * 4, H = E.hop.max + 0.2 + rand(r) * (E.mantleJump.comfortable - E.hop.max - 0.4), g0 = 1 + rand(r) * (L - 2.6), mat = rand(r) < 0.5 ? MAT.brick : MAT.plaster;
      return build(w, [solid(t - 0.12, y - 0.5, 0.05, t + 0.12, y + H, g0, mat), solid(t - 0.12, y - 0.5, g0 + 1.4, t + 0.12, y + H, L, mat), solid(t - 0.2, y - 0.5, L, t + 0.2, y + H + 0.3, L + 0.4, MAT.concrete)],
        [solid(t - 0.15, y + H, 0.05, t + 0.15, y + H + 0.08, L, MAT.concrete), solid(t + 0.05, y, g0 + 0.05, t + 0.75, y + 1.9, g0 + 0.1, MAT.metal)]);
    }
    return put(rand(r) < 0.5 ? 'boxes' : 'trash', ...at(t, 0.7), out(w));
  }

  function onGrass(x: number, z: number, w: Wall | null, q: number, r: Rng): boolean {
    const yaw = w ? along(w) : 0;
    if (q < 0.25) return put('garden', x, z, yaw);
    if (q < 0.45) return put(rand(r) < 0.3 ? 'figtree' : 'tree', x, z, rand(r) * 6.3);
    if (q < 0.55) return put('bench', x, z, w ? out(w) : 0);
    if (q < 0.65) return put('shrub', x, z, rand(r) * 6.3);
    return false;
  }

  function inOpen(x: number, z: number, y: number, w: Wall | null, q: number, r: Rng): boolean {
    const yaw = w ? along(w) : 0, turnTo = yaw + (rand(r) < 0.5 ? 0 : Math.PI);
    // Out in the middle of a big open space, more often a building, and a little something beside whatever.
    const far = !w || w.d > 8;
    if (far) put(['weeds', 'debris', 'trash', 'boxes'][Math.floor(rand(r) * 4)], x + (rand(r) - 0.5) * 6, z + (rand(r) - 0.5) * 6, rand(r) * 6.3);
    if (q < 0.16) return put(rand(r) < 0.25 ? 'van' : 'car', x, z, turnTo + (rand(r) - 0.5) * 0.3);
    if (q < (far ? 0.45 : 0.3)) {
      // A back building: one to three floors of brick, square to the block it stands behind; built on to it
      // where the gap would be too narrow to pass, else across a yard from it.
      const W = 4 + rand(r) * 3, D = 3.5 + rand(r) * 2, H = (1 + Math.floor(rand(r) * (far ? 3 : 2))) * 3;
      const f = w ?? { d: 0, px: x, pz: z, ux: 1, uz: 0, nx: 0, nz: 1 }, s = !w ? 0 : w.d - D < 1.2 ? 0.05 + D / 2 : w.d - D / 2;
      const local = [solid(-W / 2, y - 1, s - D / 2, W / 2, y + H, s + D / 2, MAT.facadeBrick), solid(-W / 2, y + H, s - D / 2, W / 2, y + H + 0.5, s - D / 2 + 0.2, MAT.concrete), solid(-W / 2, y + H, s + D / 2 - 0.2, W / 2, y + H + 0.5, s + D / 2, MAT.concrete)];
      if (build({ ...f, px: x - f.nx * f.d, pz: z - f.nz * f.d }, local, [solid(-0.5, y, s + D / 2, 0.5, y + 2.1, s + D / 2 + 0.05, MAT.wood)])) return true;
    }
    if (q < 0.42) {
      // An abandoned market: a stall or two, a bench, boxes.
      let n = +put(rand(r) < 0.3 ? 'kiosk' : 'stall', x, z, turnTo);
      n += +put('bench', x + Math.cos(yaw) * 2, z - Math.sin(yaw) * 2, turnTo);
      n += +put('boxes', x - Math.cos(yaw) * 2, z + Math.sin(yaw) * 2, rand(r) * 6.3);
      return n > 0;
    }
    if (q < 0.54) return put('tarp', x, z, yaw);
    if (q < 0.64) {
      // A sandbagged position from the fighting, in an L.
      let n = +put('sandbags', x, z, yaw);
      n += +put('sandbags', x + Math.sin(yaw + Math.PI / 2) * 1.4, z + Math.cos(yaw + Math.PI / 2) * 1.4, yaw + Math.PI / 2);
      return n > 0;
    }
    if (q < 0.74) return rand(r) < 0.5 ? put('drum', x, z, rand(r) * 6.3) && (put('drum', x + 1.1, z + 0.3, rand(r) * 6.3) || true) : put('bags', x, z, rand(r) * 6.3) || put('bin', x, z, yaw);
    if (q < 0.84) return put(rand(r) < 0.5 ? 'jersey' : 'barrier', x, z, yaw);
    return put('rubblepile', x, z, rand(r) * 6.3, { w: 1.5 + rand(r) * 1.5 });
  }

  /** Stairs down the banks: a flight on one steep rough cell in a dozen, its foot on open ground or a street. */
  function banks() {
    for (let k = 0; k < mk.m.length; k++) {
      if (mk.m[k] !== MARK.ruin) continue;
      const r = makeRng(hashString(`bank${k}`));
      if (rand(r) > 0.08) continue;
      const i = k % mk.w, j = (k - i) / mk.w, cx = (i + 0.5) * mk.cell, cz = (j + 0.5) * mk.cell;
      const h = (dx: number, dz: number) => heightAt(g, cx + dx, cz + dz) ?? NaN;
      // Down the steepest way across the cell, 3 m either side of its middle.
      const [dx, dz] = [[1, 0], [0, 1]].map(([ax, az]) => h(ax * 3, az * 3) - h(-ax * 3, -az * 3)), l = Math.hypot(dx, dz);
      if (!(l > 1.2 && l < 4.5)) continue;
      const ux = -dx / l, uz = -dz / l, top = h(-ux * 3, -uz * 3), foot = h(ux * 3, uz * 3);
      if (!(top - foot > 1.2) || markAt(mk, cx + ux * 4.5, cz + uz * 4.5) === MARK.ruin) continue;
      // Built along +z in its own frame (x across), from the top at z = -3 down to the foot at z = 3.
      const ss: Solid[] = [], ds: Solid[] = [];
      stair(-0.8, -3, 0.8, 3, foot, top, 4, ss, ds);
      const yaw = Math.atan2(-ux, uz), turned = turn(ss.map(s => ({ ...s, x0: s.x0 + cx, x1: s.x1 + cx, z0: s.z0 + cz, z1: s.z1 + cz })), yaw, cx, cz);
      if (!free(turned.map(s => ({ ...s, y0: foot + 0.3 })), false)) continue;
      solids.push(...turned); keep(turned);
      decor.push(...turn(ds.map(s => ({ ...s, x0: s.x0 + cx, x1: s.x1 + cx, z0: s.z0 + cz, z1: s.z1 + cz })), yaw, cx, cz));
    }
  }
}
