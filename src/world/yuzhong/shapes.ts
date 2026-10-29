// 2D shapes for laying the city out on the real map (M3-41b): oriented rectangles fitted to footprints, tests
// between them and street segments, and polygon rasterising.

/** An oriented rectangle: centre, half sizes along its own x and z, and its turn (as geom's turn()). */
export interface Obb { cx: number; cz: number; hw: number; hd: number; yaw: number }

export type P2 = [number, number];

/** Points of a flat [x, z, x, z, ...] list. */
export const points = (flat: number[], k = 1): P2[] => { const o: P2[] = []; for (let i = 0; i < flat.length; i += 2) o.push([flat[i] * k, flat[i + 1] * k]); return o; };

export function convexHull(pts: P2[]): P2[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P2[] = [], hi: P2[] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

/** The smallest rectangle around the points, with one side along a hull edge. */
export function minRect(pts: P2[]): Obb {
  const h = convexHull(pts);
  let best: Obb | null = null, area = Infinity;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length], yaw = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(yaw), s = Math.sin(yaw);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, z] of h) { const u = c * x + s * z, v = -s * x + c * z; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const ar = (u1 - u0) * (v1 - v0);
    if (ar < area) {
      area = ar;
      const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
      best = { cx: c * um - s * vm, cz: s * um + c * vm, hw: (u1 - u0) / 2, hd: (v1 - v0) / 2, yaw };
    }
  }
  return best ?? { cx: pts[0][0], cz: pts[0][1], hw: 1, hd: 1, yaw: 0 };
}

export const polyArea = (p: P2[]) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;

/** The rectangle's corners in the world. */
export function corners(o: Obb): P2[] {
  const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [o.cx + c * a * o.hw - s * b * o.hd, o.cz + s * a * o.hw + c * b * o.hd]);
}

/** Separating-axis overlap of two rectangles grown by `pad`. */
export function obbOverlap(a: Obb, b: Obb, pad = 0): boolean {
  const dx = b.cx - a.cx, dz = b.cz - a.cz;
  for (const o of [a, b]) for (const [ux, uz] of [[Math.cos(o.yaw), Math.sin(o.yaw)], [-Math.sin(o.yaw), Math.cos(o.yaw)]]) {
    const ext = (r: Obb) => { const c = Math.cos(r.yaw), s = Math.sin(r.yaw); return (r.hw + pad) * Math.abs(c * ux + s * uz) + (r.hd + pad) * Math.abs(-s * ux + c * uz); };
    if (Math.abs(dx * ux + dz * uz) >= ext(a) + ext(b)) return false;
  }
  return true;
}

/** Distance from a point to a segment. */
export function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2)) : 0;
  return Math.hypot(px - ax - vx * t, pz - az - vz * t);
}

/** Whether a segment comes within r of a rectangle (sampled along both, enough at street scales). */
export function segNearObb(o: Obb, ax: number, az: number, bx: number, bz: number, r: number): boolean {
  const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
  const local = (x: number, z: number): P2 => [c * (x - o.cx) + s * (z - o.cz), -s * (x - o.cx) + c * (z - o.cz)];
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5));
  for (let i = 0; i <= n; i++) {
    const [u, v] = local(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n);
    if (Math.hypot(Math.max(0, Math.abs(u) - o.hw), Math.max(0, Math.abs(v) - o.hd)) < r) return true;
  }
  for (const [x, z] of corners(o)) if (segDist(x, z, ax, az, bx, bz) < r) return true;
  return false;
}

/** Rows of a grid (x0, z0, cell, w by h samples) covered by a polygon: calls fill(i0, i1, j) per span. */
export function rasterPoly(poly: P2[], x0: number, z0: number, cell: number, w: number, h: number, fill: (i0: number, i1: number, j: number) => void) {
  // Only the rows the polygon spans.
  let lo = Infinity, hi = -Infinity;
  for (const [, z] of poly) { if (z < lo) lo = z; if (z > hi) hi = z; }
  const j0 = Math.max(0, Math.ceil((lo - z0) / cell)), j1 = Math.min(h - 1, Math.floor((hi - z0) / cell));
  for (let j = j0; j <= j1; j++) {
    const z = z0 + j * cell, xs: number[] = [];
    for (let k = 0; k < poly.length; k++) {
      const [ax, az] = poly[k], [bx, bz] = poly[(k + 1) % poly.length];
      if ((az <= z && bz > z) || (bz <= z && az > z)) xs.push(ax + ((z - az) / (bz - az)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - x0) / cell)), i1 = Math.min(w - 1, Math.floor((xs[k + 1] - x0) / cell));
      if (i1 >= i0) fill(i0, i1, j);
    }
  }
}

/** Whether (x, z) is inside a polygon. */
export function inside(poly: P2[], x: number, z: number): boolean {
  let n = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) n = !n;
  }
  return n;
}
