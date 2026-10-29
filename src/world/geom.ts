import { heightAt, spanOver, rayGround, GROUND_ID, type Heightfield } from './heightfield';

// Collision geometry: boxes and ramps in a uniform 4 m grid. A ramp is a box whose top slopes along one axis: it
// rises from `low` to y1 toward `ramp` direction. A turned solid (M3-40, U-017) is a box turned by a yaw about a
// pivot: its x0..z1 are its world bounds (for the grid and quick rejects) and `rot` holds the box as it was
// before turning; tests run in that unturned frame.

export interface Box { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }

/** The unturned box's x and z extents, the pivot and the turn's cosine and sine. */
export interface Rot { x0: number; z0: number; x1: number; z1: number; px: number; pz: number; c: number; s: number }

/** ramp: 0 flat box, 1 rises toward +x, 2 toward -x, 3 toward +z, 4 toward -z (in the unturned frame) */
export interface Solid extends Box { mat: number; ramp: number; low: number; rot?: Rot }

export interface Hit { t: number; nx: number; ny: number; nz: number; id: number }

const EPS = 1e-6;

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

/** Turn solids by yaw about (px, pz): each keeps its box as `rot` and gets the world bounds of its corners. */
export function turn(solids: Solid[], yaw: number, px: number, pz: number): Solid[] {
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  return solids.map(s => {
    if (s.rot) throw new Error('turn: solid already turned');
    const xs: number[] = [], zs: number[] = [];
    for (const [x, z] of [[s.x0, s.z0], [s.x1, s.z0], [s.x0, s.z1], [s.x1, s.z1]]) {
      const dx = x - px, dz = z - pz;
      xs.push(px + c * dx - sn * dz); zs.push(pz + sn * dx + c * dz);
    }
    return { ...s, x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs), rot: { x0: s.x0, z0: s.z0, x1: s.x1, z1: s.z1, px, pz, c, s: sn } };
  });
}

/** A world point in a turned solid's unturned frame (unchanged for an axis-aligned one). */
export function frameIn(s: Solid, x: number, z: number): [number, number] {
  const r = s.rot;
  if (!r) return [x, z];
  const dx = x - r.px, dz = z - r.pz;
  return [r.px + r.c * dx + r.s * dz, r.pz - r.s * dx + r.c * dz];
}
/** A point of a turned solid's unturned frame back in the world. */
export function frameOut(s: Solid, x: number, z: number): [number, number] {
  const r = s.rot;
  if (!r) return [x, z];
  const dx = x - r.px, dz = z - r.pz;
  return [r.px + r.c * dx - r.s * dz, r.pz + r.s * dx + r.c * dz];
}
/** A direction of the unturned frame in the world. */
export function frameDirOut(s: Solid, x: number, z: number): [number, number] {
  const r = s.rot;
  return r ? [r.c * x - r.s * z, r.s * x + r.c * z] : [x, z];
}

/** The box's x and z extents in its own frame. */
const ext = (s: Solid): { x0: number; z0: number; x1: number; z1: number } => s.rot ?? s;

/** Exact footprint test of a turned solid against an axis-aligned xz rectangle (separating axes); true for an
 *  axis-aligned solid, whose bounds the caller has already tested. */
export function xzHit(s: Solid, x0: number, z0: number, x1: number, z1: number): boolean {
  const r = s.rot;
  if (!r) return true;
  const hu = (r.x1 - r.x0) / 2, hv = (r.z1 - r.z0) / 2, aw = (x1 - x0) / 2, ad = (z1 - z0) / 2;
  const [ocx, ocz] = frameOut(s, (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2);
  const dx = (x0 + x1) / 2 - ocx, dz = (z0 + z1) / 2 - ocz, ac = Math.abs(r.c), as = Math.abs(r.s);
  if (Math.abs(dx) >= ac * hu + as * hv + aw - EPS) return false;
  if (Math.abs(dz) >= as * hu + ac * hv + ad - EPS) return false;
  if (Math.abs(dx * r.c + dz * r.s) >= hu + aw * ac + ad * as - EPS) return false;
  if (Math.abs(-dx * r.s + dz * r.c) >= hv + aw * as + ad * ac - EPS) return false;
  return true;
}

/** Fraction 0..1 along the ramp's rising direction at (x, z) of its own frame. */
function rampFrac(s: Solid, x: number, z: number): number {
  const e = ext(s);
  let f: number;
  switch (s.ramp) {
    case 1: f = (x - e.x0) / (e.x1 - e.x0); break;
    case 2: f = (e.x1 - x) / (e.x1 - e.x0); break;
    case 3: f = (z - e.z0) / (e.z1 - e.z0); break;
    default: f = (e.z1 - z) / (e.z1 - e.z0);
  }
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

export function topAt(s: Solid, x: number, z: number): number {
  if (!s.ramp) return s.y1;
  const [lx, lz] = frameIn(s, x, z);
  return s.low + (s.y1 - s.low) * rampFrac(s, lx, lz);
}

/** Highest top of the solid over the footprint's overlap with it. */
export function topOver(s: Solid, x0: number, z0: number, x1: number, z1: number): number {
  if (!s.ramp) return s.y1;
  // A turned ramp: the highest of the footprint's corners and centre (the footprints tested are small).
  if (s.rot) return Math.max(topAt(s, x0, z0), topAt(s, x1, z0), topAt(s, x0, z1), topAt(s, x1, z1), topAt(s, (x0 + x1) / 2, (z0 + z1) / 2));
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
  /** the heightfield ground (M3-41a), if the world has one */
  ground?: Heightfield;
  cells: Map<number, number[]>;
  /** per-solid flag: 1 disables the solid (open doors, cut fences) */
  off: Uint8Array;
  stamp: Uint32Array;
  stampN: number;
}

const key = (ix: number, iz: number) => (ix + 32768) * 65536 + (iz + 32768);

export function buildIndex(solids: Solid[], ground?: Heightfield): SolidIndex {
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
  return { solids, ground, cells, off: new Uint8Array(solids.length), stamp: new Uint32Array(solids.length), stampN: 0 };
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

const scratch: number[] = [];

/** True when the box overlaps any enabled solid (touching faces don't count). */
export function overlaps(idx: SolidIndex, b: Box): boolean {
  for (const i of query(idx, b.x0, b.z0, b.x1, b.z1, scratch)) {
    const s = idx.solids[i];
    if (b.x1 <= s.x0 + EPS || b.x0 >= s.x1 - EPS || b.z1 <= s.z0 + EPS || b.z0 >= s.z1 - EPS) continue;
    if (s.rot && !xzHit(s, b.x0, b.z0, b.x1, b.z1)) continue;
    if (b.y1 <= s.y0 + EPS || b.y0 >= topOver(s, b.x0, b.z0, b.x1, b.z1) - EPS) continue;
    return true;
  }
  const g = groundBox(idx, b.x0, b.z0, b.x1, b.z1);
  return !!g && b.y1 > g.y0 + EPS && b.y0 < g.y1 - EPS;
}

/** The ground's shell over an xz rectangle as a solid spanning it: top the highest surface, bottom the lowest
 *  surface less the shell; null without ground there. Physics treats it like any other solid. */
export function groundBox(idx: SolidIndex, x0: number, z0: number, x1: number, z1: number): Solid | null {
  const g = idx.ground, sp = g && spanOver(g, x0, z0, x1, z1);
  // low NaN marks it as the ground (physics asks the heightfield for its slope).
  return sp ? { x0, z0, x1, z1, y0: sp.lo - g!.thick, y1: sp.hi, mat: 0, ramp: 0, low: NaN } : null;
}

/** Highest solid top at (x, z) that is at or below y + 1e-3; -Infinity if none. */
export function groundAt(idx: SolidIndex, x: number, z: number, y: number): number {
  let best = -Infinity;
  for (const i of query(idx, x, z, x, z, scratch)) {
    const s = idx.solids[i];
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    if (s.rot) { const [lx, lz] = frameIn(s, x, z), r = s.rot; if (lx < r.x0 || lx > r.x1 || lz < r.z0 || lz > r.z1) continue; }
    const t = topAt(s, x, z);
    if (t <= y + 1e-3 && t > best) best = t;
  }
  const t = idx.ground ? heightAt(idx.ground, x, z) : null;
  if (t !== null && t <= y + 1e-3 && t > best) best = t;
  return best;
}

/** Ray against one solid (slabs plus the ramp plane), in its own frame. Returns t and the entry normal, or null. */
function raySolid(s: Solid, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxT: number, h: Hit): boolean {
  if (s.rot) {
    // Turn the ray into the solid's frame, test there, turn the normal back.
    [ox, oz] = frameIn(s, ox, oz);
    const r = s.rot, ldx = r.c * dx + r.s * dz, ldz = -r.s * dx + r.c * dz;
    if (!raySolidLocal(s, ext(s), ox, oy, oz, ldx, dy, ldz, maxT, h)) return false;
    [h.nx, h.nz] = frameDirOut(s, h.nx, h.nz);
    return true;
  }
  return raySolidLocal(s, s, ox, oy, oz, dx, dy, dz, maxT, h);
}

function raySolidLocal(s: Solid, e: { x0: number; z0: number; x1: number; z1: number }, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxT: number, h: Hit): boolean {
  let tmin = 0, tmax = maxT, nx = 0, ny = 0, nz = 0;
  const o = [ox, oy, oz], d = [dx, dy, dz], lo = [e.x0, s.y0, e.z0], hi = [e.x1, s.y1, e.z1];
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
      case 1: px = 1; len = e.x1 - e.x0; u0 = e.x0; break;
      case 2: px = -1; len = e.x1 - e.x0; u0 = -e.x1; break;
      case 3: pz = 1; len = e.z1 - e.z0; u0 = e.z0; break;
      default: pz = -1; len = e.z1 - e.z0; u0 = -e.z1;
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
  const g = idx.ground && rayGround(idx.ground, ox, oy, oz, dx, dy, dz, best.t);
  if (g) return { ...g, id: GROUND_ID };
  return best.id >= 0 ? best : null;
}

/** Subtract box b from every flat solid it overlaps; each becomes up to 6 boxes. Ramps and turned solids are left
 *  alone (carve a turned building before turning it). */
export function carve(solids: Solid[], b: Box): Solid[] {
  const out: Solid[] = [];
  for (const s of solids) {
    if (s.ramp || s.rot || b.x1 <= s.x0 || b.x0 >= s.x1 || b.y1 <= s.y0 || b.y0 >= s.y1 || b.z1 <= s.z0 || b.z0 >= s.z1) { out.push(s); continue; }
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
