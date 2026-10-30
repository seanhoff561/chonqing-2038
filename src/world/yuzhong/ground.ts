// The ground of Yuzhong at 1:1 (M3-41b, D-016): the DEM upsampled to a 2 m heightfield, the riverbeds sunk
// under the water line inside the OSM river polygons, streets levelled across their width and eased along it.
import { heightfield, type Heightfield } from '../heightfield';
import { GEO, groundAt } from '../geo';
import { points, rasterPoly, inside, type P2 } from './shapes';

/** Game y is elevation less this (the rivers near y 12, Jiefangbei near 120). */
export const Y0 = 150;
/** The rivers' surface (the Three Gorges reservoir's winter level, about 162 m). */
export const WATER_Y = 12;
export const CELL = 2;

export interface Street { kind: string; w: number; steps: boolean; bridge: boolean; tunnel: boolean; layer: number; name: string; pts: P2[] }

/** Raffles City's podium, the machines' factory now (M3-57b): its walkways are built over. */
export const PODIUM: P2[] = points(GEO.buildings.find(b => b[3] === '重庆来福士广场')?.[4] ?? [], 0.1);

export const streets = (): Street[] => GEO.streets.map(([kind, w, f, layer, name, p]) => ({ kind, w: w / 10, steps: !!(f & 1), bridge: !!(f & 2), tunnel: !!(f & 4), layer, name, pts: points(p, 0.1) }))
  .filter(s => ROAD.has(s.kind) || !onGround(s) || s.pts.filter(([x, z]) => inside(PODIUM, x, z)).length * 2 <= s.pts.length);
/** Streets on the ground: not bridges, not tunnels or underground levels. */
export const onGround = (s: Street) => !s.bridge && !s.tunnel && s.layer >= 0;

/** Roads get kerbs and pavements beside their carriageway (render/streets.ts); other ways are paved to their width. */
export const ROAD = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service']);
export const KERB_W = 0.25, PAVE = 2;
/** How far either side of its line a street's surface reaches: carriageway, kerb and pavement. */
export const reach = (s: { kind: string; w: number }) => s.w / 2 + (ROAD.has(s.kind) ? KERB_W + PAVE : 0);

/** Cells under a street's surface (set by buildGround): 1 a road's carriageway, 2 a stair street, 3 a kerb or
 *  pavement, 4 a path or lane. Lot aprons leave all but pavements alone; a door's landing may cross a path. */
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

/** Streets lie level across their whole surface, pavements included, and follow the ground along it smoothed
 *  over a dozen metres (U-029), blending back to the ground over 3 m beside them. Ground under two streets goes
 *  to the one whose carriageway is nearer, so carriageways laid side by side at different levels (a divided road
 *  on a hillside) part at the kerbs between them. The widest are laid first; a street meeting a carriageway
 *  already laid takes its height there, so junctions meet flush. */
function level(g: Heightfield) {
  const set = new Float32Array(g.y.length).fill(NaN), wt = new Float32Array(g.y.length), near = new Float32Array(g.y.length).fill(Infinity);
  streetCells = new Uint8Array(g.y.length);
  const at = (x: number, z: number) => Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)));
  for (const s of streets().filter(s => onGround(s) && s.pts.length > 1).sort((a, b) => reach(b) - reach(a))) {
    // A carriageway already laid under this one's line, or beside it within its reach (the other half of a
    // divided road), sets its height there.
    const pts = every(s.pts, 2), R = reach(s) + 1;
    const laid = pts.map(([x, z], i) => {
      const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l, nz = (bx - ax) / l;
      for (const o of [0, s.w / 2 + 1, -s.w / 2 - 1, R, -R]) { const k = at(x + nx * o, z + nz * o); if (near[k] < 0) return k; }
      return -1;
    });
    // Smoothed over 12 m (stairs over 4, to keep their flights and landings).
    const claimed = laid.map(k => k >= 0), raw = pts.map(([x, z], i) => (claimed[i] ? set[laid[i]] : sample(g, x, z))), R2 = s.steps ? 1 : 3;
    const hs = raw.map((y, i) => {
      if (claimed[i]) return y;
      let sum = 0, n = 0;
      for (let k = Math.max(0, i - R2), e = Math.min(raw.length - 1, i + R2); k <= e; k++) { sum += raw[k]; n++; }
      return sum / n;
    });
    const half = reach(s) + 1, out = half + 3;
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - out) / g.cell)), i1 = Math.min(g.w - 1, Math.ceil((Math.max(ax, bx) + out) / g.cell));
      const j0 = Math.max(0, Math.floor((Math.min(az, bz) - out) / g.cell)), j1 = Math.min(g.h - 1, Math.ceil((Math.max(az, bz) + out) / g.cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = i * g.cell, z = j * g.cell, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
        const d = Math.hypot(x - ax - vx * t, z - az - vz * t);
        if (d > out) continue;
        const y = hs[k] + (hs[k + 1] - hs[k]) * t, k2 = j * g.w + i, f = d <= half ? 1 : 1 - (d - half) / 3, edge = d - s.w / 2;
        if (f >= 1 ? wt[k2] < 1 || edge < near[k2] : f > wt[k2]) { wt[k2] = f; set[k2] = y; if (f >= 1) near[k2] = edge; }
        if (d <= s.w / 2) streetCells[k2] = s.steps || streetCells[k2] === 2 ? 2 : ROAD.has(s.kind) || streetCells[k2] === 1 ? 1 : 4;
        else if (d <= reach(s) && !streetCells[k2]) streetCells[k2] = 3;
      }
    }
  }
  for (let k = 0; k < g.y.length; k++) if (wt[k] > 0) g.y[k] = g.y[k] + (set[k] - g.y[k]) * wt[k];
}

/** The line with a point at least every `step` metres. */
function every(line: P2[], step: number): P2[] {
  const out: P2[] = [line[0]];
  for (let k = 1; k < line.length; k++) {
    const [ax, az] = line[k - 1], [bx, bz] = line[k], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let i = 1; i <= n; i++) out.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
  }
  return out;
}

const sample = (g: Heightfield, x: number, z: number) => {
  const i = Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell))), j = Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell)));
  return g.y[j * g.w + i];
};
