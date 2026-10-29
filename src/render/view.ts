// The three.js scene: renderer, lights, fog, the static world meshes and the first-person rig.
import * as THREE from 'three';
import type { World } from '../world/world';
import { buildSolidMeshes } from './world-mesh';
import { buildLabels } from './labels';
import { material } from './materials';
import { MAT } from '../world/mats';
import { FPCamera } from './fpcamera';
import { buildProps, tickProps } from './props';

export class View {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly fp: FPCamera;
  readonly sun = new THREE.DirectionalLight(0xfff1dd, 1.6);
  readonly hemi = new THREE.HemisphereLight(0xc8d4e0, 0x4a4438, 1.2);
  readonly world = new THREE.Group();

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.fp = new FPCamera(innerWidth / innerHeight);
    this.scene.add(this.fp.cam, this.world, this.sun, this.sun.target, this.hemi);
    this.scene.background = new THREE.Color(0x9aa6ad);
    this.scene.fog = new THREE.Fog(0x9aa6ad, 20, 160);
    this.sun.position.set(40, 80, 30);
    addEventListener('resize', () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.fp.cam.aspect = innerWidth / innerHeight;
      this.fp.cam.updateProjectionMatrix();
    });
  }

  setWorld(w: World) {
    this.world.traverse(o => (o as THREE.Mesh).geometry?.dispose());
    this.world.clear();
    this.world.add(buildSolidMeshes(w.solids.concat(w.decor)));
    this.world.add(buildLabels(w.labels));
    this.world.add(buildProps(w.props));
    for (const b of w.water) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0), material(MAT.water));
      m.rotation.x = -Math.PI / 2;
      m.position.set((b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2);
      this.world.add(m);
    }
    for (const c of w.climbables) {
      const isPipe = c.kind === 'pipe';
      const geo = isPipe ? new THREE.CylinderGeometry(0.06, 0.06, c.y1 - c.y0, 8) : ladderGeometry(c.y1 - c.y0);
      const m = new THREE.Mesh(geo, material(MAT.metal));
      m.position.set(c.x + c.nx * 0.08, (c.y0 + c.y1) / 2, c.z + c.nz * 0.08);
      m.rotation.y = Math.atan2(c.nx, c.nz);
      this.world.add(m);
    }
  }

  render(t = 0, open: Record<string, boolean> = {}) { tickProps(t, open); this.renderer.render(this.scene, this.fp.cam); }
}

function ladderGeometry(h: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.22, 0.22]) parts.push(new THREE.BoxGeometry(0.05, h, 0.05).translate(x, 0, 0));
  for (let y = -h / 2 + 0.3; y < h / 2; y += 0.3) parts.push(new THREE.BoxGeometry(0.44, 0.03, 0.03).translate(0, y, 0));
  return mergeGeometries(parts);
}

export function mergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  for (const p of parts) {
    const g = p.index ? p.toNonIndexed() : p;
    pos.push(...(g.getAttribute('position').array as Float32Array));
    nor.push(...(g.getAttribute('normal').array as Float32Array));
    const u = g.getAttribute('uv');
    if (u) uv.push(...(u.array as Float32Array)); else for (let i = 0; i < g.getAttribute('position').count; i++) uv.push(0, 0);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}
