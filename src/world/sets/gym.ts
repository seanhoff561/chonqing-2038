// The movement gym: a floodlit yard of labelled obstacles at standard sizes (DESIGN section 3).
import { solid, carve, type Solid } from '../geom';
import { makeWorld, type World, type Label, type Climbable, type HideSpot } from '../world';
import { MAT } from '../mats';

export function buildGym(): World {
  let solids: Solid[] = [solid(-70, -4, -70, 70, 0, 70, MAT.concrete)];
  const labels: Label[] = [];
  const climbables: Climbable[] = [];
  const hides: HideSpot[] = [];
  const add = (s: Solid) => { solids.push(s); return s; };
  const label = (text: string, x: number, y: number, z: number, face: Label['face'] = 's') => labels.push({ text, x, y, z, face });

  // Row A: mantle ledges, south faces at z = -10.
  [1.0, 1.5, 2.0, 2.4, 2.6].forEach((h, i) => {
    const x = -24 + i * 6;
    add(solid(x, 0, -14, x + 3, h, -10, MAT.block));
    label(`攀爬 MANTLE ${h.toFixed(1)} m`, x + 1.5, Math.min(h - 0.3, 0.9), -10);
  });
  // Row B: gap lanes on 2 m platforms running north; runway z -26..-44, gap, landing.
  [3, 4, 4.5, 5.2].forEach((g, i) => {
    const x = 12 + i * 6;
    add(solid(x, 0, -26, x + 4, 2, -10, MAT.block));
    add(solid(x, 0, -60, x + 4, 2, -26 - g, MAT.block));
    label(`跳跃 GAP ${g} m`, x + 2, 1.2, -10);
  });
  // Wall-run lane: 2 m runway, 6 m gap, a 5 m wall along the west side of the gap.
  add(solid(40, 0, -26, 44, 2, -10, MAT.block));
  add(solid(40, 0, -60, 44, 2, -32, MAT.block));
  add(solid(39.3, 0, -40, 39.5, 5, -18, MAT.brick));
  label('飞檐走壁 WALL-RUN 6 m', 42, 1.2, -10);

  // Row C (south faces at z = 14): vaults, crawl gap, slide bar, run-up walls.
  add(solid(-30, 0, 10.5, -27, 0.8, 11, MAT.block)); label('跨越 VAULT 0.8 m', -28.5, 0.4, 11);
  add(solid(-24, 0, 10.5, -21, 1.1, 11, MAT.block)); label('跨越 VAULT 1.1 m', -22.5, 0.5, 11);
  add(solid(-18, 0.6, 6, -15, 2.5, 11, MAT.block)); label('爬行 CRAWL 0.6 m', -16.5, 1.2, 11);
  add(solid(-18.1, 0, 6, -18, 2.5, 11, MAT.block)); add(solid(-15, 0, 6, -14.9, 2.5, 11, MAT.block));
  add(solid(-12, 0.6, 10.7, -8, 0.9, 11, MAT.metal)); label('滑铲 SLIDE 0.6 m', -10, 1.5, 11);
  add(solid(-12, 0.9, 10.75, -11.9, 2.5, 10.95, MAT.metal)); add(solid(-8.1, 0.9, 10.75, -8, 2.5, 10.95, MAT.metal));
  add(solid(-4, 0, 6, 0, 3.5, 11, MAT.brick)); label('蹬墙 RUN-UP 3.5 m', -2, 1.0, 11);
  add(solid(2, 0, 6, 6, 4.2, 11, MAT.brick)); label('蹬墙 RUN-UP 4.2 m', 4, 1.0, 11);

  // Pipe and ladder towers.
  add(solid(10, 0, 6, 14, 6, 11, MAT.plaster));
  climbables.push({ kind: 'pipe', x: 12, z: 11.05, y0: 0, y1: 6, nx: 0, nz: 1 });
  add(solid(11.95, 0, 11, 12.05, 6, 11.1, MAT.metal));
  label('水管 PIPE 6 m', 13.2, 1.8, 11);
  add(solid(17, 0, 6, 21, 4, 11, MAT.plaster));
  climbables.push({ kind: 'ladder', x: 19, z: 11.05, y0: 0, y1: 4, nx: 0, nz: 1 });
  label('梯子 LADDER 4 m', 20.3, 1.8, 11);

  // Drop towers with ladders on the south face; drop off the north side.
  [3.5, 6.5, 9].forEach((h, i) => {
    const x = 26 + i * 6;
    add(solid(x, 0, 6, x + 3, h, 11, MAT.block));
    climbables.push({ kind: 'ladder', x: x + 1.5, z: 11.05, y0: 0, y1: h, nx: 0, nz: 1 });
    label(`落差 DROP ${h} m`, x + 1.5, 2.2, 11);
  });

  // Pool: 3 m deep, surface 0.3 m below the yard.
  solids = carve(solids, { x0: -30, y0: -3.3, z0: 24, x1: -16, y1: 0.1, z1: 36 });
  label('水池 POOL', -23, 0.6, 24, 'n');

  // Hide boxes 0.6 and 0.8 m (inner), crate walls 5 cm.
  for (const [s, x] of [[0.6, -8], [0.8, -4]] as const) {
    const inner = { x0: x, y0: 0, z0: 24, x1: x + s, y1: s, z1: 24 + s };
    add(solid(x - 0.05, 0, 24 - 0.05, x + s + 0.05, s + 0.05, 24 + s + 0.05, MAT.crate));
    hides.push({ id: hides.length, inner, kind: 'crate' });
    label(`藏身 BOX ${s} m`, x + s / 2, s + 0.35, 24 + s / 2, 'up');
  }

  return makeWorld({
    name: 'gym', solids, labels, climbables, hides,
    water: [{ x0: -30, y0: -3.3, z0: 24, x1: -16, y1: -0.3, z1: 36 }],
    spawn: { x: 0, y: 0, z: 0, yaw: 0 },
    teleports: [
      { name: 'start', x: 0, y: 0, z: 0, yaw: 0 },
      { name: 'mantle row', x: -12, y: 0, z: -5, yaw: 0 },
      { name: 'gap lanes', x: 20, y: 2, z: -12, yaw: 0 },
      { name: 'wall-run lane', x: 41, y: 2, z: -12, yaw: 0 },
      { name: 'vault / crawl / slide', x: -20, y: 0, z: 18, yaw: 0 },
      { name: 'pipes, ladders, drops', x: 20, y: 0, z: 16, yaw: 0 },
      { name: 'pool and boxes', x: -12, y: 0, z: 22, yaw: Math.PI },
    ],
  });
}
