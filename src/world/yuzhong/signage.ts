// The streets' signs (U-011, U-020, U-031, M3-14), in the lot's own frame. The crowded centres gone cyberpunk: LED
// screens on the street faces of towers, malls and offices, shop signs on the fronts below, LED tickers over the
// doors and red banners strung across. Shibati's old houses: the old kinds of shop sign, lanterns and cloth, and
// the banners. QR stickers by the doors of both. Each where it clears everything on the facade.
import type { Fabric, Lot } from '../city/buildings';
import type { Plan } from './lots';
import { MAT } from '../mats';
import { rand, randInt, type Rng } from '../../sim/rng';

/** Shop sign styles (render/props-lib.ts neonblade), the light box and the fascia board twice as often; the old
 *  quarter's, without neon tube or the arms of light boxes. */
const SIGN_STYLES = ['box', 'box', 'tube', 'banner', 'lantern', 'square', 'fascia', 'fascia'];
const OLD_STYLES = ['lantern', 'lantern', 'banner', 'box', 'fascia'];

export function signage(l: Lot, p: Plan, r: Rng, f: Fabric) {
  const old = p.district === 'shibati' && !!p.pitched;
  if (!p.cyber && !old) return;
  const faces = [
    { on: p.street[0], c: (l.x0 + l.x1) / 2, len: l.x1 - l.x0, yaw: Math.PI, at: (u: number, d: number) => [u, l.z0 - d] },
    { on: p.street[1], c: (l.x0 + l.x1) / 2, len: l.x1 - l.x0, yaw: 0, at: (u: number, d: number) => [u, l.z1 + d] },
    { on: p.street[2], c: (l.z0 + l.z1) / 2, len: l.z1 - l.z0, yaw: -Math.PI / 2, at: (u: number, d: number) => [l.x0 - d, u] },
    { on: p.street[3], c: (l.z0 + l.z1) / 2, len: l.z1 - l.z0, yaw: Math.PI / 2, at: (u: number, d: number) => [l.x1 + d, u] },
  ].filter(x => x.on && x.len > 6);
  const big = l.kind === 'tower' || l.mat === MAT.facadeBand;
  // Its shops share a look (U-031): one style of sign and one colour scheme, each building its own.
  const styles = old ? OLD_STYLES : SIGN_STYLES, style = styles[randInt(r, styles.length)], text = `${style}:${randInt(r, 10)}`;
  const taken: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }[] = [];
  for (const fc of faces) {
    /** The space a thing w wide takes (along the face, about u), from y to y + h, out from near the wall to d. */
    const space = (u: number, w: number, y: number, h: number, d: number, near: number) => {
      const [ax, az] = fc.at(u - w / 2, near), [bx, bz] = fc.at(u + w / 2, d);
      return { x0: Math.min(ax, bx), y0: y, z0: Math.min(az, bz), x1: Math.max(ax, bx), y1: y + h, z1: Math.max(az, bz) };
    };
    /** Room for it: nothing on the facade there (balconies, cages, AC units, awnings), nor another sign. */
    const room = (u: number, w: number, y: number, h: number, d: number, near = 0.15) => {
      const box = space(u, w, y, h, d, near), hit = (q: typeof box) => q.x0 < box.x1 && q.x1 > box.x0 && q.y0 < box.y1 && q.y1 > box.y0 && q.z0 < box.z1 && q.z1 > box.z0;
      if (f.solids.some(hit) || f.decor.some(hit) || taken.some(hit)) return false;
      taken.push(box);
      return true;
    };
    const put = (kind: string, u: number, y: number, extra: object, d = 0.05) => { const [x, z] = fc.at(u, d); f.props.push({ kind, x, y, z, yaw: fc.yaw, ...extra }); };
    if (!old && big && rand(r) < 0.8) {
      const w = Math.min(fc.len * 0.6, 8 + rand(r) * 12), h = 4 + rand(r) * 8, y = l.base + Math.min((l.podium ?? l.wall) - l.base - h - 1, 6 + rand(r) * 10);
      const u = fc.c + (rand(r) - 0.5) * (fc.len - w) * 0.5;
      if (y > l.base + 3) { taken.push(space(u, w, y, h, 0.4, 0.02)); put('ledscreen', u, y, { w, h }); }
    }
    // One or two shop signs, two or three down Shibati's shopping stairs.
    for (let i = 0, n = big ? 1 : (old ? 2 : 1) + randInt(r, 2); i < n; i++) for (let tries = 0; tries < 6; tries++) {
      const u = fc.c + (rand(r) - 0.5) * (fc.len - 2), flat = style === 'fascia', w = flat ? Math.min(fc.len - 1, 3 + rand(r) * 3) : 0.5;
      const y = flat ? l.base + 3.15 : l.base + 3.2 + rand(r) * 2.5, h = flat ? 0.9 : 2 + rand(r) * 2.5;
      if (!room(u, flat ? w : 0.4, y, h, flat ? 0.3 : 1.1)) continue;
      put('neonblade', u, y, { h, w, text });
      break;
    }
    // An LED ticker over a shop door, scrolling its hours and the curfew: on the shopfront's signboard, or on the
    // wall over a door's canopy.
    if (!old && !big && rand(r) < 0.45) for (let tries = 0; tries < 4; tries++) {
      const w = 2 + rand(r) * 2, u = fc.c + (rand(r) - 0.5) * (fc.len - w - 1), y = l.base + 3.35, b = space(u, w + 0.1, y, 0.5, 0.13, 0.02);
      const board = f.solids.some(q => q.x0 <= b.x0 && q.x1 >= b.x1 && q.z0 <= b.z0 && q.z1 >= b.z1 && q.y0 <= b.y0 && q.y1 >= b.y1);
      if (board ? room(u, w + 0.1, y, 0.5, 0.3) : room(u, w + 0.1, l.base + 2.75, 0.5, 0.2, 0.02)) { put('ledboard', u, board ? y : l.base + 2.75, { w }, board ? 0.19 : 0.05); break; }
    }
    // A red banner across the front, the machines' notices or a shop's.
    if (rand(r) < (old ? 0.3 : 0.2) && l.wall - l.base > 7) for (let tries = 0; tries < 4; tries++) {
      const w = 3 + rand(r) * 1.5, u = fc.c + (rand(r) - 0.5) * (fc.len - w - 1), y = l.base + 4.4 + rand(r) * 1.5;
      if (room(u, w + 0.2, y, 0.9, 0.12, 0.02)) { put('redbanner', u, y, { w, text: String(randInt(r, 64)) }); break; }
    }
    // QR stickers by the doors, at hand height: pay here, scan to register, a code the machines put up.
    for (let i = 0, n = randInt(r, 3); i < n; i++) {
      const u = fc.c + (rand(r) - 0.5) * (fc.len - 1), y = l.base + 1.2 + rand(r) * 0.5;
      if (room(u, 0.32, y, 0.4, 0.05, 0.02)) put('qr', u, y, { text: String(randInt(r, 32)) });
    }
  }
}
