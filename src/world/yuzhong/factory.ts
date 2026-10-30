// The factory (M3-57b, U-030, D-020): Raffles City's podium at Chaotianmen, where the machines are made. The mall
// under the towers is built out into works: steel-clad halls filling the podium round the towers, terraced down
// the slope to the rivers, each a different height, their ribbon windows lit all night; roof monitors over them
// and stacks with a glowing band and a red beacon at the top. Gates cut into the faces that front the roads glow
// inside, and the columns march out of them along the roads (the convoy paths). Every gate guarded: floodlights
// on masts, searchlights on the roof over it, jersey barriers funnelling the way out, a sentry box (the posts
// the machines' sentries stand at, M4). Laid out square to the podium's fitted rectangle, then turned.
import { solid, turn, carve, type Solid } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand, randInt } from '../../sim/rng';
import { heightAt, type Heightfield } from '../heightfield';
import type { Prop, Feature } from '../world';
import { GEO } from '../geo';
import { PODIUM, ROAD, onGround, streetCells, type Street } from './ground';
import { minRect, points, rasterPoly, type Obb, type P2 } from './shapes';

/** Hall cells (m), the longest and deepest hall in cells, the gap kept from the streets (m). */
const CELL = 8, LONG = 7, DEEP = 5, CLEAR = 3;
/** A gate's width, height and depth into its hall; gates at least this far apart; convoy paths this long. */
const GATE_W = 10, GATE_H = 7, GATE_D = 8, GATE_GAP = 70, CONVOY = 320;

type V3 = { x: number; y: number; z: number };
export interface Gate { x: number; y: number; z: number; nx: number; nz: number }
export interface Factory {
  solids: Solid[]; decor: Solid[]; props: Prop[]; features: Feature[]; gates: Gate[];
  /** from inside each gate out along the roads, at ground level */
  convoys: V3[][];
  /** the samples under its halls */
  under: Uint8Array;
  /** its stand-ins for the far view: the halls, their monitors, the stacks and their glow */
  far: Solid[];
}

/** The towers rise through the podium: their footprints, padded. */
const towers = (): Obb[] => GEO.buildings.filter(b => b[3].endsWith('塔楼')).map(b => { const o = minRect(points(b[4], 0.1)); return { ...o, hw: o.hw + 2, hd: o.hd + 2 }; });
const inObb = (o: Obb, x: number, z: number) => { const c = Math.cos(o.yaw), s = Math.sin(o.yaw), dx = x - o.cx, dz = z - o.cz; return Math.abs(c * dx + s * dz) <= o.hw && Math.abs(-s * dx + c * dz) <= o.hd; };

/** The podium's samples the works cover: inside its outline, clear of the streets round it, of the towers and of
 *  what's kept clear already (metro entrances, tunnels). */
export function podiumMask(g: Heightfield, block: Uint8Array): Uint8Array {
  const m = new Uint8Array(g.y.length), n = Math.ceil(CLEAR / g.cell), ts = towers();
  if (PODIUM.length < 3) return m;
  rasterPoly(PODIUM, 0, 0, g.cell, g.w, g.h, (i0, i1, j) => {
    for (let i = i0; i <= i1; i++) {
      let near = !!block[j * g.w + i] || ts.some(t => inObb(t, i * g.cell, j * g.cell));
      for (let dj = -n; dj <= n && !near; dj++) for (let di = -n; di <= n && !near; di++) {
        const a = i + di, b = j + dj;
        near = a >= 0 && b >= 0 && a < g.w && b < g.h && di * di + dj * dj <= n * n && streetCells[b * g.w + a] !== 0;
      }
      if (!near) m[j * g.w + i] = 1;
    }
  });
  return m;
}

export function buildFactory(g: Heightfield, mask: Uint8Array, sts: Street[]): Factory | null {
  if (PODIUM.length < 3) return null;
  const f: Factory = { solids: [], decor: [], props: [], features: [], gates: [], convoys: [], under: new Uint8Array(g.y.length), far: [] };
  const o = minRect(PODIUM), c = Math.cos(o.yaw), s = Math.sin(o.yaw), r = makeRng(hashString('factory'));
  /** Local (unturned about the podium's middle) to the map. */
  const P = (x: number, z: number): P2 => [o.cx + c * (x - o.cx) - s * (z - o.cz), o.cz + s * (x - o.cx) + c * (z - o.cz)];
  const sample = (x: number, z: number) => { const [wx, wz] = P(x, z), i = Math.round(wx / g.cell), j = Math.round(wz / g.cell); return i < 0 || j < 0 || i >= g.w || j >= g.h ? -1 : j * g.w + i; };
  const covered = (x: number, z: number) => { const k = sample(x, z); return k >= 0 && mask[k] === 1; };
  const yAt = (x: number, z: number) => { const k = sample(x, z); return k < 0 ? 0 : g.y[k]; };

  // Cells wholly on the podium.
  const ni = Math.floor((2 * o.hw) / CELL), nj = Math.floor((2 * o.hd) / CELL), X0 = o.cx - o.hw, Z0 = o.cz - o.hd;
  const ok = new Uint8Array(ni * nj);
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
    const x = X0 + i * CELL, z = Z0 + j * CELL;
    let all = true;
    for (let a = 0; a <= 2 && all; a++) for (let b = 0; b <= 2 && all; b++) all = covered(x + (a * CELL) / 2, z + (b * CELL) / 2);
    ok[j * ni + i] = all ? 1 : 0;
  }
  // Halls: runs of cells along the podium, as deep as the rows under them allow.
  const used = new Uint8Array(ni * nj), halls: { x0: number; z0: number; x1: number; z1: number }[] = [];
  const free = (i: number, j: number) => i < ni && j < nj && ok[j * ni + i] === 1 && !used[j * ni + i];
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
    if (!free(i, j)) continue;
    const long = 3 + randInt(r, LONG - 2), deep = 2 + randInt(r, DEEP - 1);
    let len = 1, d = 1;
    while (len < long && free(i + len, j)) len++;
    while (d < deep && Array.from({ length: len }, (_, k) => free(i + k, j + d)).every(Boolean)) d++;
    for (let b = 0; b < d; b++) for (let a = 0; a < len; a++) used[(j + b) * ni + i + a] = 1;
    halls.push({ x0: X0 + i * CELL, z0: Z0 + j * CELL, x1: X0 + (i + len) * CELL, z1: Z0 + (j + d) * CELL });
  }

  // Faces: 0 -z, 1 +z, 2 -x, 3 +x (local). A box on a face: along it u0..u1, out of it d0..d1 (into the hall < 0).
  const N: P2[] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  type Hall = (typeof halls)[number];
  const edge = (h: Hall, k: number) => [h.z0, h.z1, h.x0, h.x1][k];
  const onFace = (h: Hall, k: number, u: number, d: number): P2 => (N[k][1] ? [u, edge(h, k) + N[k][1] * d] : [edge(h, k) + N[k][0] * d, u]);
  const box = (h: Hall, k: number, u0: number, u1: number, d0: number, d1: number, y0: number, y1: number, mat: number) => {
    const [ax, az] = onFace(h, k, u0, d0), [bx, bz] = onFace(h, k, u1, d1);
    return solid(Math.min(ax, bx), y0, Math.min(az, bz), Math.max(ax, bx), y1, Math.max(az, bz), mat);
  };
  const span = (h: Hall, k: number): [number, number] => (N[k][1] ? [h.x0, h.x1] : [h.z0, h.z1]);
  const world = (p: P2, y: number): V3 => { const [x, z] = P(p[0], p[1]); return { x, y, z }; };
  const wn = (k: number) => ({ nx: c * N[k][0] - s * N[k][1], nz: s * N[k][0] + c * N[k][1] });

  // Gates where a hall's face fronts a road: the road's level just out from the middle of the face.
  const cands: { h: Hall; k: number; u: number; y: number; out: number; len: number }[] = [];
  for (const h of halls) for (let k = 0; k < 4; k++) {
    const [a, b] = span(h, k), u = (a + b) / 2;
    if (b - a < GATE_W + 14) continue;
    for (let d = 4; d <= 32; d += 2) {
      const ks = sample(...onFace(h, k, u, d));
      const [px, pz] = onFace(h, k, u, d);
      if (halls.some(q => px > q.x0 && px < q.x1 && pz > q.z0 && pz < q.z1)) break;
      if (ks >= 0 && streetCells[ks] === 1) { cands.push({ h, k, u, y: g.y[ks], out: d, len: b - a }); break; }
    }
  }
  const gates: typeof cands = [];
  for (const q of cands.sort((a, b) => b.len - a.len)) {
    const [x, z] = onFace(q.h, q.k, q.u, 0);
    if (gates.length < 5 && !gates.some(p => q.h === p.h || Math.hypot(...(onFace(p.h, p.k, p.u, 0).map((v, i) => v - [x, z][i]) as P2)) < GATE_GAP)) gates.push(q);
  }

  const local: Solid[] = [], decor: Solid[] = [], far: Solid[] = [];
  for (const h of halls) {
    let lo = Infinity, hi = -Infinity;
    for (let x = h.x0; x <= h.x1; x += 2) for (let z = h.z0; z <= h.z1; z += 2) { const y = yAt(x, z); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    const gate = gates.find(q => q.h === h);
    // Terraced: each roof a storey or more over the highest ground under it, in 4 m steps.
    let base = lo - 1, roof = Math.ceil((hi + 12 + randInt(r, 4) * 4) / 4) * 4;
    if (gate) { base = Math.min(base, gate.y - 1); roof = Math.max(roof, Math.ceil((gate.y + GATE_H + 6) / 4) * 4); }
    let own: Solid[] = [solid(h.x0, base, h.z0, h.x1, roof, h.z1, MAT.facadeWorks)];
    far.push(own[0]);
    if (gate) {
      const { k, u, y } = gate;
      own = carve(own, box(h, k, u - GATE_W / 2, u + GATE_W / 2, -GATE_D, 0.01, y, y + GATE_H, 0));
      // The light inside, a shutter rolled up over the opening.
      decor.push(box(h, k, u - GATE_W / 2, u + GATE_W / 2, -GATE_D, -GATE_D + 0.05, y, y + GATE_H, MAT.glare));
      decor.push(box(h, k, u - GATE_W / 2 - 0.2, u + GATE_W / 2 + 0.2, -0.6, 0.15, y + GATE_H - 0.9, y + GATE_H + 0.3, MAT.metal));
    }
    local.push(...own);
    // A parapet round the roof.
    for (const [x0, z0, x1, z1] of [[h.x0, h.z0, h.x1, h.z0 + 0.3], [h.x0, h.z1 - 0.3, h.x1, h.z1], [h.x0, h.z0, h.x0 + 0.3, h.z1], [h.x1 - 0.3, h.z0, h.x1, h.z1]]) local.push(solid(x0, roof, z0, x1, roof + 1.1, z1, MAT.concrete));
    // Roof monitors along the hall, lit like its walls; a stack now and then; vents.
    const alongX = h.x1 - h.x0 >= h.z1 - h.z0, deep = alongX ? h.z1 - h.z0 : h.x1 - h.x0;
    for (const t of deep >= 24 ? [1 / 3, 2 / 3] : [0.5]) {
      const z = h.z0 + (h.z1 - h.z0) * t, x = h.x0 + (h.x1 - h.x0) * t;
      local.push(alongX ? solid(h.x0 + 3, roof, z - 1.5, h.x1 - 3, roof + 2.6, z + 1.5, MAT.facadeWorks) : solid(x - 1.5, roof, h.z0 + 3, x + 1.5, roof + 2.6, h.z1 - 3, MAT.facadeWorks));
      far.push(local[local.length - 1]);
    }
    if (rand(r) < 0.3) {
      const x = h.x0 + 3 + rand(r) * (h.x1 - h.x0 - 6), z = h.z0 + 3 + rand(r) * (h.z1 - h.z0 - 6), top = roof + 16 + rand(r) * 14;
      local.push(solid(x - 1.2, roof, z - 1.2, x + 1.2, top, z + 1.2, MAT.metal));
      decor.push(solid(x - 1.26, top - 1.6, z - 1.26, x + 1.26, top - 0.9, z + 1.26, MAT.glare));
      far.push(local[local.length - 1], decor[decor.length - 1]);
      const [bx, bz] = P(x, z);
      f.props.push({ kind: 'beacon', x: bx, y: top, z: bz, yaw: 0 });
    }
    for (let v = 0; v < 2; v++) {
      const x = h.x0 + 2 + rand(r) * (h.x1 - h.x0 - 4), z = h.z0 + 2 + rand(r) * (h.z1 - h.z0 - 4);
      if (local.some(q => q.y0 >= roof - 0.01 && q.y0 <= roof + 0.01 && x + 1 > q.x0 && x - 1 < q.x1 && z + 1 > q.z0 && z - 1 < q.z1 && q.mat !== MAT.concrete)) continue;
      local.push(solid(x - 1, roof, z - 1, x + 1, roof + 1.5, z + 1, MAT.metal));
    }
    if (!gate) continue;
    // The gate: its apron levelled to the road, barriers funnelling the way out, floodlights, a sentry box,
    // searchlights on the roof over it.
    const { k, u, y, out } = gate, n = wn(k), face = (uu: number, d: number, yy: number) => world(onFace(h, k, uu, d), yy);
    for (let uu = u - 12; uu <= u + 12; uu += 1) for (let d = 0.5; d < out; d += 1) {
      const ks = sample(...onFace(h, k, uu, d));
      if (ks >= 0 && streetCells[ks] === 0) g.y[ks] = y;
    }
    const yaw = Math.atan2(n.nx, n.nz), mouth = face(u, 0, y);
    for (const side of [-1, 1]) {
      for (const d of [1.5, 3.6]) { const p = face(u + side * 6, d, y); f.props.push({ kind: 'jersey', x: p.x, y, z: p.z, yaw }); }
      const m = onFace(h, k, u + side * 7.4, 0.8), top = face(u + side * 7.4, 0.8, y + 11), aim = face(u, 4, y);
      local.push(solid(m[0] - 0.15, y, m[1] - 0.15, m[0] + 0.15, y + 11, m[1] + 0.15, MAT.metal));
      decor.push(solid(m[0] - 0.6, y + 11, m[1] - 0.6, m[0] + 0.6, y + 11.5, m[1] + 0.6, MAT.glare));
      f.props.push({ kind: 'floodlight', x: top.x, y: top.y, z: top.z, yaw: Math.atan2(aim.x - top.x, aim.z - top.z) });
    }
    // A searchlight on the roof over the gate, sweeping the road.
    const sl = face(u - 4, -1, roof + 1.1);
    f.props.push({ kind: 'searchlight', x: sl.x, y: sl.y, z: sl.z, yaw, d: 70 });
    f.features.push({ kind: 'post', x: sl.x, y: roof, z: sl.z, group: f.gates.length, nx: n.nx, nz: n.nz });
    local.push(box(h, k, u + 9, u + 11.6, 1.2, 3.8, y, y + 2.7, MAT.concrete), box(h, k, u + 8.8, u + 11.8, 1.0, 4.0, y + 2.7, y + 2.9, MAT.concrete));
    decor.push(box(h, k, u + 9.3, u + 11.3, 3.8, 3.82, y + 1.3, y + 2.1, MAT.glare));
    const post = face(u + 10.3, 4.6, y);
    f.features.push({ kind: 'post', x: post.x, y, z: post.z, group: f.gates.length, nx: n.nx, nz: n.nz });
    f.features.push({ kind: 'gate', x: mouth.x, y, z: mouth.z, group: f.gates.length, nx: n.nx, nz: n.nz });
    f.gates.push({ x: mouth.x, y, z: mouth.z, nx: n.nx, nz: n.nz });
    const road = face(u, out, y);
    f.convoys.push(convoy(g, sts, [face(u, -GATE_D + 1, y), mouth, road], o));
  }
  for (const h of halls) rasterPoly([P(h.x0, h.z0), P(h.x1, h.z0), P(h.x1, h.z1), P(h.x0, h.z1)], 0, 0, g.cell, g.w, g.h, (i0, i1, j) => f.under.fill(1, j * g.w + i0, j * g.w + i1 + 1));
  f.solids = turn(local, o.yaw, o.cx, o.cz);
  f.decor = turn(decor, o.yaw, o.cx, o.cz);
  f.far = turn(far, o.yaw, o.cx, o.cz);
  return f;
}

/** From inside a gate out onto the road it fronts, then along the roads (through the junctions, as straight on
 *  as they go) away from the factory, CONVOY metres, every 4 m at ground level. */
function convoy(g: Heightfield, sts: Street[], start: V3[], o: Obb): V3[] {
  const roads = sts.filter(st => ROAD.has(st.kind) && onGround(st) && st.pts.length > 1), from = start[start.length - 1];
  let best = { d: Infinity, s: 0, i: 0, x: 0, z: 0 };
  roads.forEach((st, si) => {
    for (let i = 0; i + 1 < st.pts.length; i++) {
      const [ax, az] = st.pts[i], [bx, bz] = st.pts[i + 1], l2 = (bx - ax) ** 2 + (bz - az) ** 2 || 1;
      const t = Math.max(0, Math.min(1, ((from.x - ax) * (bx - ax) + (from.z - az) * (bz - az)) / l2)), x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const d = Math.hypot(x - from.x, z - from.z);
      if (d < best.d) best = { d, s: si, i, x, z };
    }
  });
  /** Walk on from point i of road s toward step (+1 or -1) for `left` metres. */
  const walk = (dir: 1 | -1): P2[] => {
    const out: P2[] = [[best.x, best.z]];
    let s = best.s, i = dir > 0 ? best.i + 1 : best.i, left = CONVOY * 2;
    for (let hops = 0; hops < 12 && left > 0; hops++) {
      const pts = roads[s].pts;
      for (; i >= 0 && i < pts.length && left > 0; i += dir) {
        const [px, pz] = out[out.length - 1];
        left -= Math.hypot(pts[i][0] - px, pts[i][1] - pz);
        out.push(pts[i]);
      }
      // At its end, on along whichever road from there turns least.
      const [ex, ez] = out[out.length - 1], [qx, qz] = out[out.length - 2] ?? out[0], hx = ex - qx, hz = ez - qz, hl = Math.hypot(hx, hz) || 1;
      let next: { s: number; i: number; dir: 1 | -1; bend: number } | null = null;
      roads.forEach((st, si) => {
        if (si === s) return;
        st.pts.forEach(([x, z], vi) => {
          if (Math.hypot(x - ex, z - ez) > 3) return;
          for (const d of [1, -1] as const) {
            const nb = st.pts[vi + d];
            if (!nb) continue;
            const dx = nb[0] - x, dz = nb[1] - z, bend = Math.acos(Math.max(-1, Math.min(1, (dx * hx + dz * hz) / ((Math.hypot(dx, dz) || 1) * hl))));
            if (bend < 1.75 && (!next || bend < next.bend)) next = { s: si, i: vi + d, dir: d, bend };
          }
        });
      });
      if (!next) break;
      ({ s, i, dir } = next as { s: number; i: number; dir: 1 | -1 });
    }
    // Not up a dead end and back: where it comes back past itself, the loop between is cut out; then CONVOY long.
    for (let a = 0; a < out.length; a++) {
      let run = 0;
      for (let b = a + 1; b < out.length; b++) {
        run += Math.hypot(out[b][0] - out[b - 1][0], out[b][1] - out[b - 1][1]);
        if (run > 40 && Math.hypot(out[b][0] - out[a][0], out[b][1] - out[a][1]) < 8) { out.splice(a + 1, b - a - 1); break; }
      }
    }
    for (let k = 1, run = 0; k < out.length; k++) {
      run += Math.hypot(out[k][0] - out[k - 1][0], out[k][1] - out[k - 1][1]);
      if (run > CONVOY) { out.length = k + 1; break; }
    }
    return out;
  };
  const ways = [walk(1), walk(-1)], far = (w: P2[]) => Math.hypot(w[w.length - 1][0] - o.cx, w[w.length - 1][1] - o.cz);
  const way = far(ways[0]) >= far(ways[1]) ? ways[0] : ways[1];
  const path = start.slice();
  for (const [x, z] of way) {
    const p = path[path.length - 1], n = Math.ceil(Math.hypot(x - p.x, z - p.z) / 4);
    for (let k = 1; k <= n; k++) { const xx = p.x + ((x - p.x) * k) / n, zz = p.z + ((z - p.z) * k) / n; path.push({ x: xx, y: heightAt(g, xx, zz) ?? p.y, z: zz }); }
  }
  return path;
}
