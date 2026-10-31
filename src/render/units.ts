// The machines, drawn (M4-01, M4-01b): each unit where the sim says it is at the moment drawn, within sight of the
// camera: the beats' walkers and the columns marching out of the factory. Plain shapes for now, eyes lit (M4-26
// builds the real models).
import * as THREE from 'three';
import { mergeGeometries } from './view';
import { unitPose, type Unit } from '../sim/units';
import type { World } from '../world/world';
import type { UnitKind } from '../data/units';

/** How near a unit must be to be drawn. */
const NEAR = 300;
const BODY = new THREE.MeshLambertMaterial({ color: 0x5a6068 }), EYE = new THREE.MeshBasicMaterial({ color: 0xd8ecff });
const at = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const FOUR = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const GEO: Record<UnitKind, () => THREE.BufferGeometry> = {
  humanoid: () => mergeGeometries([at(0.5, 0.7, 0.3, 0, 1.25, 0), at(0.26, 0.26, 0.26, 0, 1.78, 0), ...[-1, 1].flatMap(k => [at(0.15, 0.88, 0.16, k * 0.13, 0.44, 0), at(0.11, 0.72, 0.12, k * 0.33, 1.2, 0)])]),
  quadruped: () => mergeGeometries([at(0.45, 0.32, 1.0, 0, 0.7, 0), at(0.26, 0.22, 0.3, 0, 0.82, 0.6), ...FOUR.map(([a, b]) => at(0.1, 0.6, 0.1, a * 0.17, 0.3, b * 0.38))]),
  drone: () => mergeGeometries([at(0.5, 0.15, 0.5, 0, 0, 0), ...FOUR.flatMap(([a, b]) => [at(0.5, 0.04, 0.06, a * 0.25, 0.02, b * 0.25), at(0.36, 0.01, 0.36, a * 0.45, 0.07, b * 0.45)])]),
  delivery: () => mergeGeometries([at(0.6, 0.55, 0.8, 0, 0.35, 0), ...FOUR.map(([a, b]) => at(0.08, 0.2, 0.2, a * 0.32, 0.1, b * 0.28))]),
  // A carrier: a long cargo body on six legs.
  carrier: () => mergeGeometries([at(1.4, 1.0, 3.0, 0, 1.3, 0), at(1.0, 0.4, 0.6, 0, 1.1, 1.7), ...[-1, 0, 1].flatMap(b => [-1, 1].map(a => at(0.14, 0.9, 0.14, a * 0.6, 0.45, b * 1.1)))]),
  // A camera's housing on its bracket, tipped down at the street (M4-07); a sweeper's on a turning head.
  camera: () => mergeGeometries([at(0.2, 0.15, 0.32, 0, 0, 0.12).rotateX(0.35), at(0.05, 0.25, 0.05, 0, 0.12, -0.04)]),
  sweeper: () => mergeGeometries([at(0.18, 0.18, 0.3, 0, 0, 0.12).rotateX(0.3), at(0.2, 0.08, 0.2, 0, 0.14, 0), at(0.05, 0.3, 0.05, 0, 0.3, 0)]),
  // (The smart lampposts' cameras are their props'.)
  lamppost: () => at(0.01, 0.01, 0.01, 0, 0, 0),
};
/** Where each kind's eyes are, from its feet. */
const EYE_AT: Record<UnitKind, THREE.Matrix4> = {
  humanoid: new THREE.Matrix4().makeTranslation(0, 1.8, 0.135), quadruped: new THREE.Matrix4().makeTranslation(0, 0.85, 0.755),
  drone: new THREE.Matrix4().makeTranslation(0, -0.1, 0.2), delivery: new THREE.Matrix4().makeTranslation(0, 0.5, 0.41), carrier: new THREE.Matrix4().makeTranslation(0, 1.2, 2.01),
  camera: new THREE.Matrix4().makeTranslation(0, -0.05, 0.29), sweeper: new THREE.Matrix4().makeTranslation(0, -0.05, 0.28), lamppost: new THREE.Matrix4().makeTranslation(0, 0, 0),
};
const KINDS = Object.keys(GEO) as UnitKind[];

export class UnitView {
  readonly group = new THREE.Group();
  private bodies = {} as Record<UnitKind, THREE.InstancedMesh<THREE.BufferGeometry, THREE.Material>>;
  private eyes: THREE.InstancedMesh;
  private m = new THREE.Matrix4();
  private e = new THREE.Matrix4();

  constructor(n: number) {
    for (const k of KINDS) this.bodies[k] = new THREE.InstancedMesh<THREE.BufferGeometry, THREE.Material>(GEO[k](), BODY, Math.max(1, n));
    this.eyes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), EYE, Math.max(1, n));
    for (const m of [...Object.values(this.bodies), this.eyes]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.group.add(m); }
  }

  update(w: World, units: Unit[], time: number, cam: THREE.Vector3) {
    const count = Object.fromEntries(KINDS.map(k => [k, 0])) as Record<UnitKind, number>;
    let eyes = 0;
    for (const u of units) {
      const p = unitPose(w, u, time);
      if (!p.active || u.kind === 'lamppost' || Math.hypot(p.x - cam.x, p.z - cam.z) > NEAR) continue;
      this.m.makeRotationY(p.yaw).setPosition(p.x, p.y, p.z);
      this.bodies[u.kind].setMatrixAt(count[u.kind]++, this.m);
      this.eyes.setMatrixAt(eyes++, this.e.copy(this.m).multiply(EYE_AT[u.kind]));
    }
    for (const k of KINDS) { this.bodies[k].count = count[k]; this.bodies[k].instanceMatrix.needsUpdate = true; }
    this.eyes.count = eyes; this.eyes.instanceMatrix.needsUpdate = true;
  }

  dispose() { for (const m of [...Object.values(this.bodies), this.eyes]) m.geometry.dispose(); this.group.removeFromParent(); }
}
