// Set dressing built from code by prop kind.
import * as THREE from 'three';
import type { Prop } from '../world/world';
import { material } from './materials';
import { MAT } from '../world/mats';
import { textTexture } from './textures';
import { mergeGeometries } from './view';

const lam = (color: number, emissive = 0) => new THREE.MeshLambertMaterial({ color, emissive });
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);

type Builder = (p: Prop) => THREE.Object3D;

/** Brick vault over the chamber: walls to 1.8 m, an elliptical vault to the crown, ribs every 2.5 m. */
function arches(p: Prop): THREE.Object3D {
  const g = new THREE.Group();
  const L = p.w!, W = p.d!, spring = 1.8, rise = p.h! - spring;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const seg = 12;
  for (let i = 0; i < seg; i++) {
    const a0 = (Math.PI * i) / seg, a1 = (Math.PI * (i + 1)) / seg;
    const z0 = Math.cos(a0) * W / 2, y0 = spring + Math.sin(a0) * rise, z1 = Math.cos(a1) * W / 2, y1 = spring + Math.sin(a1) * rise;
    const nz = -(Math.cos(a0) + Math.cos(a1)) / 2, ny = -(Math.sin(a0) + Math.sin(a1)) / 2;
    const quad = [[0, y0, z0], [L, y1, z1], [L, y0, z0], [0, y0, z0], [0, y1, z1], [L, y1, z1]];
    const u = [[0, i], [L, i + 1], [L, i], [0, i], [0, i + 1], [L, i + 1]];
    quad.forEach((q, k) => { pos.push(q[0], q[1], q[2]); nor.push(0, ny, nz); uv.push(u[k][0] / 2, u[k][1] * 0.35); });
  }
  // Brick wall facings from floor to the springing line.
  for (const side of [-1, 1]) {
    const z = side * (W / 2 - 0.01);
    const quad = side < 0 ? [[0, 0, z], [L, 0, z], [L, spring, z], [0, 0, z], [L, spring, z], [0, spring, z]] : [[L, 0, z], [0, 0, z], [0, spring, z], [L, 0, z], [0, spring, z], [L, spring, z]];
    for (const q of quad) { pos.push(q[0], q[1], q[2]); nor.push(0, 0, -side); uv.push(q[0] / 2, q[1] / 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const vault = new THREE.Mesh(geo, material(MAT.brick));
  g.add(vault);
  const ribs: THREE.BufferGeometry[] = [];
  for (let x = 1.25; x < L; x += 2.5)
    for (let i = 0; i < seg; i++) {
      const a = (Math.PI * (i + 0.5)) / seg;
      const r = new THREE.BoxGeometry(0.25, 0.12, (Math.PI * W) / 2 / seg + 0.05);
      r.rotateX(-a + Math.PI / 2).translate(x, spring + Math.sin(a) * rise - 0.04, Math.cos(a) * (W / 2 - 0.04));
      ribs.push(r);
    }
  g.add(new THREE.Mesh(mergeGeometries(ribs), material(MAT.brick)));
  return g;
}

function lamp(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.05, 10).translate(0, 0.025, 0), lam(0x333333)));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10).translate(0, 0.12, 0), lam(0xffd9a0, 0xffb060)));
  const light = new THREE.PointLight(0xffb870, 6, 14, 1.6);
  light.position.y = 0.3;
  g.add(light);
  return g;
}

const builders: Record<string, Builder> = {
  arches,
  lamp,
  mattress: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(box(2.0, 0.16, 1.1, 0, -0.16, 0), lam(0x5d5546)));
    g.add(new THREE.Mesh(box(0.5, 0.1, 0.8, -0.7, 0, 0), lam(0x7a7262)));
    g.add(new THREE.Mesh(box(1.2, 0.04, 1.05, 0.35, 0, 0.02), lam(0x3d4a52)));
    return g;
  },
  workbench: () => {
    const g = new THREE.Group();
    const wood = lam(0x5a4632), steel = lam(0x55595c);
    g.add(new THREE.Mesh(box(2.4, 0.06, 0.75, 0, -0.06, 0), wood));
    for (const [x, z] of [[-1.1, -0.3], [1.1, -0.3], [-1.1, 0.3], [1.1, 0.3]]) g.add(new THREE.Mesh(box(0.06, 0.84, 0.06, x, -0.9, z), steel));
    g.add(new THREE.Mesh(box(0.2, 0.12, 0.15, 0.95, 0, -0.2), steel));
    g.add(new THREE.Mesh(box(0.35, 0.03, 0.25, -0.1, 0, 0.05), lam(0x2a3a2a)));
    g.add(new THREE.Mesh(box(0.25, 0.08, 0.1, 0.4, 0, 0.15), lam(0x8a2a20)));
    return g;
  },
  crate: p => new THREE.Mesh(box(p.w!, p.h!, p.d!, 0, 0, 0), material(MAT.crate)),
  carbattery: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(box(0.3, 0.19, 0.18, 0, 0, 0), lam(0x1a1a1a)));
    g.add(new THREE.Mesh(box(0.03, 0.03, 0.03, -0.1, 0.19, 0), lam(0xaa2020)));
    g.add(new THREE.Mesh(box(0.03, 0.03, 0.03, 0.1, 0.19, 0), lam(0x202020)));
    return g;
  },
  inverter: () => new THREE.Mesh(box(0.22, 0.08, 0.14, 0, 0, 0), lam(0x6a6e70)),
  rubble: p => {
    const g = new THREE.Group();
    const m = material(MAT.stone);
    for (let i = 0; i < 9; i++) {
      const r = 0.25 + ((i * 37) % 10) / 25;
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), m);
      s.position.set(((i * 53) % 10) / 10 * p.w! - p.w! / 2, r * 0.7 + ((i * 17) % 5) / 6 * (p.h! - r), ((i * 29) % 7) / 7 * 0.8 - 0.4);
      s.rotation.set(i, i * 2, i * 3);
      g.add(s);
    }
    return g;
  },
  grate: p => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = -5; i <= 5; i++) parts.push(new THREE.BoxGeometry(0.03, 0.06, p.w!).translate((i / 5) * (p.w! / 2 - 0.03), 0, 0));
    parts.push(new THREE.BoxGeometry(p.w!, 0.06, 0.04).translate(0, 0, 0));
    return new THREE.Mesh(mergeGeometries(parts), lam(0x2c2e30));
  },
  graffiti: p => {
    const { tex, aspect } = textTexture(p.text!, { fg: 'rgba(210,205,190,0.75)', size: 44, font: '"Noto Sans CJK SC", sans-serif' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * aspect, 0.5), new THREE.MeshLambertMaterial({ map: tex, transparent: true }));
    return m;
  },
};

export function buildProps(props: Prop[]): THREE.Group {
  const g = new THREE.Group();
  for (const p of props) {
    const b = builders[p.kind];
    if (!b) continue;
    const o = b(p);
    o.position.set(p.x, p.y, p.z);
    o.rotation.y = p.yaw;
    g.add(o);
  }
  return g;
}

export const propKinds = () => Object.keys(builders);
