// M3-56 (U-022, U-024, U-028): nothing empty, everything in order. No open patch between the buildings is left
// bare for 12 m, every 20 m of street has something beside it, nothing floats, and what stands by a street or a
// wall is squared to it.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { raycast } from '../../src/world/geom';
import { MARK } from '../../src/world/yuzhong/marks';
import { HUNG } from '../../src/data/props';
import { ROAD } from '../../src/world/yuzhong/ground';

const w = getWorld('yuzhong'), mk = w.marks!;

const roads = w.streets.filter(s => ROAD.has(s.kind) && !s.steps), cells = new Map<number, number[][]>();
for (const s of roads) for (let k = 0; k + 1 < s.pts.length; k++) {
  const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1];
  for (let i = Math.floor((Math.min(ax, bx) - s.w) / 16); i <= Math.floor((Math.max(ax, bx) + s.w) / 16); i++)
    for (let j = Math.floor((Math.min(az, bz) - s.w) / 16); j <= Math.floor((Math.max(az, bz) + s.w) / 16); j++) { const c = cells.get(i * 65536 + j); if (c) c.push([ax, az, bx, bz, s.w / 2]); else cells.set(i * 65536 + j, [[ax, az, bx, bz, s.w / 2]]); }
}
/** On a road's carriageway. */
const onRoad = (x: number, z: number) => (cells.get(Math.floor(x / 16) * 65536 + Math.floor(z / 16)) ?? []).some(([ax, az, bx, bz, h]) => {
  const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(x - ax - vx * t, z - az - vz * t) < h;
});

describe('nothing empty, everything in order (M3-56)', () => {
  it('leaves no open patch of 12 m by 12 m bare', () => {
    const used = new Uint8Array(mk.m.length), mark = (x: number, z: number) => { const i = Math.floor(x / mk.cell), j = Math.floor(z / mk.cell); if (i >= 0 && j >= 0 && i < mk.w && j < mk.h) used[j * mk.w + i] = 1; };
    for (const p of w.props) mark(p.x, p.z);
    for (const s of w.solids) if (s.x1 - s.x0 < 40 && s.z1 - s.z0 < 40) for (let x = s.x0; x <= s.x1 + 1e-6; x += mk.cell / 2) for (let z = s.z0; z <= s.z1 + 1e-6; z += mk.cell / 2) mark(x, z);
    let bare = 0, windows = 0;
    for (let j = 0; j + 2 < mk.h; j++) for (let i = 0; i + 2 < mk.w; i++) {
      let open = true, any = false;
      for (let b = 0; b < 3 && open; b++) for (let a = 0; a < 3; a++) { const k = (j + b) * mk.w + i + a; if (mk.m[k] !== MARK.open) { open = false; break; } any ||= !!used[k]; }
      if (!open) continue;
      windows++;
      if (!any) bare++;
    }
    expect(windows).toBeGreaterThan(1000);
    expect(bare).toBe(0);
  });
  it('puts something beside every 20 m of street, on the pavement', () => {
    const near = new Map<number, typeof w.props>(), key = (x: number, z: number) => Math.floor(x / 16) * 65536 + Math.floor(z / 16);
    for (const p of w.props) { const k = key(p.x, p.z), a = near.get(k); if (a) a.push(p); else near.set(k, [p]); }
    let stretches = 0, empty = 0;
    // Streets on the peninsula (the far banks aren't dressed): a building of it within 40 m.
    const built = new Set(w.plots.filter(p => !p.far).map(p => key(p.corners[0][0], p.corners[0][1])));
    for (const s of w.streets) {
      let d = 0;
      for (let k = 0; k + 1 < s.pts.length; k++) {
        const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], l = Math.hypot(bx - ax, bz - az);
        for (let t = (20 - (d % 20)) % 20; t < l; t += 20) {
          const x = ax + ((bx - ax) * t) / l, z = az + ((bz - az) * t) / l, reach = s.w / 2 + 6;
          let mine = false;
          for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) mine ||= built.has(key(x + di * 16, z + dj * 16));
          // A stretch with room beside it: its pavement, either side, across its width not another road's
          // carriageway (a road laid against the next has none).
          const nx = -(bz - az) / l, nz = (bx - ax) / l, side = (k: number) => [0.6, 1.5, 2.2].every(o => !onRoad(x + nx * k * (s.w / 2 + o), z + nz * k * (s.w / 2 + o)));
          if (!mine || !(side(1) || side(-1))) continue;
          stretches++;
          let found = false;
          for (let di = -1; di <= 1 && !found; di++) for (let dj = -1; dj <= 1 && !found; dj++)
            found = (near.get(key(x + di * 16, z + dj * 16)) ?? []).some(p => Math.hypot(p.x - x, p.z - z) < Math.max(10, reach));
          if (!found) empty++;
        }
        d += l;
      }
    }
    expect(stretches).toBeGreaterThan(3000);
    expect(empty / stretches).toBeLessThan(0.02);
  });
  it('stands every prop on what is under it: nothing floats', { timeout: 60000 }, () => {
    const floating = w.props.filter(p => {
      if (HUNG.has(p.kind)) return false;
      const hit = raycast(w.index, p.x, p.y + 0.3, p.z, 0, -1, 0, 30);
      return !hit || hit.t > 0.55;
    });
    const kinds: Record<string, number> = {};
    for (const p of floating) kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;
    expect(floating.length / w.props.length, JSON.stringify(kinds)).toBeLessThan(0.002);
  });
  it('squares what stands by a street to it', () => {
    const KINDS = new Set(['bench', 'stall', 'kiosk', 'car', 'van', 'bus', 'edict', 'dronedock', 'bin', 'lamppost']);
    let n = 0, skew = 0;
    for (const p of w.props) {
      if (!KINDS.has(p.kind)) continue;
      let best = Infinity, dir = 0;
      for (const s of w.streets) for (let k = 0; k + 1 < s.pts.length; k++) {
        const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((p.x - ax) * vx + (p.z - az) * vz) / (vx * vx + vz * vz || 1)));
        const d = Math.hypot(p.x - ax - vx * t, p.z - az - vz * t) - s.w / 2;
        if (d < best) { best = d; dir = Math.atan2(vx, vz); }
      }
      if (best > 3) continue;
      n++;
      const off = Math.abs(((p.yaw - dir) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2));
      if (Math.min(off, Math.PI / 2 - off) > 0.35) skew++;
    }
    expect(n).toBeGreaterThan(1000);
    expect(skew / n).toBeLessThan(0.05);
  });
});
