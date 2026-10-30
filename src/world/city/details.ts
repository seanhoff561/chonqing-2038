// The lived-in, abandoned detail of the reference look (M3-22, U-009): balcony bands with solid parapets on
// some fronts, AC units, roof gardens gone wild, laundry left on the lines, and cables sagging across streets.
// Balconies are solid (their edges and parapets are holds); the rest is render-only decor.
import { solid } from '../geom';
import { MAT } from '../mats';
import { rand, randInt, makeRng, hashString, type Rng } from '../../sim/rng';
import { sides, footOf, BARE } from './climb';
import type { Lot, Fabric } from './buildings';

const FLOOR = 3;

type Side = ReturnType<typeof sides>[number];
const onFace = (s: Side, c0: number, c1: number, d0: number, d1: number, y0: number, y1: number, mat: number) =>
  s.nz !== 0 ? solid(c0, y0, s.f + s.nz * d0, c1, y1, s.f + s.nz * d1, mat) : solid(s.f + s.nx * d0, y0, c0, s.f + s.nx * d1, y1, c1, mat);

/** Detail for a solid residential block whose roof is at `roof` (the top of its highest part). */
export function details(l: Lot, r: Rng, out: Fabric, roof: number) {
  if (l.kind !== 'res') return;
  const all = sides(l), n = Math.round((l.wall - l.base) / FLOOR);
  // Balcony bands across one front from the third floor (the ones below were walled in), a parapet of render on
  // each, laundry on some.
  if (rand(r) < 0.35 && n >= 5) {
    const s = all.find(x => x.street) ?? all[randInt(r, 4)];
    const a = s.a + 1.5, b = s.b - 1.5;
    if (b - a > 3) for (let f = Math.max(3, Math.ceil((footOf(l, s) + BARE - l.base) / FLOOR)); f < n; f++) {
      const y = l.base + f * FLOOR;
      if (y > roof - 1) break;
      out.solids.push(onFace(s, a, b, 0, 1.0, y - 0.15, y, MAT.concrete), onFace(s, a, b, 0.88, 1.0, y, y + 1.0, MAT.plaster));
      if (rand(r) < 0.3) {
        const c = a + rand(r) * (b - a - 1);
        out.decor.push(onFace(s, c, c + 0.4 + rand(r) * 0.6, 1.02, 1.04, y + 0.2, y + 1.0, MAT.cloth));
      }
    }
  }
  // AC units hung on the walls.
  for (let i = 0, k = 2 + randInt(r, 5); i < k; i++) {
    const s = all[randInt(r, 4)], len = s.b - s.a;
    if (len < 4) continue;
    const c = s.a + 1.5 + rand(r) * (len - 3), y = l.base + (1 + randInt(r, Math.max(1, n - 1))) * FLOOR + 0.3;
    if (y + 0.5 > roof - 1) continue;
    out.decor.push(onFace(s, c - 0.4, c + 0.4, 0, 0.42, y, y + 0.5, MAT.metal));
  }
  // A roof gone wild: moss, shrubs, now and then a small tree.
  if (rand(r) < 0.28) {
    const { x0, z0, x1, z1 } = l;
    out.decor.push(solid(x0 + 0.3, roof, z0 + 0.3, x1 - 0.3, roof + 0.05, z1 - 0.3, MAT.moss));
    for (let i = 0, k = 3 + randInt(r, 5); i < k; i++) {
      const cx = x0 + 1 + rand(r) * (x1 - x0 - 2), cz = z0 + 1 + rand(r) * (z1 - z0 - 2), w = 0.4 + rand(r) * 0.8;
      out.decor.push(solid(cx - w, roof, cz - w, cx + w, roof + 0.4 + rand(r) * 1.1, cz + w, rand(r) < 0.35 ? MAT.leaves : MAT.moss));
    }
    if (rand(r) < 0.3) {
      const cx = (x0 + x1) / 2 + (rand(r) - 0.5) * 3, cz = (z0 + z1) / 2 + (rand(r) - 0.5) * 3;
      out.decor.push(solid(cx - 0.1, roof, cz - 0.1, cx + 0.1, roof + 2.2, cz + 0.1, MAT.wood));
      for (let i = 0; i < 6; i++) {
        const w = 0.5 + rand(r) * 0.6, x = cx + (rand(r) - 0.5) * 2, z = cz + (rand(r) - 0.5) * 2;
        out.decor.push(solid(x - w, roof + 1.8 + rand(r) * 0.8, z - w, x + w, roof + 2.6 + rand(r) * 0.8, z + w, rand(r) < 0.2 ? MAT.blossom : MAT.leaves));
      }
    }
  }
  dress(l, all, roof, out);
  // Cables sag across the street to the block opposite.
  for (const s of all) {
    if (!s.street || rand(r) > 0.3) continue;
    if (!s.across) continue;
    const c = s.a + 1 + rand(r) * (s.b - s.a - 2), y = l.base + 5 + rand(r) * 4, span = s.across, sag = 0.8 + rand(r) * 0.8;
    for (let i = 0; i < 4; i++) {
      const d0 = (i / 4) * span, d1 = ((i + 1) / 4) * span;
      const h = (d: number) => y - sag * Math.sin((d / span) * Math.PI);
      const lo = Math.min(h(d0), h(d1));
      out.decor.push(onFace(s, c - 0.015, c + 0.015, d0, d1, lo - 0.015, lo + 0.015, MAT.metal));
    }
  }
}

/** Render-only dressing, drawn from its own stream so the holds above never move: cable bundles and vines on
 *  the walls; aerials, dishes and pots near the roof edge. */
function dress(l: Lot, all: Side[], roof: number, out: Fabric) {
  const r = makeRng(hashString(`dress:${l.x0}:${l.z0}`));
  const onWall = (s: Side, c: number) => ({ x: s.nz !== 0 ? c : s.f, z: s.nz !== 0 ? s.f : c, yaw: Math.atan2(s.nx, s.nz) });
  for (const s of all) {
    if (s.b - s.a < 4) continue;
    if (rand(r) < 0.3) out.props.push({ kind: 'cablebundle', ...onWall(s, s.a + 1 + rand(r) * (s.b - s.a - 2)), y: l.base, h: Math.min(roof - l.base, 6 + rand(r) * 9) });
    if (rand(r) < 0.18) out.props.push({ kind: 'vine', ...onWall(s, s.a + 2 + rand(r) * (s.b - s.a - 4)), y: l.base, w: 2 + rand(r) * 3, h: Math.min(roof - l.base, 3 + rand(r) * 8) });
  }
  const edge = () => {
    const s = all[randInt(r, 4)], c = s.a + 1 + rand(r) * Math.max(0.1, s.b - s.a - 2), d = -(0.6 + rand(r) * 0.6);
    return { x: s.nz !== 0 ? c : s.f + s.nx * d, z: s.nz !== 0 ? s.f + s.nz * d : c };
  };
  for (const kind of ['antenna', 'dish', 'pot', 'pot']) if (rand(r) < (kind === 'pot' ? 0.4 : 0.3)) out.props.push({ kind, ...edge(), y: roof, yaw: rand(r) * Math.PI * 2 });
}
