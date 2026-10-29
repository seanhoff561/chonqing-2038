// The three.js scene: renderer, lights, fog, the static world meshes and the first-person rig.
import * as THREE from 'three';
import type { World } from '../world/world';
import { buildSolidMeshes, ChunkMerger, CASTER_LAYER } from './world-mesh';
import { buildGroundMeshes, buildFarGround } from './ground-mesh';
import { buildLabels } from './labels';
import { material, lodRadius } from './materials';
import { MAT } from '../world/mats';
import { FPCamera } from './fpcamera';
import { buildProps, tickProps } from './props';

/** Half-size of the sun's shadow area around the camera, metres. */
export const SHADOW_R = 70;

export class View {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly fp: FPCamera;
  readonly sun = new THREE.DirectionalLight(0xfff1dd, 1.6);
  /** His headlamp (U-019): a spot on his forehead, always in the scene (intensity 0 when off) so switching it
   *  never recompiles the shaders. */
  readonly lamp = new THREE.SpotLight(0xfff4e6, 0, 40, 0.5, 0.75, 2);
  private readonly shadowEye = new THREE.OrthographicCamera(0, 0.001, 0.001, 0, 0, 0.001);
  readonly hemi = new THREE.HemisphereLight(0xc8d4e0, 0x4a4438, 1.2);
  readonly world = new THREE.Group();
  private chunks: THREE.Mesh[] = [];
  private hasFar = false;
  private shadowKey = '';
  private shadowAge = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.setResolution(loadResolution());
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Filmic response: highlights roll off, shadows keep detail (U-012).
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    // A soft sun shadow over the area around the camera (U-012); Sky moves it with him.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -SHADOW_R, right: SHADOW_R, top: SHADOW_R, bottom: -SHADOW_R, near: 1, far: 400 });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    // Shadows are drawn in a pass of their own, through an eye that sees only the caster layer and points
    // nowhere, so the per-chunk casters never cost a call in the main pass. Info counts both passes.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.info.autoReset = false;
    this.sun.layers.enable(CASTER_LAYER);
    this.shadowEye.layers.set(CASTER_LAYER);
    this.shadowEye.position.set(0, -1e6, 0);
    container.appendChild(this.renderer.domElement);
    this.fp = new FPCamera(innerWidth / innerHeight);
    this.scene.add(this.fp.cam, this.world, this.sun, this.sun.target, this.hemi);
    this.lamp.position.set(0, 0.08, 0);
    this.lamp.target.position.set(0, -0.12, -1);
    this.fp.cam.add(this.lamp, this.lamp.target);
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
    // Big worlds draw detail near the camera and one cheap stand-in per block beyond (U-012).
    this.hasFar = w.far.length > 0;
    const meshes = buildSolidMeshes(w.solids.concat(w.decor), this.hasFar ? 'near' : 'all', undefined, w.index);
    if (w.ground) meshes.add(...buildGroundMeshes(w.ground, this.hasFar ? 'near' : 'all'));
    const props = buildProps(w.props);
    this.world.add(meshes, buildLabels(w.labels), props);
    if (this.hasFar) {
      const far = buildSolidMeshes(w.far, 'far', 1e6);
      if (w.ground) far.add(...buildFarGround(w.ground));
      far.traverse(o => { o.castShadow = false; });
      this.world.add(far);
    }
    for (const b of w.water) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0), material(MAT.water));
      m.rotation.x = -Math.PI / 2;
      m.position.set((b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2);
      this.world.add(m);
    }
    // Pipes and ladders merge into chunk meshes.
    const merger = new ChunkMerger();
    for (const c of w.climbables) {
      const isPipe = c.kind === 'pipe';
      const geo = isPipe ? new THREE.CylinderGeometry(0.06, 0.06, c.y1 - c.y0, 8) : ladderGeometry(c.y1 - c.y0);
      const m = new THREE.Mesh(geo, material(MAT.metal));
      m.position.set(c.x + c.nx * 0.08, (c.y0 + c.y1) / 2, c.z + c.nz * 0.08);
      m.rotation.y = Math.atan2(c.nx, c.nz);
      merger.add(m);
    }
    const climb = merger.build(mergeGeometries);
    if (climb.length) this.world.add(...climb);
    this.chunks = [...(meshes.children as THREE.Mesh[]), ...climb, ...(props.children.filter(o => o.userData.chunk) as THREE.Mesh[])];
    // Cull each chunk mesh by its real footprint: a long road or beam is filed under the chunk of its centre.
    for (const m of this.chunks) {
      m.updateWorldMatrix(true, false);
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld);
      m.userData.rect = [b.min.x, b.min.z, b.max.x, b.max.z];
    }
  }

  /** Pixels drawn per screen pixel (M3-53): high is the display's own up to 1.5x, balanced one per CSS pixel,
   *  fast 0.7 of that. Remembered between visits. */
  resolution: Resolution = 'balanced';
  setResolution(r: Resolution) {
    this.resolution = r;
    this.renderer.setPixelRatio(r === 'high' ? Math.min(devicePixelRatio, 1.5) : r === 'fast' ? 0.7 : 1);
    this.renderer.setSize(innerWidth, innerHeight);
    try { localStorage.setItem(RES_KEY, r); } catch { /* private mode: not remembered */ }
  }

  /** 0 off, 1 white (bright, 40 m), 2 red (dim, 12 m: keeps night vision, shows less). */
  setLamp(mode: number) {
    this.lamp.intensity = mode === 1 ? 90 : mode === 2 ? 5 : 0;
    this.lamp.color.setHex(mode === 2 ? 0xff2814 : 0xfff4e6);
    this.lamp.distance = mode === 2 ? 12 : 40;
  }

  render(t = 0, open: Record<string, boolean> = {}) {
    // Detailed chunks wholly past the detail radius (or the fog) are not drawn.
    const c = this.fp.cam.position, far = this.hasFar ? lodRadius.value : (this.scene.fog as THREE.Fog).far;
    for (const m of this.chunks) {
      const [x0, z0, x1, z1] = m.userData.rect;
      m.visible = Math.hypot(Math.max(x0 - c.x, 0, c.x - x1), Math.max(z0 - c.z, 0, c.z - z1)) < far;
    }
    tickProps(t, open);
    const r = this.renderer;
    r.info.reset();
    // The sun's shadow map is redrawn when its area or the sun has moved (Sky snaps both), and every sixth frame
    // for what moves in it; the frames between reuse it (M3-53).
    const sp = this.sun.position, key = `${sp.x.toFixed(1)},${sp.y.toFixed(1)},${sp.z.toFixed(1)}`;
    if (this.sun.castShadow && (key !== this.shadowKey || ++this.shadowAge >= 6)) {
      r.shadowMap.needsUpdate = true; r.render(this.scene, this.shadowEye);
      this.shadowKey = key; this.shadowAge = 0;
    }
    r.render(this.scene, this.fp.cam);
  }
}

export type Resolution = 'high' | 'balanced' | 'fast';
const RES_KEY = 'cq2038.resolution';
function loadResolution(): Resolution {
  try { const r = localStorage.getItem(RES_KEY); if (r === 'high' || r === 'fast') return r; } catch { /* default */ }
  return 'balanced';
}

function ladderGeometry(h: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.22, 0.22]) parts.push(new THREE.BoxGeometry(0.05, h, 0.05).translate(x, 0, 0));
  for (let y = -h / 2 + 0.3; y < h / 2; y += 0.3) parts.push(new THREE.BoxGeometry(0.44, 0.03, 0.03).translate(0, y, 0));
  return mergeGeometries(parts);
}

export function mergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const gs = parts.map(p => (p.index ? p.toNonIndexed() : p));
  const total = gs.reduce((a, g) => a + g.getAttribute('position').count, 0);
  const coloured = gs.some(g => g.getAttribute('color'));
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  const col = coloured ? new Float32Array(total * 3).fill(1) : null;
  const tiled = gs.some(g => g.getAttribute('tile')), tile = tiled ? new Float32Array(total) : null;
  let o = 0;
  for (const g of gs) {
    const n = g.getAttribute('position').count;
    pos.set(g.getAttribute('position').array as Float32Array, o * 3);
    nor.set(g.getAttribute('normal').array as Float32Array, o * 3);
    const u = g.getAttribute('uv');
    if (u) uv.set(u.array as Float32Array, o * 2);
    const c = g.getAttribute('color');
    if (col && c) col.set(c.array as Float32Array, o * 3);
    const t = g.getAttribute('tile');
    if (tile && t) tile.set(t.array as Float32Array, o);
    o += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (tile) out.setAttribute('tile', new THREE.BufferAttribute(tile, 1));
  return out;
}
