// The underground's parts (M3-68, U-032): service tunnels that look used (pipes, cables, a drain, what was left
// along the walls) and broken into rooms every 100 m or so (air-raid shelters, stores, pump rooms, a market); the
// metro's twin running tunnels (track, walkways, cable trays, lights, signals, cross passages, a stalled train)
// and its platform halls; and the stepped streets that go down off the street in landings into the underground
// city, open to the sky, so ground level keeps going down. Each laid out along a straight run square to the map.
import { solid, type Solid, type Box } from '../geom';
import { MAT } from '../mats';
import { rand, type Rng } from '../../sim/rng';
import { stair } from '../steps';
import type { Prop } from '../world';
import { propBoxes } from './dressing';
import type { P2 } from './shapes';

type V3 = { x: number; y: number; z: number };
/** What a part digs and builds with (under.ts). */
export interface Dig {
  /** a lined space (open: no roof; lit: the city's own lights) */
  space(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, mat?: number, open?: boolean, lit?: boolean): void;
  bores: Box[]; kept: Solid[]; decor: Solid[]; props: Prop[];
  gy(x: number, z: number): number;
  hole(x0: number, z0: number, x1: number, z1: number): void;
  keep(x0: number, z0: number, x1: number, z1: number): void;
  clearOf(x0: number, z0: number, x1: number, z1: number): boolean;
  /** marks a part for tests and teleports */
  mark(kind: string, at: P2, y: number): void;
}

const T35 = Math.tan(0.61);
/** A metro tube: its width, height, the track centres either side of the run's line, the walkway's top. */
export const TUBE = { w: 4.6, h: 5.0, off: 4.5, walk: 1.0 };

/** A straight run square to the map from a to b: t along it from a, s across it (to the left of a running x,
 *  along +x for a run along z); boxes and points in that frame to the map. */
export function run(a: P2, b: P2) {
  const alongX = Math.abs(b[1] - a[1]) < 1e-6, len = Math.hypot(b[0] - a[0], b[1] - a[1]), sg = Math.sign(alongX ? b[0] - a[0] : b[1] - a[1]) || 1;
  const pt = (t: number, s: number): P2 => (alongX ? [a[0] + sg * t, a[1] + s] : [a[0] + s, a[1] + sg * t]);
  const rect = (t0: number, t1: number, s0: number, s1: number): [number, number, number, number] => {
    const [p, q] = [pt(t0, s0), pt(t1, s1)];
    return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])];
  };
  const box = (t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, mat: number) => { const [x0, z0, x1, z1] = rect(t0, t1, s0, s1); return solid(x0, y0, z0, x1, y1, z1, mat); };
  /** A prop's yaw to stand along the run (its width along it). */
  const yaw = alongX ? 0 : Math.PI / 2;
  /** The stair direction that rises along +t. */
  const up = (alongX ? (sg > 0 ? 1 : 2) : sg > 0 ? 3 : 4) as 1 | 2 | 3 | 4, down = (alongX ? (sg > 0 ? 2 : 1) : sg > 0 ? 4 : 3) as 1 | 2 | 3 | 4;
  return { len, pt, rect, box, yaw, up, down };
}

/** A prop against a wall, with its collision, if nothing's in the way. */
function put(d: Dig, kind: string, [x, z]: P2, y: number, yaw: number) {
  const p: Prop = { kind, x, y, z, yaw };
  d.props.push(p);
  d.kept.push(...propBoxes(p));
}

/** A service tunnel's fittings from t0 to t1 of run R, w wide and h high at y: pipes and a cable run along the
 *  walls, a drain grating along the floor, and every 9-20 m something left against a wall (the middle stays clear). */
export function fit(d: Dig, R: ReturnType<typeof run>, t0: number, t1: number, y: number, w: number, h: number, r: Rng) {
  const hw = w / 2;
  if (t1 - t0 < 2) return;
  d.decor.push(R.box(t0, t1, hw - 0.35, hw - 0.15, y + h - 0.75, y + h - 0.55, MAT.metal), R.box(t0, t1, hw - 0.3, hw - 0.12, y + h - 1.05, y + h - 0.88, MAT.tealMetal),
    R.box(t0, t1, -hw + 0.08, -hw + 0.22, y + h - 0.5, y + h - 0.36, MAT.cloth), R.box(t0, t1, -hw + 0.05, -hw + 0.45, y, y + 0.025, MAT.metal));
  for (let t = t0 + 4 + rand(r) * 6; t < t1 - 4; t += 9 + rand(r) * 11) {
    const side = rand(r) < 0.5 ? -1 : 1, q = rand(r), kind = q < 0.3 ? 'drum' : q < 0.5 ? 'boxes' : q < 0.65 ? 'bags' : q < 0.8 ? 'sandbags' : q < 0.9 ? 'bench' : 'debris';
    const depth = kind === 'drum' ? 0.5 : kind === 'bags' || kind === 'boxes' ? 0.65 : 0.4;
    put(d, kind, R.pt(t, side * (hw - depth)), y, R.yaw);
  }
}

/** A room on a service run, the run passing through its middle at t: 14 m along, 10 across, 4.4 high, its kind's
 *  things against its walls and the way through kept clear. market: the underground city's, lit. */
export function room(d: Dig, R: ReturnType<typeof run>, t: number, y: number, kind: 'shelter' | 'store' | 'pump' | 'market', r: Rng) {
  const [x0, z0, x1, z1] = R.rect(t - 7, t + 7, -5, 5);
  d.space(x0, z0, x1, z1, y, y + 4.4, kind === 'shelter' ? MAT.brick : MAT.concrete, false, kind === 'market');
  d.mark(`room:${kind}`, R.pt(t, 0), y);
  d.decor.push(R.box(t - 0.4, t + 0.4, -0.4, 0.4, y + 4.25, y + 4.4, MAT.lamp));
  for (const side of [-1, 1]) for (let a = t - 5.5; a <= t + 4.5; a += kind === 'store' ? 2.6 : 2.2) {
    if (kind === 'shelter') put(d, 'bench', R.pt(a + 0.9, side * 4.6), y, R.yaw);
    else if (kind === 'store') {
      // Shelving along the walls, a crate stack on some bays: something to climb and to hide behind.
      d.kept.push(R.box(a, a + 2.2, side * 4.45 - 0.25, side * 4.45 + 0.25, y, y + 2.0, MAT.wood));
      if (rand(r) < 0.4) d.kept.push(R.box(a + 0.3, a + 1.2, side * 3.5 - 0.45, side * 3.5 + 0.45, y, y + 0.9, MAT.crate));
    } else if (kind === 'pump') {
      if (a > t - 5 && a < t + 3 && rand(r) < 0.5) {
        d.kept.push(R.box(a, a + 2, side * 3.9 - 0.7, side * 3.9 + 0.7, y, y + 1.6, MAT.metal));
        d.decor.push(R.box(a + 0.8, a + 1.1, side * 3.9 - 0.15, side * 3.9 + 0.15, y + 1.6, y + 4.4, MAT.tealMetal));
      } else put(d, 'drum', R.pt(a + 0.6, side * 4.4), y, R.yaw);
    } else {
      put(d, rand(r) < 0.7 ? 'stall' : 'mahjong', R.pt(a + 1, side * 4.3), y, R.yaw);
      d.decor.push(R.box(a + 0.2, a + 1.8, side * 4.97 - 0.02, side * 4.97 + 0.02, y + 2.2, y + 3.2, MAT.screen), R.box(a + 0.9, a + 1.1, side * 3.6 - 0.1, side * 3.6 + 0.1, y + 3.0, y + 3.3, MAT.lamp));
    }
  }
  if (kind === 'shelter') { put(d, 'sandbags', R.pt(t - 5.8, 2.4), y, R.yaw + Math.PI / 2); put(d, 'tarp', R.pt(t + 4.6, -3.2), y, R.yaw); }
}

/** The metro's twin running tunnels along run R at y (track bed level), from t0 to t1: each its track (ballast,
 *  sleepers, rails), a walkway on its outer side, cable trays on its inner wall, lights, a signal every 120 m;
 *  cross passages between them every 100 m; train: where a stalled train of three cars stands in the second. */
export function tubes(d: Dig, R: ReturnType<typeof run>, t0: number, t1: number, y: number, train = -1) {
  const { w, h, off, walk } = TUBE, hw = w / 2;
  for (const c of [-off, off]) {
    const out = Math.sign(c), [x0, z0, x1, z1] = R.rect(t0, t1, c - hw, c + hw);
    d.space(x0, z0, x1, z1, y, y + h);
    d.decor.push(R.box(t0, t1, c - 1.6, c + 1.6, y, y + 0.04, MAT.rubble));
    for (const s of [-0.72, 0.72]) d.decor.push(R.box(t0, t1, c + s - 0.035, c + s + 0.035, y + 0.1, y + 0.24, MAT.metal));
    for (let t = t0 + 0.4; t < t1; t += 0.75) d.decor.push(R.box(t - 0.1, t + 0.1, c - 1.25, c + 1.25, y + 0.03, y + 0.11, MAT.concrete));
    // The walkway along the outer wall, a handrail on the wall over it.
    d.kept.push(R.box(t0, t1, out > 0 ? c + hw - 0.9 : c - hw, out > 0 ? c + hw : c - hw + 0.9, y, y + walk, MAT.concrete));
    d.decor.push(R.box(t0, t1, out > 0 ? c + hw - 0.08 : c - hw + 0.03, out > 0 ? c + hw - 0.03 : c - hw + 0.08, y + walk + 0.9, y + walk + 0.95, MAT.metal));
    // Cable trays on the inner wall, cables in them.
    const iw = c - out * hw;
    for (const ty of [2.2, 2.6, 3.0]) d.decor.push(R.box(t0, t1, Math.min(iw, iw + out * 0.45), Math.max(iw, iw + out * 0.45), y + ty, y + ty + 0.04, MAT.metal), R.box(t0, t1, Math.min(iw + out * 0.1, iw + out * 0.35), Math.max(iw + out * 0.1, iw + out * 0.35), y + ty + 0.04, y + ty + 0.1, MAT.cloth));
    for (let t = t0 + 6; t < t1; t += 15) d.decor.push(R.box(t - 0.3, t + 0.3, out > 0 ? c + hw - 0.12 : c - hw + 0.02, out > 0 ? c + hw - 0.02 : c - hw + 0.12, y + 3.6, y + 3.72, MAT.lamp));
    // A signal by the track every 120 m: a post, its head, its lamp.
    for (let t = t0 + 40; t < t1 - 10; t += 120) {
      const s = out > 0 ? c + hw - 1.15 : c - hw + 1.15;
      d.decor.push(R.box(t - 0.05, t + 0.05, s - 0.05, s + 0.05, y + walk, y + 2.6, MAT.metal), R.box(t - 0.15, t + 0.15, s - 0.2, s + 0.2, y + 2.6, y + 3.5, MAT.metal), R.box(t - 0.16, t + 0.16, s - 0.08, s + 0.08, y + 3.2, y + 3.4, MAT.lamp));
      d.mark('signal', R.pt(t, s), y);
    }
  }
  // Cross passages from one tube's track to the other's, a door frame and a lit sign at each end.
  for (let t = t0 + 50; t < t1 - 20; t += 100) {
    const [x0, z0, x1, z1] = R.rect(t - 1.2, t + 1.2, -off + hw - 0.1, off - hw + 0.1);
    d.space(x0, z0, x1, z1, y, y + 2.6);
    for (const s of [-off + hw, off - hw]) d.decor.push(R.box(t - 1.3, t + 1.3, s - 0.06, s + 0.06, y + 2.5, y + 2.65, MAT.metal), R.box(t - 0.3, t + 0.3, s - 0.07, s + 0.07, y + 2.7, y + 2.95, MAT.glare));
    d.mark('crossPassage', R.pt(t, 0), y);
  }
  // A stalled train in the second tube: three cars on their bogies, windows dark; under them a crawl.
  if (train >= 0) for (let k = 0; k < 3; k++) {
    const a = train + k * 19.2, c = off;
    d.kept.push(R.box(a, a + 18.7, c - 1.45, c + 1.45, y + 0.95, y + 4.5, MAT.metal));
    for (const b of [a + 2, a + 15.2]) d.kept.push(R.box(b, b + 1.5, c - 1.1, c + 1.1, y + 0.1, y + 0.95, MAT.metal));
    for (const s of [-1, 1]) d.decor.push(R.box(a + 0.6, a + 18.1, c + s * 1.45 - 0.02, c + s * 1.45 + 0.02, y + 2.5, y + 3.6, MAT.glass));
    d.mark('trainCar', R.pt(a + 9.35, c), y);
  }
}

/** A metro station along run R at y: its hall from t 0 to L, 18 m across and 6.5 high, lit; an island platform
 *  1 m up between the tracks with steps down at both ends, columns and benches down its middle (the way along it
 *  either side), screens; the tracks running through. */
export function station(d: Dig, R: ReturnType<typeof run>, L: number, y: number, r: Rng) {
  const [x0, z0, x1, z1] = R.rect(0, L, -9, 9), { off, walk } = TUBE;
  d.space(x0, z0, x1, z1, y, y + 6.5, MAT.concrete, false, true);
  d.mark('station', R.pt(L / 2, 0), y);
  d.kept.push(R.box(4, L - 4, -2.2, 2.2, y, y + walk, MAT.concrete));
  d.decor.push(R.box(4, L - 4, -2.2, -1.9, y + walk, y + walk + 0.01, MAT.tealMetal), R.box(4, L - 4, 1.9, 2.2, y + walk, y + walk + 0.01, MAT.tealMetal));
  stair(...R.rect(2.5, 4, -1.2, 1.2), y, y + walk, R.up, d.kept, d.decor);
  stair(...R.rect(L - 4, L - 2.5, -1.2, 1.2), y, y + walk, R.down, d.kept, d.decor);
  for (let t = 10; t < L - 8; t += 9) {
    d.kept.push(R.box(t - 0.4, t + 0.4, -0.4, 0.4, y + walk, y + 6.5, MAT.concrete));
    if (rand(r) < 0.7 && t + 9 < L - 8) put(d, 'bench', R.pt(t + 4.5, 0), y + walk, R.yaw);
    d.decor.push(R.box(t - 0.05, t + 0.05, -0.9, 0.9, y + 3.6, y + 4.4, MAT.screen));
  }
  for (const c of [-off, off]) {
    for (const s of [-0.72, 0.72]) d.decor.push(R.box(0, L, c + s - 0.035, c + s + 0.035, y + 0.1, y + 0.24, MAT.metal));
    for (let t = 0.4; t < L; t += 0.75) d.decor.push(R.box(t - 0.1, t + 0.1, c - 1.25, c + 1.25, y + 0.03, y + 0.11, MAT.concrete));
  }
  d.decor.push(R.box(2, L - 2, -0.2, 0.2, y + 6.42, y + 6.5, MAT.glare));
}

/** A street stepping down off the street along (dx, dz) into the ground, in landings 4-5 m apart, to y at `at`
 *  (where it opens onto what it leads to; its mouth as far back up the hill as that takes): 10 m wide, open to the
 *  sky between retaining walls, shopfronts on the walls of each landing, a stair down from each to the next; its
 *  last landing runs on `on` m past `at`. Its walk (mouth to foot), or null where the street can't go (a street
 *  over its cut). */
export function descent(d: Dig, at: P2, dx: number, dz: number, y: number, on: number, r: Rng): V3[] | null {
  // The mouth back up the hill: as far as its landings and flights take, from the ground there.
  const back = (m: P2) => { const drop = d.gy(...m) - y, n = Math.max(1, Math.ceil(drop / 5)); return n * (7 + drop / n / T35); };
  let L = 60;
  for (let i = 0; i < 6; i++) L = back([at[0] - dx * L, at[1] - dz * L]);
  const m: P2 = [at[0] - dx * L, at[1] - dz * L], R = run(m, [m[0] + dx, m[1] + dz]), top = d.gy(...m), drop = top - y;
  if (drop < 8) return null;
  // (Its landings take up what's left of the length over its flights.)
  const n = Math.ceil(drop / 5), step = drop / n, flight = step / T35, LAND = Math.max(5, L / n - flight), len = n * (LAND + flight) + on;
  // (Its walls 2.3 m thick: the ground's cells holed over the cut reach up to a cell past its edge.)
  const [ox0, oz0, ox1, oz1] = R.rect(-2.5, len - on, -7.5, 7.5), WT = 2.3;
  if (!d.clearOf(ox0, oz0, ox1, oz1)) return null;
  const walk: V3[] = [{ x: m[0], y: top, z: m[1] }];
  let t = 0, ly = top;
  const ground = (a: number, b: number) => Math.max(...[a, (a + b) / 2, b].flatMap(q => [-7, 7].map(s => d.gy(...R.pt(q, s)))));
  const walls = (a: number, b: number, y0: number) => { const wt = ground(a, b) + 0.9; for (const s of [-1, 1]) d.kept.push(R.box(a, b, s > 0 ? 5 : -5 - WT, s > 0 ? 5 + WT : -5, y0, wt, MAT.concrete)); };
  // A paved apron over the ground behind its mouth.
  d.kept.push(R.box(-2.5, 0, -5 - WT, 5 + WT, top - 0.6, top + 0.02, MAT.stone));
  for (let k = 0; k <= n; k++) {
    // (The last landing runs on into what it opens onto; its walls and its open sky stop where that starts.)
    const end = k < n ? t + LAND : len, open = k < n ? end : len - on, [x0, z0, x1, z1] = R.rect(t, open, -5, 5);
    // The landing: its floor, the walls either side up past the ground, its shopfronts.
    d.kept.push(R.box(t, end, -5, 5, ly - 1.2, ly, MAT.stone));
    d.bores.push({ x0, y0: ly, z0, x1, y1: ly + 40, z1 });
    walls(t, open, ly - 1.2);
    for (const s of [-1, 1]) {
      for (let a = t + 0.6; a < open - 2.4; a += 3.2) {
        d.decor.push(R.box(a, a + 2.6, s * 4.98 - 0.02, s * 4.98 + 0.02, ly + 0.2, ly + 2.5, rand(r) < 0.5 ? MAT.glass : MAT.metal), R.box(a, a + 2.6, s * 4.9 - 0.06, s * 4.9 + 0.06, ly + 2.7, ly + 3.4, MAT.screen));
        if (rand(r) < 0.3) put(d, 'stall', R.pt(a + 1.3, s * 4.2), ly, R.yaw);
      }
    }
    if (k === n) { walk.push({ ...xyz(R.pt(t + 2, 0), ly) }, { ...xyz(R.pt(len, 0), ly) }); break; }
    // Down to the next landing: the stair in the middle, open either side of it to the wall.
    const sy = ly - step, a0 = end, a1 = end + flight;
    walk.push({ ...xyz(R.pt(a0 - 1, 0), ly) });
    stair(...R.rect(a0, a1, -2, 2), sy, ly, R.down, d.kept, d.decor);
    d.kept.push(R.box(a0, a1, -5, -2, sy - 1.2, sy, MAT.stone), R.box(a0, a1, 2, 5, sy - 1.2, sy, MAT.stone));
    const [sx0, sz0, sx1, sz1] = R.rect(a0, a1, -5, 5);
    d.bores.push({ x0: sx0, y0: sy, z0: sz0, x1: sx1, y1: sy + 40, z1: sz1 });
    walls(a0, a1, sy - 1.2);
    walk.push({ ...xyz(R.pt(a1 + 1, 0), sy) });
    t = a1; ly = sy;
  }
  d.hole(...R.rect(0, len - on, -5, 5));
  d.keep(ox0, oz0, ox1, oz1);
  return walk;
}

const xyz = ([x, z]: P2, y: number): V3 => ({ x, y, z });
