// The underground city's buildings (M3-73, U-038): the rows along the cavern's two streets built like the city's
// above (buildLot: fronts, rooms, stairs, doors, windows, furnished insides), two floors each on the deck or under
// it, and dressed far heavier than anything on the surface: neon tube round their fronts and along the floor
// band, blade signs and light boxes crowding the upper floor, an LED screen on the wide ones, a gantry sign on
// the deck's roofs under the cavern's ceiling.
import { solid, type Solid } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand, randInt, type Rng } from '../../sim/rng';
import { buildLot, type Lot, type Fabric } from '../city/buildings';
import { WIN } from '../city/puzzle';

/** A building's footprint, floor and roof, and the side its street is on (Lot.street's order: z0, z1, x0, x1). */
export interface UnderLot { x0: number; z0: number; x1: number; z1: number; base: number; wall: number; face: 0 | 1 | 2 | 3 }

/** Neon colours: pink, cyan, violet, green, amber, red. */
const NEON = [0xff2f8f, 0x2fd8ff, 0xb44dff, 0x3dff8a, 0xffb02f, 0xff3b3b];
/** Sign styles (render/props-lib.ts neonblade): more tube and light box than anywhere above. */
const STYLES = ['tube', 'tube', 'tube', 'box', 'box', 'square', 'fascia'];
const LOOKS = [MAT.facade, MAT.facadeTile, MAT.facadeBand, MAT.facadeBand, MAT.facadeBrick];

/** Build the k-th underground building in its own frame (axis-aligned: the caller places it as it stands). */
export function underLot(s: UnderLot, k: number): { l: Lot; f: Fabric } {
  const r = makeRng(hashString(`underlot:${k}`)), street: Lot['street'] = [false, false, false, false];
  street[s.face] = true;
  // (Its roof kept bare: the deck or the ceiling is a couple of metres over it.)
  const l: Lot = { id: 90000 + k, x0: s.x0, z0: s.z0, x1: s.x1, z1: s.z1, base: s.base, wall: s.wall, top: s.wall, kind: 'res', mat: LOOKS[randInt(r, LOOKS.length)],
    street, across: [0, 0, 0, 0], bare: true, ground: () => s.base };
  const f: Fabric = { solids: [], decor: [], props: [], lots: [], inter: [], climbables: [], hides: [], features: [], sites: [], far: [] };
  buildLot(l, r, f);
  neon(l, s.face, r, f);
  return { l, f };
}

function neon(l: Lot, face: UnderLot['face'], r: Rng, f: Fabric) {
  const along = face < 2, a0 = along ? l.x0 : l.z0, a1 = along ? l.x1 : l.z1, len = a1 - a0, out = face % 2 ? 1 : -1, fc = [l.z0, l.z1, l.x0, l.x1][face];
  const yaw = [Math.PI, 0, -Math.PI / 2, Math.PI / 2][face], b = l.base, top = l.wall;
  const at = (u: number, d: number): [number, number] => (along ? [u, fc + out * d] : [fc + out * d, u]);
  /** A box on the front: along u0..u1, out d0..d1, y0..y1. */
  const on = (u0: number, u1: number, d0: number, d1: number, y0: number, y1: number, mat: number, tint?: number): Solid => {
    const [x0, z0] = at(u0, d0), [x1, z1] = at(u1, d1), s = solid(Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1), mat);
    if (tint !== undefined) s.tint = tint;
    return s;
  };
  const c1 = NEON[randInt(r, NEON.length)], c2 = NEON[randInt(r, NEON.length)];
  // Tube round the front: under the parapet's lip, down both corners, along the band between the floors.
  f.decor.push(on(a0 + 0.1, a1 - 0.1, 0.05, 0.12, top - 0.18, top - 0.1, MAT.neon, c1), on(a0 + 0.1, a1 - 0.1, 0.05, 0.12, b + 2.9, b + 2.98, MAT.neon, c2));
  for (const u of [a0 + 0.1, a1 - 0.18]) f.decor.push(on(u, u + 0.08, 0.05, 0.12, b + 0.4, top - 0.1, MAT.neon, c1));
  // Under the band, a lit strip over the shopfront.
  f.decor.push(on(a0 + 0.6, a1 - 0.6, 0.05, 0.4, b + 2.7, b + 2.76, MAT.lamp));
  // Most of the street's windows framed in tube, a colour of their own now and then.
  const [ox, oz] = along ? [0, out] : [out, 0];
  for (const w of f.features) {
    if (!w.kind.startsWith('win:') || (w.nx ?? 0) * ox + (w.nz ?? 0) * oz < 0.9 || rand(r) < 0.3) continue;
    const u = along ? w.x : w.z, c = rand(r) < 0.25 ? NEON[randInt(r, NEON.length)] : c2, y0 = w.y - 0.08, y1 = w.y + WIN.h + 0.08, h0 = u - WIN.w / 2 - 0.08, h1 = u + WIN.w / 2 + 0.08;
    f.decor.push(on(h0, h1, 0.06, 0.11, y0 - 0.05, y0, MAT.neon, c), on(h0, h1, 0.06, 0.11, y1, y1 + 0.05, MAT.neon, c), on(h0 - 0.05, h0, 0.06, 0.11, y0, y1, MAT.neon, c), on(h1, h1 + 0.05, 0.06, 0.11, y0, y1, MAT.neon, c));
  }
  // Signs crowding the upper floor, each clear of the front's fittings and the others.
  const taken: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }[] = [], style = STYLES[randInt(r, STYLES.length)], text = `${style}:${randInt(r, 10)}`;
  const clear = (q: (typeof taken)[number]) => !f.solids.concat(f.decor).some(o => o.mat !== MAT.neon && o.mat !== MAT.lamp && o.x0 < q.x1 && o.x1 > q.x0 && o.y0 < q.y1 && o.y1 > q.y0 && o.z0 < q.z1 && o.z1 > q.z0)
    && !taken.some(o => o.x0 < q.x1 && o.x1 > q.x0 && o.y0 < q.y1 && o.y1 > q.y0 && o.z0 < q.z1 && o.z1 > q.z0);
  const box = (u0: number, u1: number, d1: number, y0: number, y1: number) => { const [x0, z0] = at(u0, 0.16), [x1, z1] = at(u1, d1); return { x0: Math.min(x0, x1), y0, z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1, z1: Math.max(z0, z1) }; };
  // An LED screen across part of the upper floor of the wide ones, over the shopfront's board.
  if (len >= 10 && rand(r) < 0.7) for (let tries = 0; tries < 4; tries++) {
    const w = 3 + rand(r) * 2, h = 1.3 + rand(r) * 0.4, u = a0 + 1 + rand(r) * (len - w - 2), q = box(u, u + w, 0.4, b + 4.1, b + 4.1 + h);
    if (clear(q)) { const [x, z] = at(u + w / 2, 0.2); f.props.push({ kind: 'ledscreen', x, y: b + 4.1, z, yaw, w, h }); taken.push(q); break; }
  }
  // (From over the shopfront's awning, blades mounted across its board.)
  for (let i = 0, n = 3 + randInt(r, 4); i < n; i++) for (let tries = 0; tries < 10; tries++) {
    const flat = style === 'fascia' && i === 0, w = flat ? Math.min(len - 1, 2.5 + rand(r) * 2) : 0.5, h = flat ? 0.8 : 1.2 + rand(r) * 1.4, from = flat ? b + 4.1 : b + 3.15;
    const u = a0 + 0.6 + rand(r) * (len - 1.2), y = from + rand(r) * Math.max(0, top - from - 0.2 - h), q = box(u - (flat ? w / 2 : 0.25), u + (flat ? w / 2 : 0.25), flat ? 0.3 : 1.1, y, y + h);
    if (!clear(q)) continue;
    const [x, z] = at(u, 0.05);
    f.props.push({ kind: 'neonblade', x, y, z, yaw, h, w, text });
    taken.push(q);
    break;
  }
  // On a roof on the deck (the ceiling 2 m over it), a gantry sign facing the street.
  if (l.base > 95 && len >= 7) {
    const [x, z] = at((a0 + a1) / 2, -1.2);
    f.props.push({ kind: 'neonsign', x, y: top, z, yaw, w: Math.min(len - 2, 4 + rand(r) * 3), h: 0.8 });
  }
}
