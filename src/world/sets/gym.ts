// The movement gym: a floodlit yard of labelled obstacles at standard sizes (DESIGN section 3).
import { solid, carve, turn, type Solid } from '../geom';
import { makeWorld, type World, type Label, type Climbable, type HideSpot } from '../world';
import { heightfield } from '../heightfield';
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

  // Hand routes (U-002..U-005), west side of the yard.
  // Sill wall: 9 m, sills 1.6 m apart need push-off dynos; the top lip is in reach from the last sill.
  add(solid(-62, 0, -30, -54, 9, -24, MAT.brick));
  for (const y of [2.0, 3.6, 5.2, 6.8, 8.4]) add(solid(-59, y - 0.1, -24, -57, y, -23.85, MAT.concrete));
  label('窗台 SILL ROUTE 9 m', -58, 1.0, -24);
  // Smooth wall: glass with nothing to hold.
  add(solid(-52, 0, -30, -48, 9, -24, MAT.glass));
  label('光面 SMOOTH: NO HOLDS', -50, 1.0, -24);
  // Bars over a pit: swing with Space, let go to lache.
  solids = carve(solids, { x0: -46, y0: -4, z0: -22, x1: -36, y1: 0.1, z1: -10 });
  for (const z of [-11.2, -15.2, -19.2]) add(solid(-45, 2.1, z - 0.03, -37, 2.15, z + 0.03, MAT.metal));
  add(solid(-45.2, 0, -22, -45, 2.6, -10, MAT.metal)); add(solid(-37, 0, -22, -36.8, 2.6, -10, MAT.metal));
  label('单杠 BARS: SWING + LACHE', -41, 0.6, -9.98);
  // Ledge traverse: a lip at 2.5 m with a 1.5 m break; the wall carries on above, so no mantle.
  add(solid(-62, 0, 30, -40, 6, 34, MAT.brick));
  add(solid(-62, 2.4, 29.85, -51.5, 2.5, 30, MAT.concrete));
  add(solid(-50, 2.4, 29.85, -40, 2.5, 30, MAT.concrete));
  label('横移 TRAVERSE + PUSH-OFF', -46, 1.2, 29.85, 'n');

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

  // Turned walls (M3-40): the same moves on a group turned 30 degrees, as real streets run at every angle.
  {
    const px = 20, pz = 50, th = Math.PI / 6, c = Math.cos(th), s = Math.sin(th);
    const at = (x: number, z: number): [number, number] => [px + c * (x - px) - s * (z - pz), pz + s * (x - px) + c * (z - pz)];
    solids.push(...turn([
      solid(10, 0, 44, 14, 1.0, 48, MAT.block), // hop
      solid(16, 0, 44, 20, 2.0, 48, MAT.block), // lip to pull up on
      solid(22, 0, 40, 22.3, 4, 60, MAT.block), // wall-run wall
      { ...solid(26, 0, 40, 30, 2.4, 52, MAT.concrete), ramp: 4, low: 0 }, // ramp rising north
    ], th, px, pz));
    for (const [t, x, y, z] of [['斜 TURNED 1.0 m', 12, 1.3, 48], ['斜 TURNED 2.0 m', 18, 2.3, 48], ['斜 WALL-RUN', 22.5, 2, 58], ['斜 RAMP', 28, 0.8, 52]] as const) {
      const [lx, lz] = at(x, z);
      label(t, lx, y, lz, 'up');
    }
  }

  // Heightfield ground (M3-41a) east of the yard: level with the floor at x 70, a 30% slope from x 80, a 6 m cut
  // retaining face at x 110 and a plateau; a pit with a tunnel under the shell.
  const ground = heightfield(70, -40, 2, 41, 41, 4);
  for (let j = 0; j < 41; j++) for (let i = 0; i < 41; i++) {
    const x = 70 + i * 2, z = -40 + j * 2;
    ground.y[j * 41 + i] = Math.min(9, Math.max(0, (x - 80) * 0.3)) + (x >= 112 ? 6 : 0) + 0.8 * Math.sin(z * 0.15);
  }
  solids.push(solid(118, 4, -6, 140, 5, 6, MAT.concrete)); // a tunnel floor under the plateau
  label('坡 SLOPE 30%', 90, 4, 0, 'up');

  return makeWorld({
    name: 'gym', solids, labels, climbables, hides, ground,
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
      { name: 'sill route / smooth wall', x: -55, y: 0, z: -21, yaw: 0 },
      { name: 'bars over the pit', x: -41, y: 0, z: -9.6, yaw: 0 },
      { name: 'ledge traverse', x: -58, y: 0, z: 27, yaw: Math.PI },
      { name: 'turned walls', x: 14, y: 0, z: 58, yaw: Math.PI / 6 },
      { name: 'hillside (ground)', x: 74, y: 1.5, z: 10, yaw: -Math.PI / 2 - 0.3 },
    ],
  });
}
