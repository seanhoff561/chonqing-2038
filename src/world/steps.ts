// Stairs: a hidden ramp to walk on with visible steps over it (render-only boxes filling under the slope).
import { rampSolid, solid, type Solid } from './geom';
import { MAT } from './mats';

/** Visible steps over a ramp: render-only boxes filling under the slope. */
export function stepsFor(r: Solid, out: Solid[], mat: number = MAT.stone) {
  const rise = r.y1 - r.low, n = Math.max(1, Math.round(rise / 0.18));
  const along = r.ramp <= 2 ? r.x1 - r.x0 : r.z1 - r.z0;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * along, b = ((i + 1) / n) * along, top = r.low + ((i + 1) / n) * rise;
    // Distance a..b measured from the low end.
    let s: Solid;
    switch (r.ramp) {
      case 1: s = solid(r.x0 + a, r.y0, r.z0, r.x0 + b, top, r.z1, mat); break;
      case 2: s = solid(r.x1 - b, r.y0, r.z0, r.x1 - a, top, r.z1, mat); break;
      case 3: s = solid(r.x0, r.y0, r.z0 + a, r.x1, top, r.z0 + b, mat); break;
      default: s = solid(r.x0, r.y0, r.z1 - b, r.x1, top, r.z1 - a, mat);
    }
    out.push(s);
  }
}

/** A flight of stairs: dir as rampSolid (1 rises toward +x, 2 toward -x, 3 toward +z, 4 toward -z). */
export function stair(x0: number, z0: number, x1: number, z1: number, low: number, high: number, dir: 1 | 2 | 3 | 4, solids: Solid[], decor: Solid[]) {
  const r = rampSolid(x0, low - 0.5, z0, x1, z1, low, high, dir, MAT.hidden);
  solids.push(r);
  stepsFor(r, decor);
}
