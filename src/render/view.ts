// The three.js scene: renderer, lights, fog, the static world meshes and the first-person rig.
import * as THREE from 'three';
import type { World } from '../world/world';
import type { Solid } from '../world/geom';
import { buildSolidMeshes, ChunkMerger, CASTER_LAYER } from './world-mesh';
import { buildGroundMeshes, buildFarGround, coarseField } from './ground-mesh';
import { buildStreetMeshes, buildFarStreets } from './streets';
import { lineMeshes } from './lines';
import { Convoys } from './convoys';
import { buildLabels } from './labels';
import { material, lodRadius, swayTime } from './materials';
import { MAT } from '../world/mats';
import { FPCamera } from './fpcamera';
import { buildProps, tickProps } from './props';
import { RoomProps } from './roomprops';

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
  /** The rooms' furniture and clutter, built near only (M3-74). */
  private rooms: RoomProps | null = null;
  private cells: THREE.Group[] = [];
  private hasFar = false;
  private shadowKey = '';
  private visAt = new THREE.Vector3();
  private visFar = -1;
  private convoys: Convoys | null = null;
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
    // The renderer doesn't walk the scene's transforms each frame (some 15 000 static meshes): render() updates
    // what moves and passes over the frozen city (M3-53).
    this.scene.matrixAutoUpdate = false;
    this.scene.matrixWorldAutoUpdate = false;
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
    // Small trims (window cages, AC units, bars, signs) are drawn only within DETAIL of the camera and cast no
    // shadow: from further off they are a pixel or two (M3-55).
    const small = (s: Solid) => { const e = s.rot ?? s; return this.hasFar && !s.ramp && Math.max(e.x1 - e.x0, s.y1 - s.y0, e.z1 - e.z0) < 2.6; };
    // Rooms inside buildings (M3-38) only within INNER, and casting nothing (the shell does).
    const inner = (s: Solid) => this.hasFar && !!s.inner;
    const meshes = buildSolidMeshes(w.solids.filter(s => !inner(s)).concat(w.decor.filter(s => !small(s) && !inner(s))), this.hasFar ? 'near' : 'all', undefined, w.index);
    const detail = buildSolidMeshes(w.decor.filter(s => small(s) && !inner(s)), 'near').children.filter(m => !m.castShadow);
    for (const m of detail) m.userData.detail = true;
    const rooms = buildSolidMeshes(w.solids.filter(inner).concat(w.decor.filter(inner)), 'near').children.filter(m => !m.castShadow);
    for (const m of rooms) m.userData.detail = m.userData.inner = true;
    if (detail.length) meshes.add(...detail);
    if (rooms.length) meshes.add(...rooms);
    if (w.ground) meshes.add(...buildGroundMeshes(w.ground, this.hasFar ? 'near' : 'all', w.marks), ...buildStreetMeshes(w.ground, w.streets, this.hasFar ? 'near' : 'all', w.lawns));
    const props = buildProps(w.props.filter(p => !p.kind.startsWith('f:')));
    this.rooms?.dispose();
    this.rooms = new RoomProps(w.props.filter(p => p.kind.startsWith('f:')));
    this.world.add(meshes, buildLabels(w.labels), props);
    if (this.hasFar) {
      const far = buildSolidMeshes(w.far, 'far', 1e6);
      // (The ground far off with its streets on it, M3-64.)
      if (w.ground) far.add(...buildFarGround(w.ground, w.marks), ...buildFarStreets(coarseField(w.ground), w.streets));
      far.traverse(o => { o.castShadow = false; });
      this.world.add(far);
    }
    // (A small pool, a flooded sump down in the sewers, is drawn near only, as the rooms are.)
    const pools: THREE.Mesh[] = [];
    for (const b of w.water) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0), material(MAT.water));
      m.rotation.x = -Math.PI / 2;
      m.position.set((b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2);
      if (b.x1 - b.x0 < 100 && b.z1 - b.z0 < 100) { m.userData.detail = m.userData.inner = true; pools.push(m); }
      this.world.add(m);
    }
    // The cables over the streets (M3-52).
    for (const m of lineMeshes(w.lines)) this.world.add(m);
    // The machines' columns marching out of the factory (M3-57b).
    this.convoys = w.convoys?.length ? new Convoys(w.convoys) : null;
    if (this.convoys) this.world.add(...this.convoys.meshes);
    // Pipes and ladders merge into chunk meshes.
    const merger = new ChunkMerger();
    for (const c of w.climbables) {
      const geo = c.kind === 'pipe' ? new THREE.CylinderGeometry(0.06, 0.06, c.y1 - c.y0, 8) : c.kind === 'pole' ? poleGeometry(c.y1 - c.y0) : ladderGeometry(c.y1 - c.y0);
      const m = new THREE.Mesh(geo, material(MAT.metal));
      m.position.set(c.x + c.nx * 0.08, (c.y0 + c.y1) / 2, c.z + c.nz * 0.08);
      m.rotation.y = Math.atan2(c.nx, c.nz);
      merger.add(m);
    }
    const climb = merger.build(mergeGeometries);
    if (climb.length) this.world.add(...climb);
    this.chunks = [...(meshes.children as THREE.Mesh[]), ...climb, ...(props.children.filter(o => o.userData.chunk) as THREE.Mesh[]), ...pools];
    // Cull each chunk mesh by its real footprint: a long road or beam is filed under the chunk of its centre.
    for (const m of this.chunks) {
      m.updateWorldMatrix(true, !m.geometry);
      // (A prop that moves, a grate on its hinges, is a group: its box from what's in it.)
      if (m.geometry && !m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const b = m.geometry ? m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld) : new THREE.Box3().setFromObject(m);
      m.userData.rect = [b.min.x, b.min.z, b.max.x, b.max.z];
    }
    // Chunks gather into 256 m cells (their meshes carry world positions, so they move groups as they are), so a
    // cell out of range is passed over whole, its meshes never visited (M3-53).
    const cells = new Map<number, THREE.Group>();
    for (const m of this.chunks) {
      const r = m.userData.rect, k = Math.floor((r[0] + r[2]) / 512) * 65536 + Math.floor((r[1] + r[3]) / 512);
      let cell = cells.get(k);
      if (!cell) { cells.set(k, (cell = new THREE.Group())); cell.userData.rect = [Infinity, Infinity, -Infinity, -Infinity]; this.world.add(cell); }
      cell.add(m);
      const cr = cell.userData.rect;
      cr[0] = Math.min(cr[0], r[0]); cr[1] = Math.min(cr[1], r[1]); cr[2] = Math.max(cr[2], r[2]); cr[3] = Math.max(cr[3], r[3]);
    }
    this.cells = [...cells.values()];
    // The city stands still but for the props that tick: its transforms are computed once, not every frame
    // (M3-53: some 15 000 objects).
    this.world.updateMatrixWorld(true);
    freeze(this.world);
    this.visFar = -1;
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
    // Detailed chunks wholly past the detail radius (or the fog) are not drawn; looked at again once he has
    // moved 4 m or the radius has changed.
    const c = this.fp.cam.position, far = this.hasFar ? lodRadius.value : (this.scene.fog as THREE.Fog).far;
    if (far !== this.visFar || Math.hypot(c.x - this.visAt.x, c.z - this.visAt.z) > 4) {
      this.visFar = far; this.visAt.copy(c);
      const within = (o: THREE.Object3D) => { const [x0, z0, x1, z1] = o.userData.rect; return Math.hypot(Math.max(x0 - c.x, 0, c.x - x1), Math.max(z0 - c.z, 0, c.z - z1)) < (o.userData.inner ? Math.min(far, INNER) : o.userData.detail ? Math.min(far, DETAIL) : far); };
      for (const cell of this.cells) if ((cell.visible = within(cell))) for (const m of cell.children) m.visible = within(m);
    }
    tickProps(t, open);
    swayTime.value = t;
    if (this.rooms) { this.rooms.update(c); if (this.rooms.group.parent !== this.scene) this.scene.add(this.rooms.group); }
    this.convoys?.update(t, c);
    for (const o of this.scene.children) if (o === this.world) liveWalk(o, false); else o.updateMatrixWorld();
    const r = this.renderer;
    r.info.reset();
    // The sun's shadow map is redrawn when its area or the sun has moved (Sky snaps both), and every 30th frame
    // for the few things that move in it (doors); the frames between reuse it (M3-53).
    const sp = this.sun.position, key = `${sp.x.toFixed(1)},${sp.y.toFixed(1)},${sp.z.toFixed(1)}`;
    if (this.sun.castShadow && (key !== this.shadowKey || ++this.shadowAge >= 30)) {
      r.shadowMap.needsUpdate = true; r.render(this.scene, this.shadowEye);
      this.shadowKey = key; this.shadowAge = 0;
    }
    r.render(this.scene, this.fp.cam);
  }
}

/** Mark what under o never moves: a subtree with nothing that animates (a prop with a tick) is frozen whole.
 *  Returns whether something under o animates. */
function freeze(o: THREE.Object3D): boolean {
  if (o.userData.tick) return true;
  let live = false;
  for (const c of o.children) live = freeze(c) || live;
  o.matrixAutoUpdate = false;
  if (!live) o.userData.frozen = true;
  return live;
}

/** three.js's transform update, passing over frozen subtrees (their matrices were set when the world was built). */
function liveWalk(o: THREE.Object3D, force: boolean) {
  if (o.userData.frozen) return;
  if (o.matrixAutoUpdate) o.updateMatrix();
  if (o.matrixWorldNeedsUpdate || force) {
    if (o.parent) o.matrixWorld.multiplyMatrices(o.parent.matrixWorld, o.matrix); else o.matrixWorld.copy(o.matrix);
    o.matrixWorldNeedsUpdate = false;
    force = true;
  }
  for (const c of o.children) liveWalk(c, force);
}

export type Resolution = 'high' | 'balanced' | 'fast';
/** How far small trims are drawn. */
const DETAIL = 110, INNER = 45;
const RES_KEY = 'cq2038.resolution';
function loadResolution(): Resolution {
  try { const r = localStorage.getItem(RES_KEY); if (r === 'high' || r === 'fast') return r; } catch { /* default */ }
  return 'balanced';
}

/** A street pole: a concrete post (its face on the grip line, 0.08 m in front) with step bolts either side up it. */
function poleGeometry(h: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.1, 0.13, h, 8).translate(0, 0, -0.2)];
  for (let y = -h / 2 + 0.5, k = 1; y < h / 2 - 0.2; y += 0.4, k = -k) parts.push(new THREE.BoxGeometry(0.26, 0.03, 0.03).translate(k * 0.14, y, -0.1));
  return mergeGeometries(parts);
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
