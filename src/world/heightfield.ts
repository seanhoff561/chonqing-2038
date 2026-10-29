// Heightfield ground (M3-41a, D-016): a grid of heights, each cell split into two triangles along its x0z0-x1z1
// diagonal, with a collision shell `thick` metres deep under the surface (tunnels run below it) and holes where
// there's no ground (portals, shafts, the rivers' far side). It lives in the collision index beside the solids.

export interface Heightfield {
  /** north-west corner of sample (0, 0) and the spacing */
  x0: number; z0: number; cell: number;
  /** samples per row and per column */
  w: number; h: number;
  /** heights, row-major (z rows of w samples) */
  y: Float32Array;
  /** per cell ((w - 1) x (h - 1)): 1 where there is no ground */
  hole: Uint8Array;
  /** per sample, its surface for the render: 0 ground, 1 asphalt, 2 paving (streets laid on it) */
  surf?: Uint8Array;
  thick: number;
}

/** The ray hit id for the ground (solid ids are 0 and up). */
export const GROUND_ID = -2;

export function heightfield(x0: number, z0: number, cell: number, w: number, h: number, thick = 4): Heightfield {
  return { x0, z0, cell, w, h, y: new Float32Array(w * h), hole: new Uint8Array((w - 1) * (h - 1)), thick };
}

/** Surface height at (x, z) on the triangle under it, or null off the grid or over a hole. */
export function heightAt(g: Heightfield, x: number, z: number): number | null {
  const fx = (x - g.x0) / g.cell, fz = (z - g.z0) / g.cell;
  if (fx < 0 || fz < 0 || fx > g.w - 1 || fz > g.h - 1) return null;
  const i = Math.min(Math.floor(fx), g.w - 2), j = Math.min(Math.floor(fz), g.h - 2);
  if (g.hole[j * (g.w - 1) + i]) return null;
  const u = fx - i, v = fz - j, k = j * g.w + i;
  const a = g.y[k], b = g.y[k + 1], c = g.y[k + g.w], d = g.y[k + g.w + 1];
  // Lower-left triangle (a, b, d) where u >= v, upper-right (a, c, d) where v > u.
  return u >= v ? a + (b - a) * u + (d - b) * v : a + (c - a) * v + (d - c) * u;
}

/** Surface normal at (x, z) (up when off the grid). */
export function normalAt(g: Heightfield, x: number, z: number): [number, number, number] {
  const fx = (x - g.x0) / g.cell, fz = (z - g.z0) / g.cell;
  const i = Math.max(0, Math.min(Math.floor(fx), g.w - 2)), j = Math.max(0, Math.min(Math.floor(fz), g.h - 2));
  const k = j * g.w + i, a = g.y[k], b = g.y[k + 1], c = g.y[k + g.w], d = g.y[k + g.w + 1];
  const [sx, sz] = fx - i >= fz - j ? [b - a, d - b] : [d - c, c - a];
  const nx = -sx / g.cell, nz = -sz / g.cell, l = Math.hypot(nx, 1, nz);
  return [nx / l, 1 / l, nz / l];
}

/** Lowest and highest surface over an xz rectangle (its corners, edges every half cell and the samples inside),
 *  skipping holes; null where it's all hole or off the grid. */
export function spanOver(g: Heightfield, x0: number, z0: number, x1: number, z1: number): { lo: number; hi: number } | null {
  let lo = Infinity, hi = -Infinity;
  const take = (x: number, z: number) => { const y = heightAt(g, x, z); if (y !== null) { if (y < lo) lo = y; if (y > hi) hi = y; } };
  const step = g.cell / 2, nx = Math.max(1, Math.ceil((x1 - x0) / step)), nz = Math.max(1, Math.ceil((z1 - z0) / step));
  for (let a = 0; a <= nx; a++) { const x = x0 + ((x1 - x0) * a) / nx; take(x, z0); take(x, z1); }
  for (let b = 1; b < nz; b++) { const z = z0 + ((z1 - z0) * b) / nz; take(x0, z); take(x1, z); }
  for (let j = Math.ceil((z0 - g.z0) / g.cell); g.z0 + j * g.cell < z1; j++) for (let i = Math.ceil((x0 - g.x0) / g.cell); g.x0 + i * g.cell < x1; i++) take(g.x0 + i * g.cell, g.z0 + j * g.cell);
  return hi === -Infinity ? null : { lo, hi };
}

/** First hit of a ray with the ground's shell: the surface from above (its normal) or the shell's underside
 *  from below (straight down). t in units of the direction, as raycast. */
export function rayGround(g: Heightfield, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxT: number): { t: number; nx: number; ny: number; nz: number } | null {
  const hl = Math.hypot(dx, dz), dt = Math.min(hl > 1e-9 ? (g.cell * 0.4) / hl : Infinity, Math.abs(dy) > 1e-9 ? 0.4 / Math.abs(dy) : Infinity, maxT);
  const inside = (t: number) => {
    const y = heightAt(g, ox + dx * t, oz + dz * t), py = oy + dy * t;
    return y !== null && py <= y && py >= y - g.thick;
  };
  if (inside(0)) return null;
  for (let t0 = 0; t0 < maxT; t0 += dt) {
    const t1 = Math.min(t0 + dt, maxT);
    if (!inside(t1)) continue;
    let a = t0, b = t1;
    for (let k = 0; k < 14; k++) { const m = (a + b) / 2; if (inside(m)) b = m; else a = m; }
    const x = ox + dx * b, z = oz + dz * b, y = heightAt(g, x, z)!;
    if (oy + dy * a > y - 0.05) { const [nx, ny, nz] = normalAt(g, x, z); return { t: b, nx, ny, nz }; }
    return { t: b, nx: 0, ny: -1, nz: 0 };
  }
  return null;
}
