// The machines, drawn (M4-01, M4-01b): each unit where the sim says it is at the moment drawn, within sight of the
// camera: the beats' walkers and the columns marching out of the factory. Plain shapes for now, eyes lit (M4-26
// builds the real models).
import * as THREE from 'three';
import { mergeGeometries } from './view';
import { mergeGeometries as mergeAll } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { unitPose, type Unit } from '../sim/units';
import type { World } from '../world/world';
import type { UnitKind } from '../data/units';

/** How near a unit must be to be drawn. */
const NEAR = 220;
const at = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const FOUR = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const GEO: Record<UnitKind, () => THREE.BufferGeometry> = {
  humanoid: () => mergeGeometries([at(0.5, 0.7, 0.3, 0, 1.25, 0), at(0.26, 0.26, 0.26, 0, 1.78, 0), ...[-1, 1].flatMap(k => [at(0.15, 0.88, 0.16, k * 0.13, 0.44, 0), at(0.11, 0.72, 0.12, k * 0.33, 1.2, 0)])]),
  quadruped: () => mergeGeometries([at(0.45, 0.32, 1.0, 0, 0.7, 0), at(0.26, 0.22, 0.3, 0, 0.82, 0.6), ...FOUR.map(([a, b]) => at(0.1, 0.6, 0.1, a * 0.17, 0.3, b * 0.38))]),
  drone: () => mergeGeometries([at(0.5, 0.15, 0.5, 0, 0, 0), ...FOUR.flatMap(([a, b]) => [at(0.5, 0.04, 0.06, a * 0.25, 0.02, b * 0.25), at(0.36, 0.01, 0.36, a * 0.45, 0.07, b * 0.45)])]),
  // A hunter drone (M4-14): bigger, its gun slung under it.
  hunter: () => mergeGeometries([at(0.7, 0.2, 0.8, 0, 0, 0), at(0.08, 0.08, 0.6, 0, -0.16, 0.3), ...FOUR.flatMap(([a, b]) => [at(0.6, 0.05, 0.07, a * 0.32, 0.03, b * 0.32), at(0.46, 0.01, 0.46, a * 0.58, 0.09, b * 0.58)])]),
  delivery: () => mergeGeometries([at(0.6, 0.55, 0.8, 0, 0.35, 0), ...FOUR.map(([a, b]) => at(0.08, 0.2, 0.2, a * 0.32, 0.1, b * 0.28))]),
  // A carrier: a long cargo body on six legs.
  carrier: () => mergeGeometries([at(1.4, 1.0, 3.0, 0, 1.3, 0), at(1.0, 0.4, 0.6, 0, 1.1, 1.7), ...[-1, 0, 1].flatMap(b => [-1, 1].map(a => at(0.14, 0.9, 0.14, a * 0.6, 0.45, b * 1.1)))]),
  // A camera's housing on its bracket, tipped down at the street (M4-07); a sweeper's on a turning head.
  camera: () => mergeGeometries([at(0.2, 0.15, 0.32, 0, 0, 0.12).rotateX(0.35), at(0.05, 0.25, 0.05, 0, 0.12, -0.04)]),
  sweeper: () => mergeGeometries([at(0.18, 0.18, 0.3, 0, 0, 0.12).rotateX(0.3), at(0.2, 0.08, 0.2, 0, 0.14, 0), at(0.05, 0.3, 0.05, 0, 0.3, 0)]),
  // (The smart lampposts' cameras are their props'.)
  lamppost: () => at(0.01, 0.01, 0.01, 0, 0, 0),
  // The fixed sensors (M4-11): a turret's gun on its ring; a motion sensor's dome; an acoustic sensor's grille; a
  // tripwire's beam, a metre long (scaled to its length).
  turret: () => mergeGeometries([at(0.9, 0.5, 0.9, 0, -0.25, 0), at(0.5, 0.35, 0.7, 0, 0.1, 0.1), at(0.12, 0.12, 1.2, -0.12, 0.12, 0.8), at(0.12, 0.12, 1.2, 0.12, 0.12, 0.8)]),
  pir: () => mergeGeometries([at(0.16, 0.12, 0.08, 0, 0, 0), at(0.1, 0.06, 0.06, 0, -0.04, 0.05)]),
  acoustic: () => mergeGeometries([at(0.3, 0.3, 0.1, 0, 0, 0), ...[-0.08, 0, 0.08].map(y => at(0.26, 0.02, 0.02, 0, y, 0.06))]),
  tripwire: () => at(0.012, 0.012, 1, 0, 0, 0.5),
};
/** Where each kind's eyes are, from its feet. */
const EYE_AT: Record<UnitKind, THREE.Matrix4> = {
  humanoid: new THREE.Matrix4().makeTranslation(0, 1.8, 0.135), quadruped: new THREE.Matrix4().makeTranslation(0, 0.85, 0.755),
  drone: new THREE.Matrix4().makeTranslation(0, -0.1, 0.2), hunter: new THREE.Matrix4().makeTranslation(0, -0.06, 0.41), delivery: new THREE.Matrix4().makeTranslation(0, 0.5, 0.41), carrier: new THREE.Matrix4().makeTranslation(0, 1.2, 2.01),
  camera: new THREE.Matrix4().makeTranslation(0, -0.05, 0.29), sweeper: new THREE.Matrix4().makeTranslation(0, -0.05, 0.28), lamppost: new THREE.Matrix4().makeTranslation(0, 0, 0),
  turret: new THREE.Matrix4().makeTranslation(0, 0.2, 0.46), pir: new THREE.Matrix4().makeTranslation(0, -0.04, 0.09), acoustic: new THREE.Matrix4().makeTranslation(0, 0.12, 0.06), tripwire: new THREE.Matrix4().makeTranslation(0, 0, 0),
};
const KINDS = Object.keys(GEO) as UnitKind[];

/** A kind's shape and its lit eyes as one geometry: the body grey, the eyes glowing (M4-26 makes the models). */
function shape(k: UnitKind): THREE.BufferGeometry {
  const paint = (g: THREE.BufferGeometry, c: number, glow: number) => {
    const g2 = g.index ? g.toNonIndexed() : g, n = g2.attributes.position.count, col = new THREE.Color(c);
    g2.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n }, () => [col.r, col.g, col.b]).flat(), 3));
    g2.setAttribute('glow', new THREE.Float32BufferAttribute(new Array(n).fill(glow), 1));
    if (g2.attributes.uv) g2.deleteAttribute('uv');
    return g2;
  };
  // (A tripwire is all beam: red, lit.)
  if (k === 'tripwire') return paint(GEO[k](), 0xff2020, 1);
  // (Three's merge, which keeps the colour and glow: the view's own keeps only what the world's meshes have.)
  return mergeAll([paint(GEO[k](), 0x5a6068, 0), paint(new THREE.BoxGeometry(0.2, 0.05, 0.02).applyMatrix4(EYE_AT[k]), 0xd8ecff, 1)]);
}

/** Every unit in one batch: one draw call for all the machines near him. */
export class UnitView {
  readonly group = new THREE.Group();
  private batch: THREE.BatchedMesh;
  private ids: number[] = [];
  private m = new THREE.Matrix4();
  private s = new THREE.Matrix4();

  constructor(units: Unit[]) {
    const shapes = Object.fromEntries(KINDS.map(k => [k, shape(k)])) as Record<UnitKind, THREE.BufferGeometry>;
    const verts = KINDS.reduce((a, k) => a + shapes[k].attributes.position.count, 0);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    mat.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute float glow;\nvarying float vGlow;\n' + sh.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\nvGlow = glow;');
      sh.fragmentShader = 'varying float vGlow;\n' + sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive + vColor.rgb * vGlow;');
    };
    mat.customProgramCacheKey = () => 'units';
    this.batch = new THREE.BatchedMesh(Math.max(1, units.length), verts, 0, mat);
    const geo = Object.fromEntries(KINDS.map(k => [k, this.batch.addGeometry(shapes[k])])) as Record<UnitKind, number>;
    for (const u of units) { const id = this.batch.addInstance(geo[u.kind]); this.batch.setVisibleAt(id, false); this.ids.push(id); }
    this.batch.frustumCulled = false;
    this.group.add(this.batch);
  }

  update(w: World, units: Unit[], time: number, cam: THREE.Vector3) {
    let shown = 0;
    units.forEach((u, i) => {
      // (An idle camera's housing still shows, M4-16, and a machine that's out where it stopped, M4-17.)
      const p = unitPose(w, u, time), on = (p.active || u.cam !== undefined || !!u.stop) && u.kind !== 'lamppost' && Math.hypot(p.x - cam.x, p.z - cam.z) <= NEAR;
      this.batch.setVisibleAt(this.ids[i], on);
      if (!on) return;
      this.m.makeRotationY(p.yaw).setPosition(p.x, p.y, p.z);
      // A tripwire's beam stretched to its far end.
      const to = u.cam !== undefined ? w.cameras[u.cam].to : undefined;
      if (to) this.m.multiply(this.s.makeScale(1, 1, Math.hypot(to.x - p.x, to.y - p.y, to.z - p.z)));
      this.batch.setMatrixAt(this.ids[i], this.m);
      shown++;
    });
    this.batch.visible = shown > 0;
  }

  dispose() { this.batch.dispose(); this.group.removeFromParent(); }
}
