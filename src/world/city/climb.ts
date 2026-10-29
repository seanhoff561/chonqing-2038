// Climbing and hiding in the city fabric (M3-05, U-002, U-005). Facades get drain pipes, fire-escape ladders,
// columns of sills and AC units (1.4-1.9 m apart, now and then a 2.3-2.6 m gap that needs a push-off) or
// balconies; glass towers and the rest stay smooth. Alleys inside a block get hide crates and dumpsters,
// scaffold bars to swing and lache along, or a fence with a crawl hole under it.
import { solid, carve } from '../geom';
import { MAT } from '../mats';
import { rand, randInt, makeRng, hashString, type Rng } from '../../sim/rng';
import type { Lot, Fabric } from './buildings';

const FLOOR = 3;

interface Side { a: number; b: number; f: number; nx: number; nz: number; street: boolean; across: number }

/** The four facades: along a..b, face at f, outward normal, whether a street lies beyond and how far across it
 *  the next building stands (0 for none). */
export function sides(l: Lot): Side[] {
  return [
    { a: l.x0, b: l.x1, f: l.z0, nx: 0, nz: -1, street: l.street[0], across: l.across[0] },
    { a: l.x0, b: l.x1, f: l.z1, nx: 0, nz: 1, street: l.street[1], across: l.across[1] },
    { a: l.z0, b: l.z1, f: l.x0, nx: -1, nz: 0, street: l.street[2], across: l.across[2] },
    { a: l.z0, b: l.z1, f: l.x1, nx: 1, nz: 0, street: l.street[3], across: l.across[3] },
  ];
}

/** A box on a facade: c0..c1 along it, d0..d1 out from the face. */
const onFace = (s: Side, c0: number, c1: number, d0: number, d1: number, y0: number, y1: number, mat: number) =>
  s.nz !== 0 ? solid(c0, y0, s.f + s.nz * d0, c1, y1, s.f + s.nz * d1, mat) : solid(s.f + s.nx * d0, y0, c0, s.f + s.nx * d1, y1, c1, mat);
const faceXZ = (s: Side, c: number, d: number) => (s.nz !== 0 ? { x: c, z: s.f + s.nz * d } : { x: s.f + s.nx * d, z: c });

export function facades(l: Lot, r: Rng, out: Fabric) {
  if (l.kind === 'tower') return;
  // The roof edge he pulls over: a parapet, or the eave plate of a tiled roof.
  const top = l.kind === 'trad' ? l.wall : l.top;
  const door = l.route?.[0];
  let ladder = false;
  for (const s of sides(l)) {
    if (s.b - s.a < 3) continue;
    const low = rand(r) < 0.5, x = rand(r), sign = rand(r) < 0.3;
    // Corners are solid piers on every building, clear of windows.
    const c = low ? s.a + 0.8 : s.b - 0.8;
    const at = faceXZ(s, c, 0);
    if (door && Math.hypot(door.x - at.x, door.z - at.z) < 2.5) continue;
    if (x < 0.3) {
      const p = faceXZ(s, low ? s.a + 0.3 : s.b - 0.3, 0.06);
      out.climbables.push({ kind: 'pipe', x: p.x, z: p.z, y0: l.base, y1: top, nx: s.nx, nz: s.nz });
      out.features.push({ kind: 'pipe', x: p.x, y: l.base, z: p.z, group: out.features.length });
    } else if (x < 0.42 && l.kind === 'res' && !ladder) {
      // Fire escape: the drop section is pulled up, so it takes a jump to reach.
      ladder = true;
      const p = faceXZ(s, low ? s.a + 1.4 : s.b - 1.4, 0.06);
      out.climbables.push({ kind: 'ladder', x: p.x, z: p.z, y0: l.base + 2.3, y1: top, nx: s.nx, nz: s.nz });
      out.features.push({ kind: 'ladder', x: p.x, y: l.base + 2.3, z: p.z, group: out.features.length });
    } else if (x < 0.8) {
      const group = out.features.length;
      let y = l.base + 1.5 + rand(r) * 0.3;
      while (top - y > 1.2) {
        const ac = rand(r) < (l.kind === 'trad' ? 0.3 : 0.45);
        out.solids.push(ac
          ? onFace(s, c - 0.375, c + 0.375, 0, 0.4, y - 0.5, y, MAT.metal)
          : onFace(s, c - 0.5, c + 0.5, 0, 0.14, y - 0.1, y, l.kind === 'trad' ? MAT.wood : MAT.concrete));
        out.features.push({ kind: ac ? 'ac' : 'sill', ...faceXZ(s, c, 0), y, group });
        y += rand(r) < 0.15 ? 2.3 + rand(r) * 0.3 : 1.4 + rand(r) * 0.5;
      }
    } else if (x < 0.9 && l.kind === 'res' && !l.route && s.street) {
      // Balconies on a street front: the slab edge and the rail top are holds 1 and 2 m apart.
      const m = (s.a + s.b) / 2, n = Math.round((l.wall - l.base) / FLOOR);
      for (let f = 1; f < n; f++) {
        const y = l.base + f * FLOOR;
        out.solids.push(
          onFace(s, m - 1.2, m + 1.2, 0, 1.1, y - 0.15, y, MAT.concrete),
          onFace(s, m - 1.2, m + 1.2, 0.9, 0.95, y, y + 1.0, MAT.metal),
          onFace(s, m - 1.2, m - 1.15, 0, 0.9, y, y + 1.0, MAT.metal), onFace(s, m + 1.15, m + 1.2, 0, 0.9, y, y + 1.0, MAT.metal),
        );
        out.features.push({ kind: 'balcony', ...faceXZ(s, m, 1.1), y, group: out.features.length });
      }
      continue;
    }
    // A shop sign's frame over the street: a bar 0.6 m out from the wall to swing from.
    const m = (s.a + s.b) / 2, mid = faceXZ(s, m, 0);
    if (sign && s.street && l.kind !== 'trad' && !(door && Math.hypot(door.x - mid.x, door.z - mid.z) < 2)) {
      const y = l.base + 3.6 + rand(r) * 0.6;
      out.solids.push(onFace(s, m - 1.25, m + 1.25, 0.57, 0.63, y - 0.06, y, MAT.metal));
      out.decor.push(onFace(s, m - 1.25, m - 1.2, 0, 0.6, y - 0.05, y, MAT.metal), onFace(s, m + 1.2, m + 1.25, 0, 0.6, y - 0.05, y, MAT.metal),
        onFace(s, m - 1.2, m + 1.2, 0.55, 0.6, y + 0.1, y + 1.0, MAT.wood));
      out.features.push({ kind: 'sign', ...faceXZ(s, m, 0.6), y, group: out.features.length });
    }
  }
}

/** The alley between neighbouring buildings in one frame, on the lower one's floor. */
export function alleys(lots: Lot[], r: Rng, out: Fabric) {
  for (let i = 0; i < lots.length; i++) for (let j = i + 1; j < lots.length; j++) {
    const a = lots[i], b = lots[j];
    const gx = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1), gz = Math.max(a.z0, b.z0) - Math.min(a.z1, b.z1);
    if (gx > 0 === gz > 0) continue;
    // w runs across the alley, l along it.
    const alongZ = gx > 0;
    const w0 = alongZ ? Math.min(a.x1, b.x1) : Math.min(a.z1, b.z1), w1 = w0 + (alongZ ? gx : gz);
    const l0 = alongZ ? Math.max(a.z0, b.z0) : Math.max(a.x0, b.x0), l1 = alongZ ? Math.min(a.z1, b.z1) : Math.min(a.x1, b.x1);
    if (l1 - l0 < 5) continue;
    const y = Math.min(a.base, b.base);
    const B = (p0: number, q0: number, p1: number, q1: number, y0: number, y1: number, mat: number) =>
      alongZ ? solid(p0, y0, q0, p1, y1, q1, mat) : solid(q0, y0, p0, q1, y1, p1, mat);
    const at = (p: number, q: number) => (alongZ ? { x: p, z: q } : { x: q, z: p });
    const x = rand(r);
    if (x < 0.45) {
      // Hide spots against one wall: a crate (0.8 m inside) or a dumpster.
      const k = 1 + randInt(r, 2);
      for (let h = 0; h < k; h++) {
        const q = l0 + 1 + h * 2.6 + rand(r) * 0.5;
        if (q + 1.7 > l1) break;
        const dump = rand(r) < 0.5 && w1 - w0 >= 1.9;
        const [d, len, ht] = dump ? [0.95, 1.6, 1.1] : [0.9, 0.9, 0.9];
        out.solids.push(B(w0, q, w0 + d, q + len, y, y + ht, dump ? MAT.metal : MAT.crate));
        const inner = B(w0 + 0.05, q + 0.05, w0 + d - 0.05, q + len - 0.05, y, y + ht - 0.1, 0);
        out.hides.push({ id: out.hides.length, inner: { x0: inner.x0, y0: inner.y0, z0: inner.z0, x1: inner.x1, y1: inner.y1, z1: inner.z1 }, kind: dump ? 'dumpster' : 'crate' });
        out.features.push({ kind: dump ? 'dumpster' : 'crate', ...at(w0 + d / 2, q + len / 2), y, group: out.features.length });
      }
    } else if (x < 0.7) {
      // Scaffold bars across the alley, 2.4 m apart along it: swing on one, lache to the next.
      const k = 2 + randInt(r, 2), hy = y + 3.0 + rand(r) * 0.8;
      const q0 = l0 + 1.5 + rand(r) * Math.max(0, l1 - l0 - 3 - (k - 1) * 2.4);
      for (let h = 0; h < k && q0 + h * 2.4 < l1 - 1; h++) {
        const q = q0 + h * 2.4;
        out.solids.push(B(w0, q - 0.03, w1, q + 0.03, hy - 0.05, hy, MAT.metal));
        out.features.push({ kind: 'bar', ...at((w0 + w1) / 2, q), y: hy, group: out.features.length });
      }
    } else if (x < 0.85) {
      // A fence across the alley: climb its 2.4 m top or crawl through the gap under it.
      const q = (l0 + l1) / 2, wm = (w0 + w1) / 2;
      out.solids.push(...carve([B(w0, q - 0.05, w1, q + 0.05, y, y + 2.4, MAT.metal)], B(wm - 0.4, q - 1, wm + 0.4, q + 1, y - 1, y + 0.65, 0)));
      out.features.push({ kind: 'fence', ...at(wm, q), y, group: out.features.length });
    }
    // Render-only litter from its own stream: bags and boxes along the walls, weeds, a bike, laundry overhead.
    const d = makeRng(hashString(`alley:${a.x0}:${a.z0}:${b.x0}:${b.z0}`)), along = alongZ ? 0 : Math.PI / 2;
    const wall = (kind: string) => { const side = rand(d) < 0.5; out.props.push({ kind, ...at(side ? w0 + 0.45 : w1 - 0.45, l0 + 0.8 + rand(d) * (l1 - l0 - 1.6)), y, yaw: rand(d) * Math.PI * 2 }); };
    for (let i = 0, n = 1 + randInt(d, 3); i < n; i++) wall('trash');
    for (let i = 0, n = 1 + randInt(d, 3); i < n; i++) wall('weeds');
    if (rand(d) < 0.4) wall('boxes');
    if (rand(d) < 0.25) wall('bike');
    if (rand(d) < 0.3) out.props.push({ kind: 'laundry', ...at((w0 + w1) / 2, l0 + 1 + rand(d) * (l1 - l0 - 2)), y: y + 2.4 + rand(d) * 3, yaw: along, w: w1 - w0 });
  }
}
