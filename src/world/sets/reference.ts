// The reference hillside (M3-23, U-010): docs/reference/look-01.jpg rebuilt building by building. Each block is
// placed by solving where its edges and roof sit in the photo for a chosen distance from the photo's camera,
// which stands on the vantage roof. It plays like the city: brick low-rises with rooftop routes, climbable
// facades, enterable blocks, terraces stepping up the hill with stairs, and a stair down from the vantage roof.
import { solid, rampSolid, type Solid } from '../geom';
import { MAT } from '../mats';
import { makeWorld, type World } from '../world';
import { hollow } from '../city/interiors';
import { facades } from '../city/climb';
import { stair } from '../steps';
import { makeRng, rand, randInt } from '../../sim/rng';
import { PARAPET, type Fabric, type Lot } from '../city/buildings';

/** The photo's camera: level, at the vantage eye, looking north (-z), 30 degrees of view across 1304 rows. */
export const REF_CAMERA = { x: 0, y: 34.62, z: -4.6, fov: 30, w: 1080, h: 1304 };
const T = Math.tan(((REF_CAMERA.fov / 2) * Math.PI) / 180);
/** Metres per photo pixel at distance d in front of the camera. */
const mpp = (d: number) => (d * T) / (REF_CAMERA.h / 2);
const X = (px: number, d: number) => REF_CAMERA.x + (px - REF_CAMERA.w / 2) * mpp(d);
const Y = (row: number, d: number) => REF_CAMERA.y + (REF_CAMERA.h / 2 - row) * mpp(d);
const Z = (d: number) => REF_CAMERA.z - d;

/** Ground levels: the street, the mid terrace and the back terrace, with retaining walls between. */
const TERRACE = { mid: { z: -150, y: 9 }, back: { z: -205, y: 18 } };

type Roof = 'curb' | 'parapet' | 'garden' | 'pavilion' | 'teal' | 'shed' | 'none';
interface Spec {
  id: string; d: number; px: [number, number]; row: number; depth: number; mat: number; roof: Roof;
  /** enterable (hollow with a stair core); walls then show their real openings */
  enter?: boolean;
  /** balcony slabs every floor across the front, or only over this pixel span */
  balconies?: true | [number, number];
}

// Distances are guesses that keep the photo's overlaps; pixel spans and roof rows are read off the photo.
const SPECS: Spec[] = [
  // Foreground: old brick low-rises on the street level.
  { id: 'F10', d: 100, px: [-80, 80], row: 1090, depth: 8, mat: MAT.brick, roof: 'curb' },
  { id: 'F1', d: 115, px: [40, 262], row: 945, depth: 11, mat: MAT.facadeBrick, roof: 'pavilion' },
  { id: 'F2', d: 118, px: [168, 340], row: 855, depth: 10, mat: MAT.brick, roof: 'garden', enter: true },
  { id: 'F3', d: 122, px: [376, 466], row: 880, depth: 9, mat: MAT.facadeBrick, roof: 'curb' },
  { id: 'F4', d: 120, px: [496, 708], row: 935, depth: 12, mat: MAT.facadeBrick, roof: 'teal' },
  { id: 'F5', d: 105, px: [190, 470], row: 1060, depth: 8, mat: MAT.facadeBrick, roof: 'curb' },
  { id: 'F6', d: 99, px: [330, 590], row: 1180, depth: 6, mat: MAT.facadeBrick, roof: 'garden' },
  { id: 'F7', d: 108, px: [610, 800], row: 1115, depth: 9, mat: MAT.brick, roof: 'garden', enter: true },
  { id: 'F8', d: 113, px: [812, 930], row: 1000, depth: 10, mat: MAT.facadeOpen, roof: 'curb' },
  { id: 'F9', d: 118, px: [945, 1130], row: 990, depth: 12, mat: MAT.facade, roof: 'parapet' },
  { id: 'R1', d: 140, px: [236, 640], row: 800, depth: 8, mat: MAT.facadeOpen, roof: 'garden' },
  // Middle: walk-ups and the weathered slab on the mid terrace.
  { id: 'M5', d: 152, px: [-60, 228], row: 245, depth: 14, mat: MAT.facade, roof: 'parapet' },
  { id: 'M3', d: 176, px: [232, 300], row: 280, depth: 10, mat: MAT.facadeOpen, roof: 'parapet' },
  { id: 'M2', d: 172, px: [300, 392], row: 270, depth: 7, mat: MAT.facade, roof: 'parapet', balconies: true },
  { id: 'M1a', d: 170, px: [392, 560], row: 108, depth: 14, mat: MAT.facade, roof: 'parapet' },
  { id: 'M1b', d: 170, px: [560, 690], row: 125, depth: 14, mat: MAT.facade, roof: 'parapet', balconies: [620, 690] },
  { id: 'M1c', d: 164, px: [460, 640], row: 640, depth: 6, mat: MAT.facadeOpen, roof: 'garden', balconies: true },
  { id: 'M4', d: 156, px: [632, 1130], row: 545, depth: 16, mat: MAT.facadeOpen, roof: 'shed' },
  // Back: the high slabs on the top terrace.
  { id: 'B5', d: 210, px: [960, 1110], row: 320, depth: 10, mat: MAT.facadeBand, roof: 'parapet' },
  { id: 'B4', d: 240, px: [655, 1110], row: -150, depth: 18, mat: MAT.facadeTile, roof: 'parapet' },
  { id: 'B3', d: 270, px: [432, 660], row: -40, depth: 18, mat: MAT.facade, roof: 'parapet' },
  { id: 'B1', d: 250, px: [45, 392], row: -60, depth: 16, mat: MAT.facadeBand, roof: 'parapet' },
  { id: 'B2', d: 265, px: [-80, 42], row: -120, depth: 20, mat: MAT.glass, roof: 'none' },
];

const groundAt = (z: number) => (z < TERRACE.back.z ? TERRACE.back.y : z < TERRACE.mid.z ? TERRACE.mid.y : 0);
const FLOOR = 3;

export interface RefBlock { id: string; x0: number; x1: number; z0: number; z1: number; base: number; roof: number; lot?: Lot }

export function referenceParts() {
  const out: Fabric = { solids: [], decor: [], props: [], lots: [], inter: [], climbables: [], hides: [], features: [], sites: [], far: [] };
  const blocks: RefBlock[] = [];
  const r = makeRng(2038);
  for (const s of SPECS) {
    const x0 = X(s.px[0], s.d), x1 = X(s.px[1], s.d), z1 = Z(s.d), z0 = z1 - s.depth;
    const base = groundAt(z1 - 0.5);
    const lip = s.roof === 'parapet' ? PARAPET : s.roof === 'curb' || s.roof === 'garden' ? 0.3 : 0;
    // Enterable blocks need whole floors; the rest keep the photo's roof line exactly.
    let wall = Y(s.row, s.d) - lip;
    if (s.enter) wall = base + Math.max(2, Math.round((wall - base) / FLOOR)) * FLOOR;
    const lot: Lot = { id: 1000 + blocks.length, x0, z0, x1, z1, base, wall, top: wall + lip, kind: 'res', mat: s.mat, street: [true, true, false, false], across: [0, 0, 0, 0] };
    if (s.enter) hollow(lot, r, out);
    else out.solids.push(solid(x0, base, z0, x1, wall, z1, s.mat));
    roof(s, lot, out);
    if (s.balconies) balconies(s, lot, out);
    if (s.d < 160 && s.mat !== MAT.glass) facades(lot, r, out);
    blocks.push({ id: s.id, x0, x1, z0, z1, base, roof: wall + (s.roof === 'curb' || s.roof === 'garden' ? 0 : lip), lot });
  }
  // The vantage block: an enterable walk-up whose stair core sits at the back, so the roof looks out clear.
  const vantage = vantageBlock(r, out);
  blocks.push(vantage);
  trees(out);
  terrain(out);
  filler(r, out);
  nearFiller(r, out);
  return { ...out, blocks };
}

function roof(s: Spec, l: Lot, out: Fabric) {
  const { x0, z0, x1, z1, wall } = l;
  const rim = (h: number, w: number, mat: number) => out.solids.push(
    solid(x0, wall, z0, x1, wall + h, z0 + w, mat), solid(x0, wall, z1 - w, x1, wall + h, z1, mat),
    solid(x0, wall, z0 + w, x0 + w, wall + h, z1 - w, mat), solid(x1 - w, wall, z0 + w, x1, wall + h, z1 - w, mat));
  if (s.roof === 'parapet') rim(PARAPET, 0.2, MAT.concrete);
  if (s.roof === 'curb' || s.roof === 'garden' || s.roof === 'pavilion') rim(0.3, 0.2, s.mat === MAT.brick ? MAT.brick : MAT.concrete);
  if (s.roof === 'garden' || s.roof === 'pavilion') {
    // Roofs gone wild: a moss mat and clumps of shrubs.
    out.decor.push(solid(x0 + 0.2, wall, z0 + 0.2, x1 - 0.2, wall + 0.06, z1 - 0.2, MAT.moss));
    const r = makeRng(Math.round(x0 * 31 + z0));
    for (let i = 0; i < 4 + randInt(r, 5); i++) {
      const cx = x0 + 0.8 + rand(r) * (x1 - x0 - 1.6), cz = z0 + 0.8 + rand(r) * (z1 - z0 - 1.6), w = 0.4 + rand(r) * 0.9;
      out.decor.push(solid(cx - w, wall, cz - w, cx + w, wall + 0.3 + rand(r) * 0.9, cz + w, rand(r) < 0.3 ? MAT.leaves : MAT.moss));
    }
  }
  if (s.roof === 'pavilion') {
    // An open shelter on the roof: four posts and a thin slab.
    const h = wall + 2.6, px = [x0 + 0.4, x1 - 0.6], pz = [z0 + 0.6, z1 - 0.8];
    for (const x of px) for (const z of pz) out.solids.push(solid(x, wall, z, x + 0.2, h, z + 0.2, MAT.concrete));
    out.solids.push(solid(x0 + 0.2, h, z0 + 0.4, x1 - 0.2, h + 0.15, z1 - 0.4, MAT.concrete));
  }
  if (s.roof === 'teal') {
    // A shallow arched sheet roof, ridge along the front, eaves overhanging.
    const zm = (z0 + z1) / 2;
    out.solids.push(rampSolid(x0 - 0.4, wall, z0 - 0.4, x1 + 0.4, zm, wall, wall + 1.3, 3, MAT.tealMetal), rampSolid(x0 - 0.4, wall, zm, x1 + 0.4, z1 + 0.4, wall, wall + 1.3, 4, MAT.tealMetal));
  }
  if (s.roof === 'shed') out.solids.push(solid(X(660, s.d), wall, z1 - 6, X(760, s.d), wall + 2.4, z1 - 1.5, MAT.concrete));
}

/** Balcony slabs with low solid parapets at every floor across the front (or a span of it). */
function balconies(s: Spec, l: Lot, out: Fabric) {
  const a = s.balconies === true ? l.x0 : X(s.balconies![0], s.d), b = s.balconies === true ? l.x1 : X(s.balconies![1], s.d);
  for (let y = l.base + FLOOR; y < l.wall - 1; y += FLOOR) {
    out.solids.push(solid(a, y - 0.15, l.z1, b, y, l.z1 + 1.1, MAT.concrete), solid(a, y, l.z1 + 1.0, b, y + 1.0, l.z1 + 1.1, MAT.plaster));
  }
}

function vantageBlock(r: ReturnType<typeof makeRng>, out: Fabric): RefBlock {
  // 11 floors: standing on the roof puts the eye where the photo was taken.
  const x0 = -6, x1 = 6, z0 = -5.6, z1 = 4.4, base = 0, wall = 33;
  const tmp: Fabric = { solids: [], decor: [], props: [], lots: [], inter: [], climbables: [], hides: [], features: [], sites: [], far: [] };
  const lot: Lot = { id: 999, x0, z0, x1, z1, base, wall, top: wall + PARAPET, kind: 'res', mat: MAT.concrete, street: [true, false, false, false], across: [0, 0, 0, 0] };
  hollow(lot, r, tmp);
  // Mirror north-south so the stair core and its roof hut sit at the back.
  const m = z0 + z1, flip = (s: Solid): Solid => ({ ...s, z0: m - s.z1, z1: m - s.z0, ramp: s.ramp === 3 ? 4 : s.ramp === 4 ? 3 : s.ramp });
  out.solids.push(...tmp.solids.map(flip));
  out.decor.push(...tmp.decor.map(flip));
  out.inter.push(...tmp.inter.map(i => ({ ...i, z: m - i.z })));
  lot.route = lot.route!.map(p => ({ ...p, z: m - p.z }));
  // A low parapet he can see over.
  out.solids.push(solid(x0, wall, z0, x1, wall + 0.75, z0 + 0.2, MAT.concrete), solid(x0, wall, z0, x0 + 0.2, wall + 0.75, z1, MAT.concrete), solid(x1 - 0.2, wall, z0, x1, wall + 0.75, z1, MAT.concrete));
  return { id: 'V', x0, x1, z0, z1, base, roof: wall, lot };
}

function trees(out: Fabric) {
  const canopy = (cx: number, cy: number, cz: number, rx: number, ry: number, mat: number, seed: number) => {
    const r = makeRng(seed);
    for (let i = 0; i < 22; i++) {
      const x = cx + (rand(r) - 0.5) * rx * 1.6, y = cy + (rand(r) - 0.5) * ry, z = cz + (rand(r) - 0.5) * 2.4, w = 0.25 + rand(r) * 0.45;
      out.decor.push(solid(x - w, y - w * 0.6, z - w, x + w, y + w * 0.6, z + w, mat));
    }
  };
  // The blossoming tree in the bottom-left corner, in the street in front of the low-rises.
  const bx = X(200, 97);
  out.solids.push(solid(bx - 0.2, 0, Z(97) - 0.2, bx + 0.2, 8, Z(97) + 0.2, MAT.wood));
  canopy(bx, Y(1250, 97), Z(97), 2.6, 2, MAT.blossom, 1);
  // The yellow shrub on the front roof and the tree in blossom on the stained block's roof.
  canopy(X(470, 99), Y(1230, 99), Z(99) - 3, 3, 1.2, MAT.leaves, 2);
  canopy(X(1055, 156), Y(525, 156), Z(156) - 3, 1.6, 2.4, MAT.leaves, 3);
}

/** Street, terraces with mossy retaining walls, and stairs between them off to the east. */
function terrain(out: Fabric) {
  const W = 220;
  out.solids.push(
    solid(-W, -2, TERRACE.mid.z, W, 0, 60, MAT.stone),
    solid(-W, -2, TERRACE.back.z, W, TERRACE.mid.y, TERRACE.mid.z, MAT.stone),
    solid(-W, -2, -340, W, TERRACE.back.y, TERRACE.back.z, MAT.stone),
  );
  out.decor.push(solid(-W, 0, TERRACE.mid.z - 0.05, W, TERRACE.mid.y, TERRACE.mid.z + 0.02, MAT.moss), solid(-W, TERRACE.mid.y, TERRACE.back.z - 0.05, W, TERRACE.back.y, TERRACE.back.z + 0.02, MAT.moss));
  stair(42, TERRACE.mid.z, 46, TERRACE.mid.z + 14, 0, TERRACE.mid.y, 4, out.solids, out.decor);
  stair(42, TERRACE.back.z, 46, TERRACE.back.z + 14, TERRACE.mid.y, TERRACE.back.y, 4, out.solids, out.decor);
}

/** Blocks outside the photo's frame, so the wider in-game view keeps going: low in front, high behind. */
function filler(r: ReturnType<typeof makeRng>, out: Fabric) {
  for (const side of [-1, 1]) for (let z = -95; z > -320; z -= 16 + rand(r) * 8) {
    const zone = z < TERRACE.back.z ? 2 : z < TERRACE.mid.z ? 1 : 0;
    for (let x = side < 0 ? -60 : 60; Math.abs(x) < 200; x += side * (12 + rand(r) * 10)) {
      const w = 9 + rand(r) * 8, d = 10 + rand(r) * 6, base = [0, TERRACE.mid.y, TERRACE.back.y][zone];
      const floors = [4 + randInt(r, 4), 8 + randInt(r, 8), 18 + randInt(r, 14)][zone];
      const mat = [[MAT.facadeBrick, MAT.facadeOpen], [MAT.facade, MAT.facadeOpen, MAT.facadeTile], [MAT.facadeBand, MAT.facadeTile, MAT.facade]][zone][randInt(r, zone === 0 ? 2 : 3)];
      const x0 = side < 0 ? x - w : x, z1 = z - (zone === 1 && z + 0 > TERRACE.mid.z - 2 ? 2 : 0);
      if (groundAt(z1 - 0.5) !== base || groundAt(z1 - d) !== base) continue;
      out.solids.push(solid(x0, base, z1 - d, x0 + w, base + floors * FLOOR, z1, mat));
    }
  }
}

/** Low blocks between the vantage and the low-rises, kept under the photo's bottom edge; a street runs north
 *  from the vantage door (x 8-14) and another along the front of the low-rises. */
function nearFiller(r: ReturnType<typeof makeRng>, out: Fabric) {
  for (let z1 = -10; z1 > -88; z1 -= 18) {
    const z0 = z1 - 14, d = REF_CAMERA.z - z1;
    const limit = REF_CAMERA.y - d * T - 1.5;
    for (const [a, b] of [[-70, 6], [16, 70]]) {
      for (let x = a; x < b - 6; ) {
        const w = Math.min(b - x, 8 + rand(r) * 7);
        const h = Math.min(limit, 6 + rand(r) * 18);
        const mat = [MAT.facadeBrick, MAT.facadeOpen, MAT.facade][randInt(r, 3)];
        out.solids.push(solid(x, 0, z0, x + w, Math.max(3, h), z1, mat));
        x += w + 2 + rand(r) * 2;
      }
    }
  }
}

export function buildReference(): World {
  const p = referenceParts();
  const v = p.blocks.find(b => b.id === 'V')!;
  return makeWorld({
    name: 'reference', solids: p.solids, decor: p.decor, climbables: p.climbables, hides: p.hides, inter: p.inter, sites: p.sites,
    spawn: { x: 0, y: v.roof + 0.05, z: REF_CAMERA.z, yaw: 0 },
    teleports: [
      { name: 'vantage roof', x: 0, y: v.roof + 0.05, z: REF_CAMERA.z, yaw: 0 },
      { name: 'street below the low-rises', x: 0, y: 0.05, z: -90, yaw: 0 },
      { name: 'brick rooftops', x: p.blocks.find(b => b.id === 'F2')!.x0 + 1, y: p.blocks.find(b => b.id === 'F2')!.roof + 0.1, z: -125, yaw: -Math.PI / 2 },
      { name: 'mid terrace', x: 40, y: TERRACE.mid.y + 0.05, z: -160, yaw: 0 },
    ],
  });
}
