// M3-56a (U-029, U-030): the real streets are smooth and clear. The ground never pokes through a street's surface,
// solids don't stand in a carriageway, and no prop does either: the machines keep the roads clear for their
// convoys, wrecks shoved onto the pavements.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { streetBuffers } from '../../src/render/streets';
import { heightAt } from '../../src/world/heightfield';
import { raycast } from '../../src/world/geom';
import { ROAD } from '../../src/world/yuzhong/ground';
import { MARK } from '../../src/world/yuzhong/marks';

const w = getWorld('yuzhong'), g = w.ground!;
const roads = w.streets.filter(s => ROAD.has(s.kind) && !s.steps);
/** Points every metre along each road's carriageway, across its width at 1 m. */
const across = (s: (typeof roads)[number], f: (x: number, z: number) => void) => {
  for (let k = 0; k + 1 < s.pts.length; k++) {
    const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l, nz = (bx - ax) / l;
    for (let t = 0; t < l; t += 1) for (let o = -s.w / 2 + 0.5; o < s.w / 2; o += 1) f(ax + ((bx - ax) * t) / l + nx * o, az + ((bz - az) * t) / l + nz * o);
  }
};
const onRoad = (x: number, z: number) => roads.some(s => s.pts.slice(1).some(([bx, bz], k) => {
  const [ax, az] = s.pts[k], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(x - ax - vx * t, z - az - vz * t) < s.w / 2;
}));

describe('clear, smooth streets (M3-56a)', () => {
  it('lays every street surface over the ground, never under it', { timeout: 120000 }, () => {
    let n = 0, under = 0;
    for (const { buf } of streetBuffers(g, w.streets)) {
      const p = buf.pos;
      for (let t = 0; t < p.length; t += 9) for (const [a, b, c] of [[1 / 3, 1 / 3, 1 / 3], [0.6, 0.2, 0.2], [0.2, 0.6, 0.2], [0.2, 0.2, 0.6]]) {
        // Surfaces only: a kerb's face stands upright.
        if (Math.abs((p[t + 3] - p[t]) * (p[t + 8] - p[t + 2]) - (p[t + 5] - p[t + 2]) * (p[t + 6] - p[t])) < 1e-6) continue;
        const x = a * p[t] + b * p[t + 3] + c * p[t + 6], y = a * p[t + 1] + b * p[t + 4] + c * p[t + 7], z = a * p[t + 2] + b * p[t + 5] + c * p[t + 8];
        const h = heightAt(g, x, z);
        if (h === null) continue;
        n++;
        if (h > y + 0.03) under++;
      }
    }
    expect(n).toBeGreaterThan(1e6);
    expect(under / n).toBeLessThan(0.0005);
  });
  it('draws nearly all of every carriageway, at the height of the ground under it', { timeout: 120000 }, () => {
    let n = 0, drawn = 0;
    const cover = new Set<number>();
    for (const { buf } of streetBuffers(g, roads)) for (let i = 0; i < buf.pos.length; i += 3) cover.add(Math.round(buf.pos[i + 2]) * 8192 + Math.round(buf.pos[i]));
    for (const s of roads) across(s, (x, z) => {
      if (heightAt(g, x, z) === null) return;
      n++;
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (cover.has((Math.round(z) + dz) * 8192 + Math.round(x) + dx)) { drawn++; return; }
    });
    expect(drawn / n).toBeGreaterThan(0.99);
  });
  it('keeps solids out of the carriageways, but for the monorail piers', { timeout: 120000 }, () => {
    let n = 0, blocked = 0;
    for (const s of roads) across(s, (x, z) => {
      const h = heightAt(g, x, z);
      if (h === null) return;
      n++;
      const hit = raycast(w.index, x, h + 3, z, 0, -1, 0, 3);
      if (hit && h + 3 - hit.t > h + 0.25) blocked++;
    });
    expect(blocked / n).toBeLessThan(0.004);
  });
  it('puts no prop on a carriageway: wrecks are pushed onto the pavements (U-030)', { timeout: 60000 }, () => {
    // Standing on the road: overhead signs and laundry, greenery on walls and set pieces underground don't count.
    const bad = w.props.filter(p => { const h = heightAt(g, p.x, p.z); return h !== null && Math.abs(p.y - h) < 0.5 && p.kind !== 'vine' && p.kind !== 'figroots' && onRoad(p.x, p.z); });
    expect(bad.map(p => `${p.kind} ${p.x.toFixed(0)},${p.z.toFixed(0)}`).slice(0, 12)).toEqual([]);
    expect(w.props.filter(p => p.kind === "car" || p.kind === "van").length).toBeGreaterThan(150);
  });
  it('marks the open ground for filling: ruins on the rough ground, woods, parks and open ground (U-029)', () => {
    const mk = w.marks!, ha = (v: number) => (mk.m.filter(x => x === v).length * mk.cell * mk.cell) / 1e4;
    // Hectares of each: the rough embankments and slopes by the buildings, the wild land, the real parks, the rest.
    expect(ha(MARK.ruin)).toBeGreaterThan(10);
    expect(ha(MARK.wood)).toBeGreaterThan(2);
    expect(ha(MARK.park)).toBeGreaterThan(5);
    expect(ha(MARK.open)).toBeGreaterThan(20);
    // None under a street.
    let bad = 0;
    for (const s of roads) across(s, (x, z) => { const i = Math.floor(x / mk.cell), j = Math.floor(z / mk.cell); if (i >= 0 && j >= 0 && i < mk.w && j < mk.h && mk.m[j * mk.w + i]) bad++; });
    expect(bad).toBe(0);
  });
});
