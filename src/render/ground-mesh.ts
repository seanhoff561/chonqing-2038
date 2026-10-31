// Heightfield ground meshes (M3-41a, D-016): one mesh per chunk and surface, the same triangles the collision
// uses, smooth normals from the heights. Gentle slopes are paved ground, or grass or rubble where the marks put
// it (M3-56b, M3-56c); faces steeper than about 50 degrees are retaining walls, grassed banks or rubble slopes. The far view gets one
// coarse mesh at an eighth of the resolution.
import * as THREE from 'three';
import type { Heightfield } from '../world/heightfield';
import { material, groundMaterial, texScale, type Lod } from './materials';
import { MAT } from '../world/mats';
import { CHUNK } from './world-mesh';
import { grassAt, markAt, MARK, type Marks } from '../world/yuzhong/marks';

const STEEP = 0.62;

/** Ground meshes for the near view (or the whole world when lod is 'all'), chunked for culling. */
export function buildGroundMeshes(g: Heightfield, lod: Lod, marks?: Marks, chunk = CHUNK): THREE.Mesh[] {
  const out: THREE.Mesh[] = [], per = Math.max(1, Math.round(chunk / g.cell));
  for (let cj = 0; cj < g.h - 1; cj += per) for (let ci = 0; ci < g.w - 1; ci += per) {
    const m = surface(g, ci, cj, Math.min(ci + per, g.w - 1), Math.min(cj + per, g.h - 1), 1, lod, marks);
    for (const mesh of m) { mesh.userData.chunk = { x: g.x0 + (ci + per / 2) * g.cell, z: g.z0 + (cj + per / 2) * g.cell }; out.push(mesh); }
  }
  return out;
}

/** The far ground's resolution: every this many samples. */
export const FAR_K = 8;
/** One coarse mesh of the whole field for the far view (detail cut inside the near radius). */
export const buildFarGround = (g: Heightfield, marks?: Marks) => surface(g, 0, 0, g.w - 1, g.h - 1, FAR_K, 'far', marks);
/** The field as the far ground draws it (every FAR_K-th sample), for what lies on it far off (M3-64). */
export function coarseField(g: Heightfield): Heightfield {
  const w = Math.floor((g.w - 1) / FAR_K) + 1, h = Math.floor((g.h - 1) / FAR_K) + 1, y = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) y[j * w + i] = g.y[j * FAR_K * g.w + i * FAR_K];
  return { x0: g.x0, z0: g.z0, cell: g.cell * FAR_K, w, h, y, hole: new Uint8Array((w - 1) * (h - 1)), thick: g.thick };
}

function surface(g: Heightfield, i0: number, j0: number, i1: number, j1: number, k: number, lod: Lod, marks?: Marks): THREE.Mesh[] {
  const W = g.w, Y = g.y;
  const at = (i: number, j: number) => Y[Math.min(j, g.h - 1) * W + Math.min(i, W - 1)];
  const nrm = (i: number, j: number): [number, number, number] => {
    const sx = (at(i + k, j) - at(Math.max(0, i - k), j)) / ((Math.min(i + k, W - 1) - Math.max(0, i - k)) * g.cell || 1);
    const sz = (at(i, j + k) - at(i, Math.max(0, j - k))) / ((Math.min(j + k, g.h - 1) - Math.max(0, j - k)) * g.cell || 1);
    const l = Math.hypot(sx, 1, sz);
    return [-sx / l, 1 / l, -sz / l];
  };
  // The level faces share one grid of vertices (M3-53: a sixth of the vertices of separate triangles), indexed.
  // Retaining walls, textured on their own planes, keep vertices of their own.
  const cols = Math.ceil((i1 - i0) / k) + 1, rows = Math.ceil((j1 - j0) / k) + 1, n = cols * rows;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3), grass = new Float32Array(n), rubble = new Float32Array(n);
  // How much grass (M3-56b) or rubble (M3-56c) each vertex stands in: the share of four points a metre round it.
  const green = (x: number, z: number) => (marks ? grassAt(marks, x, z) : false), ruin = (x: number, z: number) => (marks ? markAt(marks, x, z) === MARK.ruin : false);
  const share = (f: (x: number, z: number) => boolean, x: number, z: number) => ((f(x - 1, z - 1) ? 1 : 0) + (f(x + 1, z - 1) ? 1 : 0) + (f(x - 1, z + 1) ? 1 : 0) + (f(x + 1, z + 1) ? 1 : 0)) / 4;
  const flat = 1 / texScale(MAT.concrete), wall = 1 / texScale(MAT.stone);
  const gi = (c: number) => Math.min(i0 + c * k, W - 1), gj = (r: number) => Math.min(j0 + r * k, g.h - 1);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = r * cols + c, i = gi(c), j = gj(r), x = g.x0 + i * g.cell, z = g.z0 + j * g.cell, [nx, ny, nz] = nrm(i, j), sh = shade(x, z);
    pos.set([x, at(i, j), z], v * 3); nor.set([nx, ny, nz], v * 3); uv.set([x * flat, z * flat], v * 2); col.set([sh, sh, sh], v * 3);
    grass[v] = share(green, x, z); rubble[v] = share(ruin, x, z);
  }
  const flatIdx: number[] = [], steepBuf = new Buf(), bankBuf = new Buf(), rubbleBuf = new Buf();
  for (let r = 0; r + 1 < rows; r++) for (let c = 0; c + 1 < cols; c++) {
    const i = gi(c), j = gj(r);
    if (k === 1 && g.hole[j * (W - 1) + i]) continue;
    const v00 = r * cols + c, v10 = v00 + 1, v01 = v00 + cols, v11 = v01 + 1;
    for (const tri of [[v00, v11, v10], [v00, v01, v11]]) {
      const [a, b, cc] = tri.map(v => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = cc[0] - a[0], vy = cc[1] - a[1], vz = cc[2] - a[2];
      const ny = (uz * vx - ux * vz) / (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) || 1);
      if (ny < STEEP) {
        const fx = Math.abs(uy * vz - uz * vy) > Math.abs(ux * vy - uy * vx), mx = (a[0] + b[0] + cc[0]) / 3, mz = (a[2] + b[2] + cc[2]) / 3;
        for (const v of tri) (ruin(mx, mz) ? rubbleBuf : green(mx, mz) ? bankBuf : steepBuf).push([pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], [nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]], [(fx ? pos[v * 3 + 2] : pos[v * 3]) * wall, pos[v * 3 + 1] * wall], col[v * 3]);
        continue;
      }
      // Streets are meshes of their own along their lines (M3-54); the ground under them is plain.
      flatIdx.push(...tri);
    }
  }
  const out: THREE.Mesh[] = [];
  if (flatIdx.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('grass', new THREE.BufferAttribute(grass, 1)); geo.setAttribute('rubble', new THREE.BufferAttribute(rubble, 1));
    geo.setIndex(new THREE.BufferAttribute(n > 65535 ? new Uint32Array(flatIdx) : new Uint16Array(flatIdx), 1));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, groundMaterial(lod));
    m.receiveShadow = true;
    out.push(m);
  }
  for (const [buf, mat] of [[steepBuf, MAT.stone], [bankBuf, MAT.grass], [rubbleBuf, MAT.rubble]] as const) { const m = buf.mesh(material(mat, true, lod)); if (m) out.push(m); }
  return out;
}

/** A little variation in the ground's tone, stable per place. */
function shade(x: number, z: number): number {
  const h = Math.sin(x * 0.071 + z * 0.113) * Math.sin(x * 0.037 - z * 0.059);
  return 0.82 + 0.12 * h;
}

export class Buf {
  pos: number[] = []; nor: number[] = []; uv: number[] = []; col: number[] = [];
  push(p: number[], n: number[], u: number[], c: number) {
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0] / l, n[1] / l, n[2] / l); this.uv.push(u[0], u[1]); this.col.push(c, c, c);
  }
  mesh(mat: THREE.Material): THREE.Mesh | null {
    if (!this.pos.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    return m;
  }
}
