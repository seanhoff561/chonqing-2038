// Collision geometry: axis-aligned boxes and ramps in a uniform 4 m grid.
// A ramp is a box whose top slopes along one axis: it rises from `low` to y1 toward `ramp` direction.

export interface Box { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }

/** ramp: 0 flat box, 1 rises toward +x, 2 toward -x, 3 toward +z, 4 toward -z */
export interface Solid extends Box { mat: number; ramp: number; low: number }

export interface Hit { t: number; nx: number; ny: number; nz: number; id: number }

export const CELL = 4;

export function solid(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat = 0): Solid {
  return { x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), mat, ramp: 0, low: 0 };
}

export function rampSolid(x0: number, y0: number, z0: number, x1: number, z1: number, low: number, high: number, dir: 1 | 2 | 3 | 4, mat = 0): Solid {
  const s = solid(x0, y0, z0, x1, high, z1, mat);
  s.ramp = dir;
  s.low = low;
  return s;
}

/** Fraction 0..1 along the ramp's rising direction at (x, z). */
function rampFrac(s: Solid, x: number, z: number): number {
  let f: number;
  switch (s.ramp) {
    case 1: f = (x - s.x0) / (s.x1 - s.x0); break;
    case 2: f = (s.x1 - x) / (s.x1 - s.x0); break;
    case 3: f = (z - s.z0) / (s.z1 - s.z0); break;
    default: f = (s.z1 - z) / (s.z1 - s.z0);
  }
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

export function topAt(s: Solid, x: number, z: number): number {
  return s.ramp ? s.low + (s.y1 - s.low) * rampFrac(s, x, z) : s.y1;
}

/** Highest top of the solid over the footprint's overlap with it. */
export function topOver(s: Solid, x0: number, z0: number, x1: number, z1: number): number {
  if (!s.ramp) return s.y1;
  const cx0 = Math.max(x0, s.x0), cx1 = Math.min(x1, s.x1), cz0 = Math.max(z0, s.z0), cz1 = Math.min(z1, s.z1);
  switch (s.ramp) {
    case 1: return topAt(s, cx1, 0);
    case 2: return topAt(s, cx0, 0);
    case 3: return topAt(s, 0, cz1);
    default: return topAt(s, 0, cz0);
  }
}

export interface SolidIndex {
  solids: Solid[];
  cells: Map<number, number[]>;
  /** per-solid flag: 1 disables the solid (open doors, cut fences) */
  off: Uint8Array;
  stamp: Uint32Array;
  stampN: number;
}

const key = (ix: number, iz: number) => (ix + 32768) * 65536 + (iz + 32768);

export function buildIndex(solids: Solid[]): SolidIndex {
  const cells = new Map<number, number[]>();
  solids.forEach((s, i) => {
    for (let ix = Math.floor(s.x0 / CELL); ix <= Math.floor((s.x1 - 1e-6) / CELL); ix++)
      for (let iz = Math.floor(s.z0 / CELL); iz <= Math.floor((s.z1 - 1e-6) / CELL); iz++) {
        const k = key(ix, iz);
        let c = cells.get(k);
        if (!c) cells.set(k, (c = []));
        c.push(i);
      }
  });
  return { solids, cells, off: new Uint8Array(solids.length), stamp: new Uint32Array(solids.length), stampN: 0 };
}

/** Ids of enabled solids whose footprint touches the xz rectangle. Reuses `out`. */
export function query(idx: SolidIndex, x0: number, z0: number, x1: number, z1: number, out: number[] = []): number[] {
  out.length = 0;
  const n = ++idx.stampN;
  for (let ix = Math.floor(x0 / CELL); ix <= Math.floor(x1 / CELL); ix++)
    for (let iz = Math.floor(z0 / CELL); iz <= Math.floor(z1 / CELL); iz++) {
      const c = idx.cells.get(key(ix, iz));
      if (!c) continue;
      for (const i of c) {
        if (idx.stamp[i] === n || idx.off[i]) continue;
        idx.stamp[i] = n;
        out.push(i);
      }
    }
  return out;
}

const EPS = 1e-6;
const scratch: number[] = [];

/** True when the box overlaps any enabled solid (touching faces don't count). */
export function overlaps(idx: SolidIndex, b: Box): boolean {
  for (const i of query(idx, b.x0, b.z0, b.x1, b.z1, scratch)) {
    const s = idx.solids[i];
    if (b.x1 <= s.x0 + EPS || b.x0 >= s.x1 - EPS || b.z1 <= s.z0 + EPS || b.z0 >= s.z1 - EPS) continue;
    if (b.y1 <= s.y0 + EPS || b.y0 >= topOver(s, b.x0, b.z0, b.x1, b.z1) - EPS) continue;
    return true;
  }
  return false;
}

/** Highest solid top at (x, z) that is at or below y + 1e-3; -Infinity if none. */
export function groundAt(idx: SolidIndex, x: number, z: number, y: number): number {
  let best = -Infinity;
  for (const i of query(idx, x, z, x, z, scratch)) {
    const s = idx.solids[i];
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    const t = topAt(s, x, z);
    if (t <= y + 1e-3 && t > best) best = t;
  }
  return best;
}

/** Ray against one solid (slabs plus the ramp plane). Returns t and the entry normal, or null. */
function raySolid(s: Solid, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxT: number, h: Hit): boolean {
  let tmin = 0, tmax = maxT, nx = 0, ny = 0, nz = 0;
  const o = [ox, oy, oz], d = [dx, dy, dz], lo = [s.x0, s.y0, s.z0], hi = [s.x1, s.y1, s.z1];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-12) {
      if (o[a] < lo[a] || o[a] > hi[a]) return false;
      continue;
    }
    let t0 = (lo[a] - o[a]) / d[a], t1 = (hi[a] - o[a]) / d[a];
    let sign = -1;
    if (t0 > t1) { const tt = t0; t0 = t1; t1 = tt; sign = 1; }
    if (t0 > tmin) { tmin = t0; nx = a === 0 ? sign : 0; ny = a === 1 ? sign : 0; nz = a === 2 ? sign : 0; }
    if (t1 < tmax) tmax = t1;
    if (tmin > tmax) return false;
  }
  if (s.ramp) {
    // Inside when y <= low + k * u where u runs along the rising direction.
    let px = 0, pz = 0, len: number, u0: number;
    switch (s.ramp) {
      case 1: px = 1; len = s.x1 - s.x0; u0 = s.x0; break;
      case 2: px = -1; len = s.x1 - s.x0; u0 = -s.x1; break;
      case 3: pz = 1; len = s.z1 - s.z0; u0 = s.z0; break;
      default: pz = -1; len = s.z1 - s.z0; u0 = -s.z1;
    }
    const k = (s.y1 - s.low) / len;
    // f(p) = y - k*(px*x + pz*z) - (low - k*u0) <= 0
    const c = s.low - k * u0;
    const f0 = oy - k * (px * ox + pz * oz) - c;
    const fd = dy - k * (px * dx + pz * dz);
    if (Math.abs(fd) < 1e-12) { if (f0 > 0) return false; }
    else {
      const tp = -f0 / fd;
      if (fd > 0) { if (tp < tmax) tmax = tp; }
      else if (tp > tmin) {
        tmin = tp;
        const l = Math.hypot(k, 1);
        nx = (-k * px) / l; ny = 1 / l; nz = (-k * pz) / l;
      }
      if (tmin > tmax) return false;
    }
  }
  if (tmin >= maxT) return false;
  h.t = tmin; h.nx = nx; h.ny = ny; h.nz = nz;
  return true;
}

/** First hit along a ray (dir need not be normalized; t is in units of dir). Walks the grid. */
export function raycast(idx: SolidIndex, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxT: number): Hit | null {
  const best: Hit = { t: maxT, nx: 0, ny: 0, nz: 0, id: -1 };
  const h: Hit = { t: 0, nx: 0, ny: 0, nz: 0, id: -1 };
  const n = ++idx.stampN;
  let ix = Math.floor(ox / CELL), iz = Math.floor(oz / CELL);
  const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = Math.abs(dx) > 1e-12 ? CELL / Math.abs(dx) : Infinity;
  const tdz = Math.abs(dz) > 1e-12 ? CELL / Math.abs(dz) : Infinity;
  let tx = Math.abs(dx) > 1e-12 ? ((dx > 0 ? (ix + 1) * CELL - ox : ox - ix * CELL) / Math.abs(dx)) : Infinity;
  let tz = Math.abs(dz) > 1e-12 ? ((dz > 0 ? (iz + 1) * CELL - oz : oz - iz * CELL) / Math.abs(dz)) : Infinity;
  let tCell = 0;
  for (let guard = 0; guard < 4096; guard++) {
    const c = idx.cells.get(key(ix, iz));
    if (c) for (const i of c) {
      if (idx.stamp[i] === n || idx.off[i]) continue;
      idx.stamp[i] = n;
      if (raySolid(idx.solids[i], ox, oy, oz, dx, dy, dz, best.t, h)) { best.t = h.t; best.nx = h.nx; best.ny = h.ny; best.nz = h.nz; best.id = i; }
    }
    // Hits found so far are final once the next cell starts beyond them.
    const tNext = Math.min(tx, tz);
    if (best.id >= 0 && best.t <= tNext) break;
    tCell = tNext;
    if (tCell > maxT) break;
    if (tx < tz) { ix += sx; tx += tdx; } else { iz += sz; tz += tdz; }
  }
  return best.id >= 0 ? best : null;
}

/** Subtract box b from every flat solid it overlaps; each becomes up to 6 boxes. Ramps are left alone. */
export function carve(solids: Solid[], b: Box): Solid[] {
  const out: Solid[] = [];
  for (const s of solids) {
    if (s.ramp || b.x1 <= s.x0 || b.x0 >= s.x1 || b.y1 <= s.y0 || b.y0 >= s.y1 || b.z1 <= s.z0 || b.z0 >= s.z1) { out.push(s); continue; }
    const piece = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
      if (x1 - x0 > EPS && y1 - y0 > EPS && z1 - z0 > EPS) out.push({ ...s, x0, y0, z0, x1, y1, z1 });
    };
    const y0 = Math.max(s.y0, b.y0), y1 = Math.min(s.y1, b.y1);
    piece(s.x0, s.y0, s.z0, s.x1, y0, s.z1);
    piece(s.x0, y1, s.z0, s.x1, s.y1, s.z1);
    piece(s.x0, y0, s.z0, b.x0, y1, s.z1);
    piece(b.x1, y0, s.z0, s.x1, y1, s.z1);
    const x0 = Math.max(s.x0, b.x0), x1 = Math.min(s.x1, b.x1);
    piece(x0, y0, s.z0, x1, y1, b.z0);
    piece(x0, y0, b.z1, x1, y1, s.z1);
  }
  return out;
}

export const volume = (b: Box) => (b.x1 - b.x0) * (b.y1 - b.y0) * (b.z1 - b.z0);
