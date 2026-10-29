// Streets as meshes along their real lines (M3-54, U-022): no painted ground cells, no cell-stepped edges. A road
// is an asphalt carriageway with a dashed centre line, edge lines, gutters with drains, manhole covers and zebra
// crossings where it meets another road, a kerb and a pavement either side (flush
// with the ground he walks on: only the kerb stands up, a step he walks through); lanes,
// footways and squares are a paved ribbon. Each follows the ground under it (sampled every 2 m), a few centimetres
// up. A kerb, pavement or line that would lie on another street's carriageway is left out, so junctions open
// up. Render only: the ground is the collision. Painted lines ride in the asphalt
// mesh, brightened by their vertex colour; kerbs ride in the paving mesh, so streets cost two draws a chunk.
import * as THREE from 'three';
import { heightAt, type Heightfield } from '../world/heightfield';
import { material, texScale, type Lod } from './materials';
import { MAT } from '../world/mats';
import { CHUNK } from './world-mesh';
import { Buf } from './ground-mesh';
import type { StreetLine } from '../world/world';


const ROAD = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service']);
/** Kerb height and width, pavement width, line paint brightness (vertex colour over the dark asphalt). */
const KERB = 0.12, KERB_W = 0.25, PAVE = 2, PAINT = 7;
const STEP = 2, UP: [number, number, number] = [0, 1, 0];

interface Seg { ax: number; az: number; bx: number; bz: number; half: number; s: StreetLine }

export function buildStreetMeshes(g: Heightfield, streets: StreetLine[], lod: Lod): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  for (const { k, mat, buf } of streetBuffers(g, streets)) {
    const m = buf.mesh(material(mat, true, lod));
    if (!m) continue;
    m.userData.chunk = { x: (Math.floor(k / 65536) + 0.5) * CHUNK, z: ((k % 65536) + 0.5) * CHUNK };
    out.push(m);
  }
  return out;
}

/** The streets' vertices per chunk (key) and material: asphalt or paving. */
export function streetBuffers(g: Heightfield, streets: StreetLine[]): { k: number; mat: number; buf: Buf }[] {
  // Carriageways by 16 m cell, to leave kerbs, pavements and lines off other streets.
  const cells = new Map<number, Seg[]>(), key = (i: number, j: number) => i * 65536 + j;
  for (const s of streets) if (ROAD.has(s.kind) && !s.steps) for (let k = 0; k + 1 < s.pts.length; k++) {
    const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], sg = { ax, az, bx, bz, half: s.w / 2, s };
    for (let i = Math.floor((Math.min(ax, bx) - s.w) / 16); i <= Math.floor((Math.max(ax, bx) + s.w) / 16); i++)
      for (let j = Math.floor((Math.min(az, bz) - s.w) / 16); j <= Math.floor((Math.max(az, bz) + s.w) / 16); j++) {
        const c = cells.get(key(i, j)); if (c) c.push(sg); else cells.set(key(i, j), [sg]);
      }
  }
  const onOther = (x: number, z: number, self: StreetLine) => {
    for (const sg of cells.get(key(Math.floor(x / 16), Math.floor(z / 16))) ?? []) {
      if (sg.s === self) continue;
      const vx = sg.bx - sg.ax, vz = sg.bz - sg.az, t = Math.max(0, Math.min(1, ((x - sg.ax) * vx + (z - sg.az) * vz) / (vx * vx + vz * vz || 1)));
      if (Math.hypot(x - sg.ax - vx * t, z - sg.az - vz * t) < sg.half + 0.3) return true;
    }
    return false;
  };
  // Per chunk: asphalt (carriageway and paint) and paving (pavements, kerbs, walkways).
  const chunks = new Map<number, [Buf, Buf]>();
  const bufAt = (x: number, z: number) => { const k = key(Math.floor(x / CHUNK), Math.floor(z / CHUNK)); let b = chunks.get(k); if (!b) chunks.set(k, (b = [new Buf(), new Buf()])); return b; };
  const asph = 1 / texScale(MAT.asphalt), pave = 1 / texScale(MAT.stone);

  for (const s of streets) {
    if (s.steps || s.pts.length < 2) continue;
    const pts = sample(s.pts), road = ROAD.has(s.kind);
    /** A strip from offset o0 to o1 across the street, lift above the ground, into buffer b; paint brightens. */
    const strip = (o0: number, o1: number, lift: number, b: 0 | 1, colour = 1, keep?: (along: number) => boolean, mine = true) => {
      for (let k = 0; k + 1 < pts.length; k++) {
        const p = pts[k], q = pts[k + 1];
        if (keep && !keep((p.d + q.d) / 2)) continue;
        const mx = (p.x + q.x) / 2 + (p.nx + q.nx) * (o0 + o1) / 4, mz = (p.z + q.z) / 2 + (p.nz + q.nz) * (o0 + o1) / 4;
        if (!mine && onOther(mx, mz, s)) continue;
        const v = [[p, o0], [p, o1], [q, o1], [q, o0]].map(([r, o]) => {
          const pt = r as Pt, x = pt.x + pt.nx * pt.m * (o as number), z = pt.z + pt.nz * pt.m * (o as number), y = heightAt(g, x, z);
          return y === null ? null : [x, y + lift, z];
        });
        if (v.some(c => c === null)) continue;
        const buf = bufAt(mx, mz)[b], sc = b === 0 ? asph : pave;
        // Wound to face up whichever side the offsets run.
        const [a, bb, c, d] = (o1 > o0 ? [v[0], v[1], v[2], v[3]] : [v[0], v[3], v[2], v[1]]) as number[][];
        for (const t of [a, bb, c, a, c, d]) buf.push(t, UP, [t[0] * sc, t[2] * sc], colour);
      }
    };
    /** A kerb's face toward the road, from the asphalt up to the kerb top. */
    const face = (o: number) => {
      for (let k = 0; k + 1 < pts.length; k++) {
        const p = pts[k], q = pts[k + 1], side = Math.sign(o);
        const mx = (p.x + q.x) / 2 + p.nx * o, mz = (p.z + q.z) / 2 + p.nz * o;
        if (onOther(mx, mz, s)) continue;
        const e = [p, q].map(r => { const x = r.x + r.nx * r.m * o, z = r.z + r.nz * r.m * o, y = heightAt(g, x, z); return y === null ? null : [x, y, z]; });
        if (!e[0] || !e[1]) continue;
        const [a, b] = e as number[][], n = [-p.nx * side, 0, -p.nz * side], buf = bufAt(mx, mz)[1];
        const quad = [[a[0], a[1] + 0.03, a[2]], [b[0], b[1] + 0.03, b[2]], [b[0], b[1] + KERB, b[2]], [a[0], a[1] + KERB, a[2]]];
        const order = side > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
        for (const i of order) buf.push(quad[i], n, [(quad[i][0] + quad[i][2]) * pave, quad[i][1] * pave], 0.9);
      }
    };
    if (road) {
      const h = s.w / 2;
      strip(-h, h, 0.03, 0);
      for (const side of [-1, 1]) {
        strip(side * h, side * (h + KERB_W), KERB, 1, 0.95, undefined, false);
        face(side * h);
        strip(side * (h + KERB_W), side * (h + KERB_W + PAVE), 0.04, 1, 1, undefined, false);
        // Edge lines, and a dashed centre line on roads wide enough for two lanes.
        if (s.w >= 5) strip(side * (h - 0.45), side * (h - 0.3), 0.045, 0, PAINT, undefined, false);
      }
      if (s.w >= 5.5) strip(-0.08, 0.08, 0.045, 0, PAINT, d => d % 9 < 4.5, false);
      // Gutters darker along the kerbs, a drain grate in them every 25 m, a manhole cover every 40 m.
      for (const side of [-1, 1]) {
        strip(side * (h - 0.25), side * h, 0.04, 0, 0.7, undefined, false);
        strip(side * (h - 0.25), side * (h - 0.75), 0.042, 0, 0.3, d => d % 25 > 12 && d % 25 < 12.9, false);
      }
      strip(-0.4 - h / 3, 0.4 - h / 3, 0.042, 0, 0.35, d => d % 40 > 20 && d % 40 < 20.8, false);
      // Zebra crossings where it meets another road.
      const total = pts[pts.length - 1].d;
      for (const [end, d0] of [[s.pts[0], 0], [s.pts[s.pts.length - 1], total]] as const) {
        if (!onOther(end[0], end[1], s)) continue;
        const at = d0 === 0 ? 8 : total - 11;
        for (let o = -h + 0.3; o + 0.5 < h; o += 1) strip(o, o + 0.5, 0.045, 0, PAINT, d => d > at && d < at + 3, false);
      }
    } else strip(-s.w / 2, s.w / 2, 0.035, 1, 1.05);
  }
  return [...chunks].flatMap(([k, [a, p]]) => [{ k, mat: MAT.asphalt, buf: a }, { k, mat: MAT.stone, buf: p }]);
}

/** A point along a street: where, how far along, its normal (left of travel) and the miter stretch there. */
interface Pt { x: number; z: number; d: number; nx: number; nz: number; m: number }

/** The line every STEP metres at most, with normals mitred at its bends (stretch capped at 2). */
function sample(line: [number, number][]): Pt[] {
  const n = line.length, segN = (k: number) => { const [ax, az] = line[k], [bx, bz] = line[k + 1], l = Math.hypot(bx - ax, bz - az) || 1; return [-(bz - az) / l, (bx - ax) / l]; };
  const out: Pt[] = [];
  let d = 0;
  for (let k = 0; k + 1 < n; k++) {
    const [ax, az] = line[k], [bx, bz] = line[k + 1], len = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(len / STEP)), [nx, nz] = segN(k);
    for (let i = k === 0 ? 0 : 1; i <= steps; i++) {
      const t = i / steps;
      let px = nx, pz = nz, m = 1;
      // At a bend, the normal halfway between the two segments', stretched so the edges stay parallel.
      if (i === steps && k + 2 < n) {
        const [qx, qz] = segN(k + 1), hx = nx + qx, hz = nz + qz, hl = Math.hypot(hx, hz) || 1;
        px = hx / hl; pz = hz / hl; m = Math.min(2, 1 / Math.max(0.5, px * nx + pz * nz));
      }
      out.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, d: d + len * t, nx: px, nz: pz, m });
    }
    d += len;
  }
  return out;
}
