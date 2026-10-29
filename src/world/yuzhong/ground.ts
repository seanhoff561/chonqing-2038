// The ground of Yuzhong at 1:1 (M3-41b, D-016): the DEM upsampled to a 2 m heightfield, the riverbeds sunk
// under the water line inside the OSM river polygons, streets levelled across their width and eased along it.
import { heightfield, type Heightfield } from '../heightfield';
import { GEO, groundAt } from '../geo';
import { points, rasterPoly, type P2 } from './shapes';

/** Game y is elevation less this (the rivers near y 12, Jiefangbei near 120). */
export const Y0 = 150;
/** The rivers' surface (the Three Gorges reservoir's winter level, about 162 m). */
export const WATER_Y = 12;
export const CELL = 2;

export interface Street { kind: string; w: number; steps: boolean; bridge: boolean; tunnel: boolean; layer: number; name: string; pts: P2[] }

export const streets = (): Street[] => GEO.streets.map(([kind, w, f, layer, name, p]) => ({ kind, w: w / 10, steps: !!(f & 1), bridge: !!(f & 2), tunnel: !!(f & 4), layer, name, pts: points(p, 0.1) }));
/** Streets on the ground: not bridges, not tunnels or underground levels. */
export const onGround = (s: Street) => !s.bridge && !s.tunnel && s.layer >= 0;

/** Cells under a street's surface (set by buildGround): lot aprons leave them alone. */
export let streetCells = new Uint8Array(0);

export function buildGround(): Heightfield {
  const [W, H] = GEO.size, w = Math.floor(W / CELL) + 1, h = Math.floor(H / CELL) + 1;
  const g = heightfield(0, 0, CELL, w, h, 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.y[j * w + i] = groundAt(i * CELL, j * CELL) - Y0;
  // Riverbeds: under the water line inside the rivers' polygons, deepening away from the bank.
  for (const [kind, , p] of GEO.areas) if (kind === 'water') rasterPoly(points(p, 0.1), 0, 0, CELL, w, h, (i0, i1, j) => { for (let i = i0; i <= i1; i++) g.y[j * w + i] = Math.min(g.y[j * w + i], WATER_Y - 4); });
  level(g);
  return g;
}

/** Streets level across their width and keep the ground's slope along it (eased over a few points), blending
 *  back to the ground over 3 m beside them. */
function level(g: Heightfield) {
  const set = new Float32Array(g.y.length).fill(NaN), wt = new Float32Array(g.y.length);
  streetCells = new Uint8Array(g.y.length);
  for (const s of streets()) {
    if (!onGround(s) || s.pts.length < 2) continue;
    const raw = s.pts.map(([x, z]) => sample(g, x, z));
    const hs = raw.map((_, i) => (raw[Math.max(0, i - 1)] + 2 * raw[i] + raw[Math.min(raw.length - 1, i + 1)]) / 4);
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1;
      const half = s.w / 2 + 1, reach = half + 3;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - reach) / g.cell)), i1 = Math.min(g.w - 1, Math.ceil((Math.max(ax, bx) + reach) / g.cell));
      const j0 = Math.max(0, Math.floor((Math.min(az, bz) - reach) / g.cell)), j1 = Math.min(g.h - 1, Math.ceil((Math.max(az, bz) + reach) / g.cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = i * g.cell, z = j * g.cell, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
        const d = Math.hypot(x - ax - vx * t, z - az - vz * t);
        if (d > reach) continue;
        const y = hs[k] + (hs[k + 1] - hs[k]) * t, k2 = j * g.w + i, f = d <= half ? 1 : 1 - (d - half) / 3;
        // The strongest claim wins where streets meet or run side by side.
        if (f > wt[k2]) { wt[k2] = f; set[k2] = y; }
        if (d <= s.w / 2) streetCells[k2] = 1;
      }
    }
  }
  for (let k = 0; k < g.y.length; k++) if (wt[k] > 0) g.y[k] = g.y[k] + (set[k] - g.y[k]) * wt[k];
}

const sample = (g: Heightfield, x: number, z: number) => {
  const i = Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell))), j = Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell)));
  return g.y[j * g.w + i];
};
