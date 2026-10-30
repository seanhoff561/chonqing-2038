// The machines' columns marching out of the factory (M3-57b, U-030): humanoids two abreast, every fourth rank
// quadrupeds, walking out of the glowing gates and away along the roads, their eyes lit. Decor: they see nothing
// (M4-01 puts real units on these paths). Drawn while he's within NEAR of a path.
import * as THREE from 'three';
import { mergeGeometries } from './view';

type Path = { x: number; y: number; z: number }[];
/** Metres between ranks, walking speed, half the gap between the two files, how near he must be to see them. */
const GAP = 3, SPEED = 1.3, FILE = 0.85, NEAR = 700;
const BODY = new THREE.MeshLambertMaterial({ color: 0x5a6068 }), EYE = new THREE.MeshBasicMaterial({ color: 0xd8ecff });
const at = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const HUMANOID = () => mergeGeometries([at(0.5, 0.7, 0.3, 0, 1.25, 0), at(0.26, 0.26, 0.26, 0, 1.78, 0), ...[-1, 1].flatMap(k => [at(0.15, 0.88, 0.16, k * 0.13, 0.44, 0), at(0.11, 0.72, 0.12, k * 0.33, 1.2, 0)])]);
const QUAD = () => mergeGeometries([at(0.45, 0.32, 1.0, 0, 0.7, 0), at(0.26, 0.22, 0.3, 0, 0.82, 0.6), ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => at(0.1, 0.6, 0.1, a * 0.17, 0.3, b * 0.38))]);
/** Where each kind's eyes are, from its feet. */
const EYES = [new THREE.Matrix4().makeTranslation(0, 1.8, 0.135), new THREE.Matrix4().makeTranslation(0, 0.85, 0.755)];

export class Convoys {
  readonly meshes: THREE.InstancedMesh[];
  private paths: { pts: Path; s: number[]; len: number }[];
  private m = new THREE.Matrix4();
  private e = new THREE.Matrix4();

  constructor(paths: Path[]) {
    this.paths = paths.filter(p => p.length > 1).map(pts => {
      const s = [0];
      for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
      return { pts, s, len: s[s.length - 1] };
    });
    const n = this.paths.reduce((a, p) => a + 2 * (Math.floor(p.len / GAP) + 1), 0);
    this.meshes = [new THREE.InstancedMesh(HUMANOID(), BODY, n), new THREE.InstancedMesh(QUAD(), BODY, n), new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), EYE, n)];
    for (const m of this.meshes) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
  }

  update(t: number, cam: THREE.Vector3) {
    const near = this.paths.some(p => p.pts.some((q, i) => i % 5 === 0 && Math.hypot(q.x - cam.x, q.z - cam.z) < NEAR));
    for (const m of this.meshes) m.visible = near;
    if (!near) return;
    const [hum, quad, eye] = this.meshes, count = [0, 0, 0], walked = t * SPEED, first = Math.floor(walked / GAP);
    for (const p of this.paths) {
      let i = 1;
      for (let k = 0; ; k++) {
        const s = (walked % GAP) + k * GAP;
        if (s > p.len) break;
        while (i < p.pts.length - 1 && p.s[i] < s) i++;
        const a = p.pts[i - 1], b = p.pts[i], seg = p.s[i] - p.s[i - 1] || 1, f = Math.min(1, Math.max(0, (s - p.s[i - 1]) / seg));
        const dx = (b.x - a.x) / seg, dz = (b.z - a.z) / seg, yaw = Math.atan2(dx, dz), kind = (k - first) % 4 === 0 ? 1 : 0;
        const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f + Math.abs(Math.sin(s * 3.9)) * 0.05, z = a.z + (b.z - a.z) * f;
        for (const side of [-1, 1]) {
          this.m.makeRotationY(yaw).setPosition(x + dz * FILE * side, y, z - dx * FILE * side);
          (kind ? quad : hum).setMatrixAt(count[kind]++, this.m);
          eye.setMatrixAt(count[2]++, this.e.copy(this.m).multiply(EYES[kind]));
        }
      }
    }
    this.meshes.forEach((m, n) => { m.count = count[n]; m.instanceMatrix.needsUpdate = true; });
  }
}
