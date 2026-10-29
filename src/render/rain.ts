// Rain (M3-13): streaks falling in a box around the camera, as many as the rain is heavy. Hidden when he's
// underground or under a roof.
import * as THREE from 'three';
import { mulberry } from './rand';

const N = 1500, BOX = 28, LEN = 0.6, FALL = 9;

export class Rain {
  readonly lines: THREE.LineSegments;
  private pos = new Float32Array(N * 6);
  private seed = new Float32Array(N * 3);

  constructor(scene: THREE.Scene) {
    const r = mulberry(77);
    for (let i = 0; i < N; i++) { this.seed[i * 3] = r() * BOX; this.seed[i * 3 + 1] = r() * BOX; this.seed[i * 3 + 2] = r() * BOX; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x8c969e, transparent: true, opacity: 0.3, depthWrite: false }));
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    scene.add(this.lines);
  }

  /** amount 0..1; covered: a roof or the ground is over his head. */
  update(t: number, cam: THREE.Vector3, amount: number, covered: boolean) {
    const on = amount > 0.02 && !covered;
    this.lines.visible = on;
    if (!on) return;
    const n = Math.floor(N * Math.min(1, amount));
    this.lines.geometry.setDrawRange(0, n * 2);
    const half = BOX / 2, wrap = (v: number) => ((v % BOX) + BOX) % BOX - half;
    for (let i = 0; i < n; i++) {
      // Each streak keeps its place in a box that tiles space, so the camera moves through still rain.
      const x = cam.x + wrap(this.seed[i * 3] - cam.x), z = cam.z + wrap(this.seed[i * 3 + 2] - cam.z);
      const y = cam.y + wrap(this.seed[i * 3 + 1] - t * FALL - cam.y);
      const o = i * 6;
      this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z;
      this.pos[o + 3] = x + 0.04; this.pos[o + 4] = y + LEN; this.pos[o + 5] = z + 0.02;
    }
    (this.lines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.lines.material as THREE.LineBasicMaterial).opacity = 0.1 + 0.18 * amount;
  }
}
