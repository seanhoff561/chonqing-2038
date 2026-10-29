// Building fronts in 2038 (M3-55, U-022, U-024): what makes a painted block read as a building. Its street face
// gets a way in: a shopfront (glass, a shutter half down, an awning, a signboard) or a door with its frame and
// canopy; an enterable block's door hangs open with light behind it. Floor bands run across the walls; on the
// lower floors Chongqing's window cages and AC units sit at the windows the facade paints (whole bays from the
// corner, the style's sill height). Some old blocks wear a new skin: metal panels with ribbon windows over
// their upper floors; some carry their top floors cantilevered out over the street. Decor, from its own stream,
// except the overhang, which stands in the way.
import { solid, carve } from '../geom';
import { MAT } from '../mats';
import { rand, randInt, makeRng, hashString } from '../../sim/rng';
import { sides } from './climb';
import type { Lot, Fabric } from './buildings';

const FLOOR = 3;
/** Where the painted windows sit (render/facades.ts): sill height and nominal width by facade style. */
const WIN: Record<number, [number, number, number]> = {
  [MAT.facade]: [0.9, 1.4, 1.6], [MAT.facadeTile]: [1.1, 1.0, 1.1], [MAT.facadeBrick]: [1.0, 0.9, 1.15], [MAT.facadeOpen]: [0.75, 2.2, 1.9], [MAT.facadeBand]: [1.05, 2.4, 1.6],
};

type Side = ReturnType<typeof sides>[number];
const onFace = (s: Side, c0: number, c1: number, d0: number, d1: number, y0: number, y1: number, mat: number) =>
  s.nz !== 0 ? solid(Math.min(c0, c1), y0, s.f + s.nz * d0, Math.max(c0, c1), y1, s.f + s.nz * d1, mat) : solid(s.f + s.nx * d0, y0, Math.min(c0, c1), s.f + s.nx * d1, y1, Math.max(c0, c1), mat);

/** look: the block's facade material; open: it is hollow (enterable), its door at the route's start; stepped: its
 *  top floors are set back. */
export function fronts(l: Lot, look: number, open: boolean, stepped: boolean, out: Fabric) {
  if (l.kind !== 'res') return;
  const r = makeRng(hashString(`fronts:${l.x0}:${l.z0}`)), all = sides(l), n = Math.round((l.wall - l.base) / FLOOR), b0 = l.base;
  const front = all.find(s => s.street) ?? all[1];
  const [sill, ww, wh] = WIN[look] ?? WIN[MAT.facade];
  const shop = look === MAT.facadeBand || rand(r) < 0.45;
  for (const s of all) {
    const len = s.b - s.a;
    if (len < 3) continue;
    const nb = Math.max(1, Math.round(len / 3)), bw = len / nb, bay = (k: number) => s.a + (k + 0.5) * bw;
    // Floor bands across the wall of the lower floors (the facade paints the rest).
    if (s.street || s === front) for (let f = 1; f < Math.min(n, 7); f++) out.decor.push(onFace(s, s.a, s.b, 0, 0.1, b0 + f * FLOOR - 0.16, b0 + f * FLOOR, MAT.concrete));
    if (open || (!s.street && s !== front)) continue;
    // Window cages and AC units at the painted windows of the lower floors, on the faces seen from the street.
    let cages = 0, acs = 0;
    for (let f = 1; f < Math.min(n, 4); f++) for (let k = 0; k < nb; k++) {
      const c = bay(k), y = b0 + f * FLOOR + sill, q = rand(r);
      if (q < 0.25 && cages < 2) { cages++; cage(s, c, y, Math.min(ww, bw - 0.4), wh, out); }
      else if (q < 0.4 && acs < 2 && bw > ww + 1.2) { acs++; out.decor.push(onFace(s, c + ww / 2 + 0.15, c + ww / 2 + 0.95, 0, 0.42, y + 0.1, y + 0.62, MAT.metal)); }
    }
  }
  // The way in on the street face.
  const len = front.b - front.a, mid = (front.a + front.b) / 2;
  if (open) {
    // The real door is in the wall at the route's start: a frame, a canopy, the leaf hanging open, light inside.
    const door = l.route![0], at = all.reduce((a, s) => (Math.abs((s.nz !== 0 ? door.z : door.x) - s.f) < Math.abs((a.nz !== 0 ? door.z : door.x) - a.f) ? s : a));
    const c = at.nz !== 0 ? door.x : door.z;
    out.decor.push(onFace(at, c - 0.85, c - 0.7, 0, 0.12, b0, b0 + 2.35, MAT.concrete), onFace(at, c + 0.7, c + 0.85, 0, 0.12, b0, b0 + 2.35, MAT.concrete),
      onFace(at, c - 1.2, c + 1.2, 0, 1.0, b0 + 2.6, b0 + 2.75, MAT.concrete), onFace(at, c + 0.62, c + 0.68, 0.05, 1.15, b0, b0 + 2.1, MAT.tealMetal),
      onFace(at, c - 0.5, c + 0.5, -0.7, -0.6, b0 + 2.15, b0 + 2.25, MAT.lamp));
  } else if (shop && len > 4) {
    // A shopfront: glass between the end piers, a shutter half down here and there, an awning, a signboard.
    out.decor.push(onFace(front, front.a + 0.6, front.b - 0.6, 0, 0.05, b0 + 0.25, b0 + 2.9, MAT.glass));
    for (let k = 0, nb = Math.max(1, Math.round(len / 3)); k < nb; k++) {
      if (rand(r) > 0.5) continue;
      const c = front.a + (k + 0.5) * (len / nb), down = b0 + 0.15 + rand(r) * 2.4;
      out.decor.push(onFace(front, c - 1.2, c + 1.2, 0.06, 0.1, down, b0 + 2.9, MAT.metal));
    }
    // The awning is solid, and soft: a lip to pull up on, something to drop onto (U-024).
    out.solids.push(onFace(front, front.a + 0.3, front.b - 0.3, 0, 1.3, b0 + 3.0, b0 + 3.1, MAT.cloth));
    out.decor.push(onFace(front, front.a + 0.6, front.b - 0.6, 0, 0.14, b0 + 3.2, b0 + 4.0, rand(r) < 0.5 ? MAT.plaster : MAT.tealMetal));
  } else {
    const c = mid + (rand(r) - 0.5) * Math.max(0, len - 4);
    out.decor.push(onFace(front, c - 0.6, c + 0.6, 0, 0.06, b0, b0 + 2.2, MAT.tealMetal),
      onFace(front, c - 0.8, c - 0.6, 0, 0.12, b0, b0 + 2.4, MAT.concrete), onFace(front, c + 0.6, c + 0.8, 0, 0.12, b0, b0 + 2.4, MAT.concrete),
      onFace(front, c - 1.1, c + 1.1, 0, 0.9, b0 + 2.5, b0 + 2.65, MAT.concrete));
  }
  // 2038 (U-024): a new metal skin with ribbon windows over the upper floors of an old block.
  if (!open && !stepped && n >= 5 && rand(r) < 0.3) {
    const from = Math.max(2, Math.floor(n / 2) - randInt(r, 2)), panel = rand(r) < 0.5 ? MAT.tealMetal : MAT.metal;
    for (const s of all) {
      if (!s.street && s !== front) continue;
      for (let f = from; f < n; f++) {
        const y = b0 + f * FLOOR;
        out.decor.push(onFace(s, s.a - 0.05, s.b + 0.05, 0, 0.18, y, y + 0.9, panel), onFace(s, s.a - 0.05, s.b + 0.05, 0.02, 0.12, y + 0.9, y + 2.3, MAT.glass),
          onFace(s, s.a - 0.05, s.b + 0.05, 0, 0.18, y + 2.3, y + FLOOR, panel));
      }
    }
  }
  // Old Chongqing builds out over the street: the top two floors cantilevered a metre and a half.
  if (!open && !stepped && n >= 5 && rand(r) < 0.18 && len > 5) {
    const top = l.wall, low = top - 2 * FLOOR;
    out.solids.push(onFace(front, front.a, front.b, 0, 1.5, low, top, look));
    out.decor.push(onFace(front, front.a, front.b, 1.5, 1.65, top, top + 0.6, MAT.concrete));
  }
}

/** A window cage (防盗窗): a frame of bars standing out from the wall round a window opening. */
function cage(s: Side, c: number, y: number, w: number, h: number, out: Fabric) {
  const x0 = c - w / 2 - 0.05, x1 = c + w / 2 + 0.05, top = y + h + 0.05, D = 0.42;
  out.decor.push(onFace(s, x0, x1, 0, D, y - 0.06, y, MAT.metal), onFace(s, x0, x1, 0, D, top, top + 0.05, MAT.metal));
  for (const t of [0, 1 / 3, 2 / 3, 1]) { const x = x0 + (x1 - x0) * t; out.decor.push(onFace(s, x - 0.015, x + 0.015, D - 0.03, D, y, top, MAT.metal)); }
}

/** Shibati's looted shop houses (M3-55): behind the shopfront (yuzhong/shopfront.ts, whose middle bay's shutter is
 *  rolled up over the door) the ground floor stands open, a lamp still lit; the floors above stay shut. */
export function shopHouse(l: Lot, side: number, look: number, out: Fabric) {
  const { x0, z0, x1, z1, base, wall } = l, H = 3.2, T = 0.25;
  const alongX = side < 2, u0 = alongX ? x0 : z0, u1 = alongX ? x1 : z1, f = [z0, z1, x0, x1][side], n = side % 2 ? 1 : -1;
  const bays = Math.max(2, Math.round((u1 - u0) / 2.2)), bay = (u1 - u0) / bays, d0 = u0 + (bays >> 1) * bay + 0.09, d1 = d0 + bay - 0.18, dm = (d0 + d1) / 2;
  const walls = [solid(x0, base, z0, x1, base + H, z0 + T, look), solid(x0, base, z1 - T, x1, base + H, z1, look), solid(x0, base, z0 + T, x0 + T, base + H, z1 - T, look), solid(x1 - T, base, z0 + T, x1, base + H, z1 - T, look)];
  const door = alongX ? solid(d0, base - 1, f - 1, d1, base + 2.3, f + 1, 0) : solid(f - 1, base - 1, d0, f + 1, base + 2.3, d1, 0);
  out.solids.push(...walls.filter((_, i) => i !== side), ...carve([walls[side]], door), solid(x0, base + H, z0, x1, wall, z1, look), solid(x0 + T, base - 0.2, z0 + T, x1 - T, base + 0.03, z1 - T, MAT.wood));
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  out.decor.push(solid(cx - 0.3, base + H - 0.1, cz - 0.3, cx + 0.3, base + H, cz + 0.3, MAT.lamp));
  const at = (d: number) => (alongX ? { x: dm, z: f + n * d } : { x: f + n * d, z: dm });
  l.route = [{ ...at(0.8), y: base }, { ...at(-1.2), y: base }, { x: cx, y: base, z: cz }];
}

/** A tower's way in (M3-55): a two-storey glass lobby under a deep canopy with a lit soffit and the building's
 *  lit name over it; a podium's street face is shop windows under signboards to either side. */
export function lobby(l: Lot, r: () => number, out: Fabric) {
  const all = sides(l), s = all.find(q => q.street) ?? all[1], len = s.b - s.a, b0 = l.base;
  if (len < 8) return;
  const w = Math.min(12, len * 0.4), c = s.a + len / 2 + (r() - 0.5) * (len - w - 2) * 0.5, H = 6;
  out.decor.push(onFace(s, c - w / 2, c + w / 2, 0, 0.06, b0, b0 + H, MAT.glass), onFace(s, c - w / 2 - 0.4, c + w / 2 + 0.4, 0, 3.2, b0 + H, b0 + H + 0.35, MAT.metal),
    onFace(s, c - w / 2, c + w / 2, 0.3, 3.0, b0 + H - 0.04, b0 + H, MAT.lamp), onFace(s, c - w * 0.35, c + w * 0.35, 0, 0.12, b0 + H + 0.6, b0 + H + 1.4, MAT.lamp));
  for (let x = c - w / 2; x <= c + w / 2 + 0.01; x += w / Math.round(w / 1.6)) out.decor.push(onFace(s, x - 0.05, x + 0.05, 0, 0.12, b0, b0 + H, MAT.metal));
  out.decor.push(onFace(s, c - w / 2, c + w / 2, 0, 0.12, b0 + 3, b0 + 3.12, MAT.metal));
  if (!l.podium) return;
  for (const [a, b] of [[s.a + 0.5, c - w / 2 - 1], [c + w / 2 + 1, s.b - 0.5]]) {
    if (b - a < 3) continue;
    out.decor.push(onFace(s, a, b, 0, 0.05, b0 + 0.3, b0 + 3.8, MAT.glass), onFace(s, a, b, 0, 0.3, b0 + 4, b0 + 5, r() < 0.5 ? MAT.tealMetal : MAT.plaster), onFace(s, a + 0.3, b - 0.3, 0.3, 0.34, b0 + 4.2, b0 + 4.8, MAT.lamp));
  }
}
