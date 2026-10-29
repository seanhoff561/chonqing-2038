// Merges world solids into one mesh per material per 64 m chunk (M3-10). UVs are world-scale; facade materials
// anchor theirs to each building's corner (shifted by whole bays and floors) so windows sit on its floors.
// Vertex colours tint each building a little differently and darken walls toward the ground.
import * as THREE from 'three';
import { topAt, raycast, type Solid, type SolidIndex } from '../world/geom';
import { material, texScale, isFacade, FACADE_BAY, type Lod } from './materials';
import { MAT } from '../world/mats';

export const CHUNK = 64;
/** Per-chunk shadow casters live on a layer of their own that only the shadow pass's eye sees (View.render). */
export const CASTER_LAYER = 1;
const CASTER = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, colorWrite: false, depthWrite: false });
const OPEN = [1, 1, 1, 1];
/** Baked occlusion: a wall facing another within AO_R metres darkens, down to AO_MIN when touching. */
const AO_R = 6, AO_MIN = 0.62;

/** Preallocated vertex arrays filled from n on. */
interface Buf { pos: Float32Array; nor: Float32Array; uv: Float32Array; col: Float32Array; n: number }

/** 0..1 from a solid's corner, stable across builds. */
function hash(a: number, b: number, c: number): number {
  let h = Math.imul(Math.round(a * 10) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(Math.round(b * 10) + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 7, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** Faces go to b; a facade's roof and underside go to roof (plain concrete) instead. */
/** ao: occlusion for the +z, -z, +x and -x walls (1 open, lower in a narrow alley). */
export function pushSolid(s: Solid, b: Buf, roof: Buf = b, ao: number[] = OPEN) {
  if (s.rot) {
    // A turned solid (M3-40): build it unturned, then turn the vertices it wrote.
    const r = s.rot, bufs = roof === b ? [b] : [b, roof], from = bufs.map(o => o.n);
    pushSolid({ ...s, x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, rot: undefined }, b, roof, OPEN);
    bufs.forEach((o, k) => {
      for (let v = from[k]; v < o.n; v++) {
        const dx = o.pos[v * 3] - r.px, dz = o.pos[v * 3 + 2] - r.pz, nx = o.nor[v * 3], nz = o.nor[v * 3 + 2];
        o.pos[v * 3] = r.px + r.c * dx - r.s * dz; o.pos[v * 3 + 2] = r.pz + r.s * dx + r.c * dz;
        o.nor[v * 3] = r.c * nx - r.s * nz; o.nor[v * 3 + 2] = r.s * nx + r.c * nz;
      }
    });
    return;
  }
  const sc = 1 / texScale(s.mat), facade = isFacade(s.mat), rsc = facade ? 1 / texScale(MAT.concrete) : sc;
  const h = hash(s.x0, s.z0, s.mat), h2 = hash(s.z1, s.x1, s.mat + 31);
  const bay = FACADE_BAY;
  const ou = facade ? Math.floor(h * 4) * bay : 0, ov = facade ? Math.floor(h2 * 4) * bay : 0;
  // Per-building tint: brightness and a slight warm or cool cast.
  const tone = 0.86 + h * 0.2, warm = (h2 - 0.5) * 0.08;
  const tall = s.y1 - s.y0 > 2.5;
  const yt = (x: number, z: number) => (s.ramp ? topAt(s, x, z) : s.y1);
  const colour = (o: Buf, y: number, side: boolean, shade: number) => {
    // Grime: walls darken over their bottom 4 m, and rain runs dirt down from the roof edge.
    const g = side && tall ? (0.72 + 0.28 * Math.min(1, (y - s.y0) / 4)) * (1 - 0.18 * Math.max(0, 1 - (s.y1 - y) / 1.5)) : 1;
    const k = tone * g * shade;
    o.col[o.n * 3] = k * (1 + warm); o.col[o.n * 3 + 1] = k; o.col[o.n * 3 + 2] = k * (1 - warm);
  };
  const quad = (pts: number[][], n: number[], uvs: number[][], side: boolean, shade = 1) => {
    const o = side ? b : roof, k = side ? sc : rsc;
    for (const i of [0, 1, 2, 0, 2, 3]) {
      const p = pts[i];
      const v = o.n;
      o.pos[v * 3] = p[0]; o.pos[v * 3 + 1] = p[1]; o.pos[v * 3 + 2] = p[2];
      o.nor[v * 3] = n[0]; o.nor[v * 3 + 1] = n[1]; o.nor[v * 3 + 2] = n[2];
      o.uv[v * 2] = uvs[i][0] * k; o.uv[v * 2 + 1] = uvs[i][1] * k;
      colour(o, p[1], side, shade);
      o.n++;
    }
  };
  const { x0, y0, z0, x1, z1 } = s;
  const h00 = yt(x0, z0), h10 = yt(x1, z0), h11 = yt(x1, z1), h01 = yt(x0, z1);
  // top (sloped for ramps)
  let n = [0, 1, 0];
  if (s.ramp) {
    const ex = [x1 - x0, h10 - h00, 0], ez = [0, h01 - h00, z1 - z0];
    n = [ez[1] * ex[2] - ez[2] * ex[1], ez[2] * ex[0] - ez[0] * ex[2], ez[0] * ex[1] - ez[1] * ex[0]];
    const l = Math.hypot(n[0], n[1], n[2]); n = n.map(v => v / l);
  }
  // Flat roofs of painted blocks are old, wet and dark.
  quad([[x0, h01, z1], [x1, h11, z1], [x1, h10, z0], [x0, h00, z0]], n, [[x0, z1], [x1, z1], [x1, z0], [x0, z0]], false, facade ? 0.72 : 1);
  quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], false, 0.7);
  // Sides: u runs left to right as seen from outside; facades count from the building's corner.
  // Whole bays across each wall, so no window is cut at a corner.
  const fit = (len: number) => (Math.max(1, Math.round(len / bay)) * bay) / len;
  const kx = fit(s.x1 - s.x0), kz = fit(s.z1 - s.z0);
  const U = (w: number, from: number, back: boolean, k: number) => (facade ? (back ? from - w : w - from) * k + ou : back ? -w : w);
  const V = (y: number) => (facade ? y - y0 + ov : y);
  quad([[x0, y0, z1], [x1, y0, z1], [x1, h11, z1], [x0, h01, z1]], [0, 0, 1],
    [[U(x0, x0, false, kx), V(y0)], [U(x1, x0, false, kx), V(y0)], [U(x1, x0, false, kx), V(h11)], [U(x0, x0, false, kx), V(h01)]], true, ao[0]);
  quad([[x1, y0, z0], [x0, y0, z0], [x0, h00, z0], [x1, h10, z0]], [0, 0, -1],
    [[U(x1, x1, true, kx), V(y0)], [U(x0, x1, true, kx), V(y0)], [U(x0, x1, true, kx), V(h00)], [U(x1, x1, true, kx), V(h10)]], true, ao[1]);
  quad([[x1, y0, z1], [x1, y0, z0], [x1, h10, z0], [x1, h11, z1]], [1, 0, 0],
    [[U(z1, z1, true, kz), V(y0)], [U(z0, z1, true, kz), V(y0)], [U(z0, z1, true, kz), V(h10)], [U(z1, z1, true, kz), V(h11)]], true, ao[2]);
  quad([[x0, y0, z0], [x0, y0, z1], [x0, h01, z1], [x0, h00, z0]], [-1, 0, 0],
    [[U(z0, z0, false, kz), V(y0)], [U(z1, z0, false, kz), V(y0)], [U(z1, z0, false, kz), V(h01)], [U(z0, z0, false, kz), V(h00)]], true, ao[3]);
}

/** Chunk meshes, each tagged with its chunk centre for distance culling. */
/** How shut in each wall of a tall solid is: one short ray out from each face, low down. */
function occlusion(s: Solid, idx: SolidIndex): number[] {
  if (s.rot) return OPEN;
  if (s.y1 - s.y0 < 2.5 || s.mat === MAT.glass) return OPEN;
  const y = Math.min(s.y0 + 1.5, (s.y0 + s.y1) / 2), cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
  const ray = (ox: number, oz: number, dx: number, dz: number) => {
    const h = raycast(idx, ox, y, oz, dx, 0, dz, AO_R);
    return h ? AO_MIN + (1 - AO_MIN) * (h.t / AO_R) : 1;
  };
  return [ray(cx, s.z1 + 0.05, 0, 1), ray(cx, s.z0 - 0.05, 0, -1), ray(s.x1 + 0.05, cz, 1, 0), ray(s.x0 - 0.05, cz, -1, 0)];
}

export function buildSolidMeshes(solids: Solid[], lod: Lod = 'all', chunk = CHUNK, idx?: SolidIndex): THREE.Group {
  type G = Buf & { mat: number; cx: number; cz: number; count: number };
  const groups = new Map<string, G>();
  const keyOf = (s: Solid, mat: number) => `${Math.floor((s.x0 + s.x1) / 2 / chunk)},${Math.floor((s.z0 + s.z1) / 2 / chunk)},${mat}`;
  const group = (s: Solid, mat: number) => {
    const key = keyOf(s, mat);
    let g = groups.get(key);
    if (!g) {
      const e = new Float32Array(0);
      groups.set(key, (g = { pos: e, nor: e, uv: e, col: e, n: 0, count: 0, mat, cx: Math.floor((s.x0 + s.x1) / 2 / chunk), cz: Math.floor((s.z0 + s.z1) / 2 / chunk) }));
    }
    return g;
  };
  // Count first (24 side and 12 top/bottom vertices per solid), then fill typed arrays.
  for (const s of solids) {
    if (s.mat === 99) continue;
    const f = isFacade(s.mat);
    group(s, s.mat).count += f ? 24 : 36;
    if (f) group(s, MAT.concrete).count += 12;
  }
  for (const g of groups.values()) {
    g.pos = new Float32Array(g.count * 3); g.nor = new Float32Array(g.count * 3); g.uv = new Float32Array(g.count * 2); g.col = new Float32Array(g.count * 3);
  }
  for (const s of solids) if (s.mat !== 99) pushSolid(s, group(s, s.mat), isFacade(s.mat) ? group(s, MAT.concrete) : undefined, idx ? occlusion(s, idx) : OPEN);
  const root = new THREE.Group();
  for (const g of groups.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(g.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(g.nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(g.uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(g.col, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, material(g.mat, true, lod));
    mesh.receiveShadow = true;
    mesh.userData.chunk = { x: (g.cx + 0.5) * chunk, z: (g.cz + 0.5) * chunk };
    root.add(mesh);
  }
  // One shadow caster per chunk, whatever its materials.
  if (lod !== 'far') {
    const byChunk = new Map<string, G[]>();
    for (const g of groups.values()) { const k = `${g.cx},${g.cz}`; byChunk.set(k, [...(byChunk.get(k) ?? []), g]); }
    for (const gs of byChunk.values()) {
      const pos = new Float32Array(gs.reduce((a, g) => a + g.pos.length, 0));
      let o = 0;
      for (const g of gs) { pos.set(g.pos, o); o += g.pos.length; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.computeBoundingSphere();
      const caster = new THREE.Mesh(geo, CASTER);
      caster.castShadow = true;
      caster.layers.set(CASTER_LAYER);
      caster.userData.chunk = { x: (gs[0].cx + 0.5) * chunk, z: (gs[0].cz + 0.5) * chunk };
      root.add(caster);
    }
  }
  return root;
}

/** Merges small static meshes (pipes, ladders, prop parts) into one mesh per chunk per material. */
export class ChunkMerger {
  private parts = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; cx: number; cz: number }>();
  add(o: THREE.Mesh) {
    o.updateMatrixWorld(true);
    const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    const cx = Math.floor(p.x / CHUNK), cz = Math.floor(p.z / CHUNK), mat = o.material as THREE.Material;
    const key = `${cx},${cz},${mat.uuid}`;
    let e = this.parts.get(key);
    if (!e) this.parts.set(key, (e = { mat, geos: [], cx, cz }));
    e.geos.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
  }
  build(merge: (g: THREE.BufferGeometry[]) => THREE.BufferGeometry): THREE.Mesh[] {
    return [...this.parts.values()].map(e => {
      const m = new THREE.Mesh(merge(e.geos), e.mat);
      m.geometry.computeBoundingSphere();
      m.userData.chunk = { x: (e.cx + 0.5) * CHUNK, z: (e.cz + 0.5) * CHUNK };
      return m;
    });
  }
}
