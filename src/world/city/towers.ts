// Towers (M3-46, U-020): no two alike. A podium of shops or offices on big footprints, a shaft of curtain wall
// or a gridded office facade, a setback or two on the tall ones, and a crown: a plant room, a stepped top, a
// spire or a lit band. Colours come from the lot's tint (glass) and a stone tint for podiums and grids.
import { solid } from '../geom';
import { MAT } from '../mats';
import { rand, randInt, type Rng } from '../../sim/rng';
import { pick, GLASS } from './palette';
import { PARAPET, type Lot, type Fabric } from './buildings';
import { lobby } from './fronts';
import { climbLine, type Block } from './routes';

export function tower(l: Lot, r: Rng, out: Fabric) {
  const { base, wall } = l;
  let { x0, z0, x1, z1 } = l;
  const grid = rand(r) < 0.35, shaftMat = grid ? MAT.facadeBand : MAT.glass, stone = 0xd8d4ca - randInt(r, 4) * 0x0a0a0a;
  const push = (s: ReturnType<typeof solid>, tint?: number, far = true) => { s.tint = tint; out.solids.push(s); if (far) out.far.push({ ...s }); };
  // The blocks it's built of, bottom up, for a climbing line (M3-57a).
  const blocks: Block[] = [];
  // Podium: four to six tall commercial floors over the whole lot.
  if (Math.min(x1 - x0, z1 - z0) >= 18 && rand(r) < 0.6) {
    const ph = base + (4 + randInt(r, 3)) * 4.5;
    blocks.push({ x0, z0, x1, z1, y0: base, y1: ph, top: ph + PARAPET });
    push(solid(x0, base, z0, x1, ph, z1, rand(r) < 0.5 ? MAT.facadeBand : MAT.glass), rand(r) < 0.5 ? stone : pick(GLASS, r));
    out.solids.push(solid(x0, ph, z0, x1, ph + PARAPET, z0 + 0.2, MAT.concrete), solid(x0, ph, z1 - 0.2, x1, ph + PARAPET, z1, MAT.concrete));
    const inset = 2 + rand(r) * 3;
    x0 += inset; z0 += inset; x1 -= inset; z1 -= inset;
    l.podium = ph;
  }
  const shaftTint = grid ? stone : l.tint;
  let y = l.podium ?? base;
  // Setbacks on the tall ones.
  if (wall - base > 80 && rand(r) < 0.5) {
    const k = y + (wall - y) * (0.6 + rand(r) * 0.2), inset = 1.5 + rand(r) * 2;
    push(solid(x0, y, z0, x1, k, z1, shaftMat), shaftTint);
    blocks.push({ x0, z0, x1, z1, y0: y, y1: k, top: k });
    x0 += inset; z0 += inset; x1 -= inset; z1 -= inset; y = k;
  }
  push(solid(x0, y, z0, x1, wall, z1, shaftMat), shaftTint);
  blocks.push({ x0, z0, x1, z1, y0: y, y1: wall, top: wall + PARAPET });
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  switch (randInt(r, 4)) {
    case 0: // a plant room
      push(solid(cx - w * 0.3, wall, cz - d * 0.3, cx + w * 0.3, wall + 5, cz + d * 0.3, MAT.metal));
      break;
    case 1: // a stepped crown
      push(solid(x0 + w * 0.12, wall, z0 + d * 0.12, x1 - w * 0.12, wall + 6, z1 - d * 0.12, shaftMat), shaftTint);
      push(solid(x0 + w * 0.28, wall + 6, z0 + d * 0.28, x1 - w * 0.28, wall + 11, z1 - d * 0.28, shaftMat), shaftTint);
      break;
    case 2: // a spire
      push(solid(cx - 2, wall, cz - 2, cx + 2, wall + 4, cz + 2, MAT.metal));
      push(solid(cx - 0.4, wall + 4, cz - 0.4, cx + 0.4, wall + 14 + rand(r) * 16, cz + 0.4, MAT.metal));
      break;
    default: // a lit band round the top
      out.decor.push(solid(x0 - 0.05, wall - 2.5, z0 - 0.05, x1 + 0.05, wall - 1.5, z1 + 0.05, MAT.lamp));
  }
  lobby(l, () => rand(r), out);
  // The roof edge.
  out.solids.push(solid(x0, wall, z0, x1, wall + PARAPET, z0 + 0.2, MAT.concrete), solid(x0, wall, z1 - 0.2, x1, wall + PARAPET, z1, MAT.concrete),
    solid(x0, wall, z0 + 0.2, x0 + 0.2, wall + PARAPET, z1 - 0.2, MAT.concrete), solid(x1 - 0.2, wall, z0 + 0.2, x1, wall + PARAPET, z1 - 0.2, MAT.concrete));
  l.top = wall + PARAPET;
  // Over half the tall ones have a line up a north or south face, all the way from the street.
  if (wall - base >= 40 && rand(r) < 0.6) climbLine(l, blocks, randInt(r, 2), (x0 + x1) / 2 + (rand(r) - 0.5) * (x1 - x0 - 6), r, out);
}
