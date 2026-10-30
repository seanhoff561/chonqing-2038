// M3-67 (U-032): no building is climbed by itself. Its own holds (everything built on its walls, off the ground:
// sills, AC units, balconies, pipes, ladders, beam ends, window openings, awnings, sign bars) never chain from the
// street to its roof; its ground floors are bare; street poles start the climbs; and a bot gets onto three roofs
// over 20 m by crossing from a lower neighbour's.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { raycast } from '../../src/world/geom';
import { heightAt } from '../../src/world/heightfield';
import { MAT } from '../../src/world/mats';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { B } from '../../src/sim/types';
import { ENVELOPE as E } from '../../src/data/envelope';
import { BARE } from '../../src/world/city/climb';
import type { Feature, Plot } from '../../src/world/world';
import { run, secs, settle } from './helpers';
import { climbPole, climbHolds } from './climbbot';

const w = getWorld('yuzhong'), g = w.ground!, near = w.plots.filter(p => !p.far);
/** From the street a lip this high is in reach (a wall kick); from a lip, the next this much higher (a jump and a
 *  grab from standing on it, more than a dyno from hanging). */
const FROM_GROUND = E.wallKick.max, STEP = E.mantleJump.max;

// Plots by 16 m cell; the distance from a point to a plot's footprint (0 inside).
const cells = new Map<number, Plot[]>(), key = (i: number, j: number) => i * 65536 + j;
for (const p of near) {
  const xs = p.corners.map(c => c[0]), zs = p.corners.map(c => c[1]);
  for (let i = Math.floor((Math.min(...xs) - 2) / 16); i <= Math.floor((Math.max(...xs) + 2) / 16); i++) for (let j = Math.floor((Math.min(...zs) - 2) / 16); j <= Math.floor((Math.max(...zs) + 2) / 16); j++) {
    const a = cells.get(key(i, j)); if (a) a.push(p); else cells.set(key(i, j), [p]);
  }
}
function dist(p: Plot, x: number, z: number): number {
  let inside = true, d = Infinity;
  for (let i = 0; i < 4; i++) {
    const [ax, az] = p.corners[i], [bx, bz] = p.corners[(i + 1) % 4], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
    d = Math.min(d, Math.hypot(x - ax - vx * t, z - az - vz * t));
    if (vx * (z - az) - vz * (x - ax) < 0) inside = false;
  }
  // (Corners wind either way: inside is all on one side.)
  if (!inside) { inside = true; for (let i = 0; i < 4; i++) { const [ax, az] = p.corners[i], [bx, bz] = p.corners[(i + 1) % 4]; if ((bx - ax) * (z - az) - (bz - az) * (x - ax) > 0) inside = false; } }
  return inside ? 0 : d;
}
/** The plot whose walls are nearest (x, z), within r. */
function owner(x: number, z: number, r: number): Plot | null {
  let best: Plot | null = null, bd = r;
  for (const p of cells.get(key(Math.floor(x / 16), Math.floor(z / 16))) ?? []) { const d = dist(p, x, z); if (d <= bd) { bd = d; best = p; } }
  return best;
}
/** Grows the footprint by r m, or shrinks it by -r: whether (x, z) is inside. */
const within = (p: Plot, x: number, z: number, r: number) => (r >= 0 ? dist(p, x, z) <= r : dist(p, x, z) === 0 && edge(p, x, z) >= -r);
const edge = (p: Plot, x: number, z: number) => Math.min(...p.corners.map((a, i) => { const b = p.corners[(i + 1) % 4], vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz, t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l2)); return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t); }));

/** The street beside a point on a wall: the highest ground within a metre (on a slope it may stand well over the
 *  building's base). */
const street = (x: number, z: number) => Math.max(...[[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => heightAt(g, x + a, z + b) ?? -99));

/** A plot's own holds: the tops of what it built on its walls (within 1.6 m outside them, or in the walls
 *  themselves) off the ground and under its roof; its pipes and ladders. (Not the poles at its foot: street
 *  furniture.) */
function holds(p: Plot): { x: number; z: number; y: number }[] {
  const out: { x: number; z: number; y: number }[] = [];
  for (let i = p.own!.solids[0]; i < p.own!.solids[1]; i++) {
    const s = w.solids[i], x = (s.x0 + s.x1) / 2, z = (s.z0 + s.z1) / 2;
    if (s.mat === MAT.hidden || s.y1 >= p.wall + 0.3 || s.y1 <= p.base + 0.3 || !within(p, x, z, 1.6) || within(p, x, z, -0.35)) continue;
    if (s.y0 < Math.max(...[[x, z], [s.x0, s.z0], [s.x1, s.z0], [s.x0, s.z1], [s.x1, s.z1]].map(([a, b]) => heightAt(g, a, b) ?? -99)) + 0.3) continue;
    out.push({ x, z, y: s.y1 });
  }
  for (let i = p.own!.climbables[0]; i < p.own!.climbables[1]; i++) {
    const c = w.climbables[i];
    if (c.kind !== 'pole') for (let y = c.y0; y <= c.y1; y += 0.5) out.push({ x: c.x, z: c.z, y });
  }
  return out;
}

describe('climbing reworked (M3-67)', () => {
  it("climbs no building of three floors or more to its roof on its own holds from the street", () => {
    let n = 0;
    const climbed: string[] = [];
    for (const p of near) {
      // (One and two floors are the low layer, the first step up: a wall kick, a shop's sign or a window, and
      // they're climbed.)
      if (p.wall - p.base < 9) continue;
      // (Nor one dug into a hillside, its roof a step off the ground beside it: that's walked onto, not climbed.)
      let hill = -Infinity;
      for (let i = 0; i < 4; i++) {
        const [ax, az] = p.corners[i], [bx, bz] = p.corners[(i + 1) % 4], l = Math.hypot(bx - ax, bz - az), cx = p.corners.reduce((a, c) => a + c[0] / 4, 0), cz = p.corners.reduce((a, c) => a + c[1] / 4, 0);
        for (let t = 0; t <= l; t += 2) { const x = ax + ((bx - ax) * t) / l, z = az + ((bz - az) * t) / l, k = 1.5 / Math.hypot(x - cx, z - cz); hill = Math.max(hill, heightAt(g, x + (x - cx) * k, z + (z - cz) * k) ?? -99); }
      }
      if (hill >= p.wall - STEP) continue;
      n++;
      const hs = holds(p), seen = new Uint8Array(hs.length), todo: number[] = [];
      hs.forEach((h, i) => { if (h.y <= street(h.x, h.z) + FROM_GROUND) { seen[i] = 1; todo.push(i); } });
      let top = false;
      while (todo.length && !top) {
        const a = hs[todo.pop()!];
        if (a.y >= p.wall - STEP) top = true;
        hs.forEach((b, i) => { if (!seen[i] && b.y - a.y <= STEP && Math.hypot(b.x - a.x, b.z - a.z) <= 2.5) { seen[i] = 1; todo.push(i); } });
      }
      if (top) climbed.push(`${p.kind} ${p.corners[0].map(v => v.toFixed(0))} ${(p.wall - p.base).toFixed(0)} m`);
    }
    expect(n).toBeGreaterThan(3000);
    expect(climbed, climbed.slice(0, 5).join('; ')).toHaveLength(0);
  });

  it('keeps the ground floors bare and the holds few: short runs, short ladders, scattered', () => {
    const kinds = ['sill', 'ac', 'pipe', 'ladder', 'balcony', 'beamEnd', 'route', 'rest'];
    let low = 0, counted = 0;
    const lows: string[] = [];
    for (const f of w.features) {
      if (!kinds.includes(f.kind)) continue;
      const p = owner(f.x, f.z, 1.5);
      if (!p) continue;
      counted++;
      const ground = Math.max(p.base, street(f.x, f.z));
      // (To the generator's sampling of the ground, a point a metre.)
      if (f.y < ground + BARE - 0.05) { low++; if (low < 6) lows.push(`${f.kind} ${f.x.toFixed(0)},${f.z.toFixed(0)} ${(f.y - ground).toFixed(1)}`); }
    }
    expect(counted).toBeGreaterThan(5000);
    expect(low, lows.join('; ')).toBe(0);
    const runs = new Map<number, number>();
    for (const f of w.features) if (f.kind === 'sill' || f.kind === 'ac') runs.set(f.group, (runs.get(f.group) ?? 0) + 1);
    expect(Math.max(...runs.values())).toBeLessThanOrEqual(5);
    expect(w.climbables.filter(c => c.kind === 'ladder' && c.y1 - c.y0 > 6.01 && w.features.some(f => f.kind === 'ladder' && Math.hypot(f.x - c.x, f.z - c.z) < 0.01)).length).toBe(0);
    // Most walls hold nothing: under one hold feature for every 4 m of a building's height on average.
    const tall = near.filter(p => p.wall - p.base >= 12);
    expect(counted / tall.reduce((a, p) => a + (p.wall - p.base) / 4, 0)).toBeLessThan(1);
  });

  it('stands climbable poles in the streets, and a bot climbs one from the pavement', () => {
    const poles = w.climbables.filter(c => c.kind === 'pole');
    expect(poles.length).toBeGreaterThan(200);
    const c = poles.find(q => q.y1 - q.y0 >= 8)!, s = createState(1, w);
    s.flags.clear = true;
    teleport(s.player, c.x + c.nx * 0.6, c.y0 + 0.05, c.z + c.nz * 0.6);
    run(s, w, 30);
    expect(climbPole(s, w, c)).toBe(true);
    expect(s.player.pos.y).toBeGreaterThan(c.y0 + 5);
  });

  it('a bot gets onto three roofs over 20 m by crossing from a lower neighbour', async () => {
    await settle();
    const lines = new Map<number, Feature[]>();
    for (const f of w.features) if (['route', 'rest', 'routeTop', 'vantage'].includes(f.kind)) { const a = lines.get(f.group); if (a) a.push(f); else lines.set(f.group, [f]); }
    const crossings = w.features.filter(f => f.kind === 'crossing');
    expect(crossings.length).toBeGreaterThan(30);
    const tried: string[] = [];
    let ok = 0;
    for (const c of crossings) {
      // Its line: the one whose first stub is over the plank.
      const fs = [...lines.values()].find(l => l[0].kind === 'route' && Math.hypot(l[0].x - c.x, l[0].z - c.z) < 1.2 && Math.abs(l[0].y - c.y - 2.4) < 0.1)?.filter(f => f.kind !== 'vantage');
      if (!fs || fs[fs.length - 1].y - c.y < 12) continue;
      const roof = fs[fs.length - 1].y, p = owner(c.x - c.nx! * 0.5, c.z - c.nz! * 0.5, 1)!;
      if (roof - p.base < 20) continue;
      // On the lower roof, a step back from its parapet, facing the plank across the gap.
      const hit = raycast(w.index, c.x + c.nx! * 0.05, c.y - 0.3, c.z + c.nz! * 0.05, c.nx!, 0, c.nz!, 6), gap = (hit?.t ?? 2) + 0.05;
      const s = createState(1, w), q = s.player, out = () => (q.pos.x - c.x) * c.nx! + (q.pos.z - c.z) * c.nz!;
      s.flags.clear = true;
      teleport(q, c.x + c.nx! * (gap + 1.4), c.y - 0.55, c.z + c.nz! * (gap + 1.4));
      q.yaw = Math.atan2(c.nx!, c.nz!);
      run(s, w, 30, { yaw: q.yaw });
      // Up to its parapet, over it onto the plank (W and Space), along the plank.
      for (let i = 0; i < secs(2) && out() > gap + 0.45; i++) run(s, w, 1, { my: 1, yaw: q.yaw });
      run(s, w, secs(0.5), { my: 1, yaw: q.yaw, buttons: B.JUMP, pressed: B.JUMP });
      run(s, w, secs(0.8), { my: 1, yaw: q.yaw });
      const r = climbHolds(s, w, fs);
      tried.push(`${r.ok ? 'ok' : r.at} (${r.got}/${fs.length})`);
      if (r.ok && roof - p.base >= 20) ok++;
      if (ok >= 3 || tried.length >= 8) break;
    }
    expect(ok, tried.join('; ')).toBeGreaterThanOrEqual(3);
  });
});
