// Merges world solids into one mesh per material (world-scale UVs). Chunking arrives with the city.
import * as THREE from 'three';
import { topAt, type Solid } from '../world/geom';
import { material, texScale } from './materials';

/** Push the faces of a solid into per-material arrays. Ramps get sloped tops and sides. */
export function pushSolid(s: Solid, pos: number[], nor: number[], uv: number[]) {
  const sc = 1 / texScale(s.mat);
  const yt = (x: number, z: number) => (s.ramp ? topAt(s, x, z) : s.y1);
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[], uvs: number[][]) => {
    for (const [p, t] of [[a, uvs[0]], [b, uvs[1]], [c, uvs[2]], [a, uvs[0]], [c, uvs[2]], [d, uvs[3]]] as const) {
      pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); uv.push(t[0] * sc, t[1] * sc);
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
  quad([x0, h01, z1], [x1, h11, z1], [x1, h10, z0], [x0, h00, z0], n, [[x0, z1], [x1, z1], [x1, z0], [x0, z0]]);
  quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
  quad([x0, y0, z1], [x1, y0, z1], [x1, h11, z1], [x0, h01, z1], [0, 0, 1], [[x0, y0], [x1, y0], [x1, h11], [x0, h01]]);
  quad([x1, y0, z0], [x0, y0, z0], [x0, h00, z0], [x1, h10, z0], [0, 0, -1], [[-x1, y0], [-x0, y0], [-x0, h00], [-x1, h10]]);
  quad([x1, y0, z1], [x1, y0, z0], [x1, h10, z0], [x1, h11, z1], [1, 0, 0], [[-z1, y0], [-z0, y0], [-z0, h10], [-z1, h11]]);
  quad([x0, y0, z0], [x0, y0, z1], [x0, h01, z1], [x0, h00, z0], [-1, 0, 0], [[z0, y0], [z1, y0], [z1, h01], [z0, h00]]);
}

export function buildSolidMeshes(solids: Solid[]): THREE.Group {
  const groups = new Map<number, { pos: number[]; nor: number[]; uv: number[] }>();
  for (const s of solids) {
    if (s.mat === 99) continue;
    let g = groups.get(s.mat);
    if (!g) groups.set(s.mat, (g = { pos: [], nor: [], uv: [] }));
    pushSolid(s, g.pos, g.nor, g.uv);
  }
  const root = new THREE.Group();
  for (const [mat, g] of groups) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
    const mesh = new THREE.Mesh(geo, material(mat));
    mesh.receiveShadow = mesh.castShadow = true;
    root.add(mesh);
  }
  return root;
}
