// Shibati's shop houses (M3-41c, after M3-06): the traditional houses along the real Eighteen Stairs open their
// ground floors to the street: timber posts and a beam, shutters between the posts, lattice windows upstairs,
// a hanging sign or lantern now and then. Decor on the lot's street faces, in its own frame.
import { solid } from '../geom';
import { MAT } from '../mats';
import { rand, type Rng } from '../../sim/rng';
import type { Lot, Fabric } from '../city/buildings';

const SHOP = 3.2;

export function shopfronts(l: Lot, r: Rng, out: Fabric) {
  const { x0, z0, x1, z1, base } = l;
  const faces = [
    { on: l.street[0], u0: x0, u1: x1, f: z0, n: -1, alongX: true },
    { on: l.street[1], u0: x0, u1: x1, f: z1, n: 1, alongX: true },
    { on: l.street[2], u0: z0, u1: z1, f: x0, n: -1, alongX: false },
    { on: l.street[3], u0: z0, u1: z1, f: x1, n: 1, alongX: false },
  ];
  for (const fc of faces) {
    if (!fc.on || fc.u1 - fc.u0 < 2.5) continue;
    /** A box on this face: u along it, d out from it, y up. */
    const B = (ua: number, ub: number, y0: number, y1: number, da: number, db: number, mat: number) => {
      const p = fc.f + fc.n * da, q = fc.f + fc.n * db, lo = Math.min(p, q), hi = Math.max(p, q);
      return fc.alongX ? solid(ua, y0, lo, ub, y1, hi, mat) : solid(lo, y0, ua, hi, y1, ub, mat);
    };
    const bays = Math.max(2, Math.round((fc.u1 - fc.u0) / 2.2)), bay = (fc.u1 - fc.u0) / bays;
    for (let i = 0; i <= bays; i++) { const u = fc.u0 + i * bay; out.decor.push(B(Math.max(fc.u0, u - 0.09), Math.min(fc.u1, u + 0.09), base, base + SHOP, -0.02, 0.14, MAT.wood)); }
    out.decor.push(B(fc.u0, fc.u1, base + SHOP - 0.25, base + SHOP, -0.02, 0.16, MAT.wood));
    for (let i = 0; i < bays; i++) {
      const ua = fc.u0 + i * bay + 0.1, ub = ua + bay - 0.2, q = rand(r);
      // Shutters down, or half up over an open, looted shop.
      out.decor.push(B(ua, ub, q < 0.7 ? base + 0.1 : base + 2.1, base + SHOP - 0.35, -0.02, 0.05, MAT.wood));
      if (l.wall - base > SHOP + 1.5 && i % 2 === 0) out.decor.push(B(ua + bay * 0.2, ub - bay * 0.2, base + SHOP + 0.8, base + SHOP + 2, -0.02, 0.06, MAT.wood));
      if (rand(r) < 0.25) out.props.push(rand(r) < 0.5
        ? { kind: 'neonblade', x: fc.alongX ? (ua + ub) / 2 : fc.f + fc.n * 0.05, y: base + SHOP + 0.4, z: fc.alongX ? fc.f + fc.n * 0.05 : (ua + ub) / 2, yaw: fc.alongX ? (fc.n > 0 ? 0 : Math.PI) : (fc.n > 0 ? Math.PI / 2 : -Math.PI / 2), h: 1.6 }
        : { kind: 'stall', x: fc.alongX ? (ua + ub) / 2 : fc.f + fc.n * 0.8, y: base, z: fc.alongX ? fc.f + fc.n * 0.8 : (ua + ub) / 2, yaw: fc.alongX ? 0 : Math.PI / 2 });
    }
  }
}
