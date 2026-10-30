// The alley over the start hideout (M3-72, U-038): a lane between two old blocks, the grate in its paving under a
// heap of rubbish bags, shop neon on the walls over it, a dumpster, bins, cardboard and a line of washing. The roads
// over the friends' chamber are the machines' (kept clear), so the alley is set off them where it fits, near the
// chamber, at whatever angle the streets leave room for; a passage from the chamber runs to the foot of its shaft.
import { solid, turn, type Solid } from '../geom';
import { MAT } from '../mats';
import type { Prop } from '../world';
import type { Street } from './ground';
import { inside, type Obb, type P2 } from './shapes';

/** Half the lane's width; half its length; how deep the blocks either side of it are. */
export const LANE = 1.7, HALF = 7, DEEP = 4.5;

/** Where in the tunnel frame the grate goes, and the lane's angle there: the nearest spot north of the chamber (its
 *  north wall at v0, along u0..u1) whose alley stands clear of every street and of the areas to avoid (the building
 *  site, 3 m off). W maps the frame to the map. */
export function alleySpot(sts: Street[], avoid: P2[][], W: (u: number, v: number) => [number, number], u0: number, u1: number, v0: number): { u: number; v: number; ang: number } | null {
  const [cx, cz] = W((u0 + u1) / 2, v0 + 15);
  const segs: [number, number, number, number, number][] = [];
  for (const s of sts) for (let k = 0; k + 1 < s.pts.length; k++) {
    const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], l = Math.hypot(bx - ax, bz - az);
    if (Math.hypot((ax + bx) / 2 - cx, (az + bz) / 2 - cz) < l / 2 + 60) segs.push([ax, az, bx, bz, s.w / 2 + 0.5]);
  }
  for (const p of avoid) p.forEach(([ax, az], k) => { const [bx, bz] = p[(k + 1) % p.length]; segs.push([ax, az, bx, bz, 3]); });
  const clear = (x: number, z: number) => !avoid.some(p => inside(p, x, z)) && segs.every(([ax, az, bx, bz, r]) => {
    const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
    return Math.hypot(x - ax - vx * t, z - az - vz * t) > r;
  });
  let best: { u: number; v: number; ang: number } | null = null, bd = Infinity;
  for (let v = v0 + 3; v <= v0 + 45; v += 1) for (let u = u0 + 2; u <= u1 - 2; u += 1) {
    const d = v - v0 + Math.abs(u - (u0 + u1) / 2) * 0.2;
    if (d >= bd) continue;
    for (let a = 0; a < 24; a++) {
      const ang = (a * Math.PI) / 24, c = Math.cos(ang), s = Math.sin(ang);
      let ok = true;
      for (let p = -HALF; p <= HALF && ok; p += 1) for (let q = -(LANE + DEEP); q <= LANE + DEEP && ok; q += 1) ok = clear(...W(u + c * p - s * q, v + s * p + c * q));
      if (ok) { best = { u, v, ang }; bd = d; break; }
    }
  }
  return best;
}

/** The alley's footprint on the map (lots keep off it). */
export const alleyObb = (gx: number, gz: number, dir: number): Obb => ({ cx: gx, cz: gz, hw: HALF, hd: LANE + DEEP, yaw: dir });

/** gx, gz: the grate on the map; gy: the street there; dir: the lane's direction on the map; ground(x, z): the
 *  ground's height on the map. */
export function alley(gx: number, gz: number, gy: number, dir: number, ground: (x: number, z: number) => number): { solids: Solid[]; props: Prop[] } {
  const c = Math.cos(dir), s = Math.sin(dir), map = (x: number, z: number): [number, number] => [gx + c * (x - gx) - s * (z - gz), gz + s * (x - gx) + c * (z - gz)];
  const block = (z0: number, z1: number, h: number, mat: number) => {
    const y0 = Math.min(gy, ...[[gx - HALF, z0], [gx + HALF, z0], [gx - HALF, z1], [gx + HALF, z1]].map(([x, z]) => ground(...map(x, z)))) - 1;
    return solid(gx - HALF, y0, z0, gx + HALF, gy + h, z1, mat);
  };
  const S = gz - LANE, N = gz + LANE;
  const solids = [
    block(S - DEEP, S, 13.6, MAT.facadeTile), block(N, N + DEEP, 10.4, MAT.facade),
    // The lane paved either side of the grate's slab (the tunnels lay that, holed for the shaft), and a dumpster
    // against the north wall (a place to hide, like every dumpster).
    solid(gx - HALF, gy - 0.4, S, gx - 1.75, gy + 0.02, N, MAT.concrete), solid(gx + 1.75, gy - 0.4, S, gx + HALF, gy + 0.02, N, MAT.concrete),
    solid(gx + 3.05, gy, N - 1.2, gx + 4.95, gy + 1.3, N - 0.05, MAT.hidden),
  ];
  const props: Prop[] = [
    // Neon over the lane: the noodle shop's and the hotel's down the walls, the mahjong room's over its back door.
    { kind: 'neon', x: gx - 4, y: gy + 8.5, z: S + 0.06, yaw: 0, w: 1.1, h: 5, text: '老巷小面' },
    { kind: 'neon', x: gx + 3, y: gy + 6.8, z: N - 0.06, yaw: Math.PI, w: 0.9, h: 4, text: '钟点房' },
    { kind: 'neon', x: gx - 4.5, y: gy + 2.9, z: N - 0.06, yaw: Math.PI, h: 0.5, text: '麻将 · 24小时' },
    { kind: 'neonGlow', x: gx - 1, y: gy + 5, z: gz, yaw: 0 },
    { kind: 'dumpster', x: gx + 4, y: gy, z: N - 0.62, yaw: Math.PI },
    { kind: 'bin', x: gx - 5.8, y: gy, z: S + 0.45, yaw: 0 },
    { kind: 'bin', x: gx - 5.1, y: gy, z: S + 0.4, yaw: 0.6 },
    { kind: 'boxes', x: gx - 2.6, y: gy, z: N - 0.5, yaw: 0.3 },
    { kind: 'trash', x: gx + 2.4, y: gy, z: S + 0.6, yaw: 1.2 },
    { kind: 'laundry', x: gx - 2, y: gy + 4.2, z: gz, yaw: Math.PI / 2, w: 2 * LANE },
    { kind: 'cablebundle', x: gx + 1.2, y: gy, z: S + 0.02, yaw: 0, h: 12 },
  ];
  return { solids: turn(solids, dir, gx, gz), props: props.map(p => { const [x, z] = map(p.x, p.z); return { ...p, x, z, yaw: p.yaw - dir }; }) };
}
