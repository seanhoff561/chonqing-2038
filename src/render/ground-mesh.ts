// Heightfield ground meshes (M3-41a, D-016): one mesh per chunk and surface, the same triangles the collision
// uses, smooth normals from the heights. Gentle slopes are paved ground; faces steeper than about 50 degrees are
// retaining walls. The far view gets one coarse mesh at an eighth of the resolution.
import * as THREE from 'three';
import type { Heightfield } from '../world/heightfield';
import { material, texScale, type Lod } from './materials';
import { MAT } from '../world/mats';
import { CHUNK } from './world-mesh';

const STEEP = 0.62;

/** Ground meshes for the near view (or the whole world when lod is 'all'), chunked for culling. */
export function buildGroundMeshes(g: Heightfield, lod: Lod, chunk = CHUNK): THREE.Mesh[] {
  const out: THREE.Mesh[] = [], per = Math.max(1, Math.round(chunk / g.cell));
  for (let cj = 0; cj < g.h - 1; cj += per) for (let ci = 0; ci < g.w - 1; ci += per) {
    const m = surface(g, ci, cj, Math.min(ci + per, g.w - 1), Math.min(cj + per, g.h - 1), 1, lod);
    for (const mesh of m) { mesh.userData.chunk = { x: g.x0 + (ci + per / 2) * g.cell, z: g.z0 + (cj + per / 2) * g.cell }; out.push(mesh); }
  }
  return out;
}

/** One coarse mesh of the whole field for the far view (detail cut inside the near radius). */
export const buildFarGround = (g: Heightfield) => surface(g, 0, 0, g.w - 1, g.h - 1, 8, 'far');

function surface(g: Heightfield, i0: number, j0: number, i1: number, j1: number, k: number, lod: Lod): THREE.Mesh[] {
  const W = g.w, Y = g.y;
  const at = (i: number, j: number) => Y[Math.min(j, g.h - 1) * W + Math.min(i, W - 1)];
  const nrm = (i: number, j: number): [number, number, number] => {
    const sx = (at(i + k, j) - at(Math.max(0, i - k), j)) / ((Math.min(i + k, W - 1) - Math.max(0, i - k)) * g.cell || 1);
    const sz = (at(i, j + k) - at(i, Math.max(0, j - k))) / ((Math.min(j + k, g.h - 1) - Math.max(0, j - k)) * g.cell || 1);
    const l = Math.hypot(sx, 1, sz);
    return [-sx / l, 1 / l, -sz / l];
  };
  const bufs = [new Buf(), new Buf()];
  const flat = 1 / texScale(MAT.concrete), wall = 1 / texScale(MAT.stone);
  for (let j = j0; j < j1; j += k) for (let i = i0; i < i1; i += k) {
    const ie = Math.min(i + k, W - 1), je = Math.min(j + k, g.h - 1);
    if (k === 1 && g.hole[j * (W - 1) + i]) continue;
    const p = (a: number, b: number): [number, number, number] => [g.x0 + a * g.cell, at(a, b), g.z0 + b * g.cell];
    for (const tri of [[p(i, j), p(ie, je), p(ie, j)], [p(i, j), p(i, je), p(ie, je)]]) {
      const [a, b, c] = tri;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const ny = (uz * vx - ux * vz) / (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) || 1);
      const steep = ny < STEEP, o = bufs[steep ? 1 : 0];
      const fx = Math.abs(uy * vz - uz * vy) > Math.abs(ux * vy - uy * vx);
      for (const v of tri) {
        const [nx, nyy, nz] = nrm(Math.round((v[0] - g.x0) / g.cell), Math.round((v[2] - g.z0) / g.cell));
        o.push(v, [nx, nyy, nz], steep ? [(fx ? v[2] : v[0]) * wall, v[1] * wall] : [v[0] * flat, v[2] * flat], shade(v[0], v[2]));
      }
    }
  }
  return bufs.map((b, s) => b.mesh(material(s ? MAT.stone : MAT.concrete, true, lod))).filter((m): m is THREE.Mesh => !!m);
}

/** A little variation in the ground's tone, stable per place. */
function shade(x: number, z: number): number {
  const h = Math.sin(x * 0.071 + z * 0.113) * Math.sin(x * 0.037 - z * 0.059);
  return 0.82 + 0.12 * h;
}

class Buf {
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
