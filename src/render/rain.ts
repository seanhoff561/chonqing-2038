// Rain (M3-13, M3-63): streaks falling slanted on the wind in a box around the camera, as many as the rain is heavy,
// and splashes flicking up off the ground round his feet. Hidden when he's underground or under a roof.
import * as THREE from 'three';
import { mulberry } from './rand';

const N = 2400, BOX = 28, LEN = 0.8, FALL = 9, SLANT = 0.12;
/** A number's hash, 0..1 (where a splash flicks up next). */
const hash = (n: number) => { let x = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d); x ^= x + Math.imul(x ^ (x >>> 7), 0x297a2d39); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
/** Splashes: how many at once, how far round him (near enough that the ground's at his feet), how long each shows (s). */
const SPLASH = 140, AROUND = 4.5, FLASH = 0.1;

export class Rain {
  readonly lines: THREE.LineSegments;
  readonly splashes: THREE.Points;
  private pos = new Float32Array(N * 6);
  private seed = new Float32Array(N * 3);
  private drops = new Float32Array(SPLASH * 3);

  constructor(scene: THREE.Scene) {
    const r = mulberry(77);
    for (let i = 0; i < N; i++) { this.seed[i * 3] = r() * BOX; this.seed[i * 3 + 1] = r() * BOX; this.seed[i * 3 + 2] = r() * BOX; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x8c969e, transparent: true, opacity: 0.3, depthWrite: false }));
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.drops, 3));
    this.splashes = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xaab2b8, size: 0.035, transparent: true, opacity: 0.4, depthWrite: false }));
    this.splashes.frustumCulled = false;
    this.splashes.visible = false;
    scene.add(this.lines, this.splashes);
  }

  /** amount 0..1; covered: a roof or the ground is over his head; feet: the height he stands at (the splashes). */
  update(t: number, cam: THREE.Vector3, amount: number, covered: boolean, feet = cam.y - 1.6) {
    const on = amount > 0.02 && !covered;
    this.lines.visible = this.splashes.visible = on;
    if (!on) return;
    const n = Math.floor(N * Math.min(1, amount));
    this.lines.geometry.setDrawRange(0, n * 2);
    const half = BOX / 2, wrap = (v: number) => ((v % BOX) + BOX) % BOX - half;
    for (let i = 0; i < n; i++) {
      // Each streak keeps its place in a box that tiles space, so the camera moves through still rain.
      const x = cam.x + wrap(this.seed[i * 3] - cam.x + t * FALL * SLANT), z = cam.z + wrap(this.seed[i * 3 + 2] - cam.z);
      const y = cam.y + wrap(this.seed[i * 3 + 1] - t * FALL - cam.y);
      const o = i * 6;
      this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z;
      this.pos[o + 3] = x - LEN * SLANT; this.pos[o + 4] = y + LEN; this.pos[o + 5] = z + 0.02;
    }
    (this.lines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.lines.material as THREE.LineBasicMaterial).opacity = 0.1 + 0.2 * amount;
    // Each splash is somewhere new each time it flicks up, a brief flash, then gone until its next.
    const m = Math.floor(SPLASH * Math.min(1, amount));
    this.splashes.geometry.setDrawRange(0, m);
    for (let i = 0; i < m; i++) {
      const cycle = Math.floor(t / FLASH + this.seed[i * 3] * 7), a = hash(cycle * 9973 + i) * 6.283, d = Math.sqrt(hash(cycle * 7919 + i * 31 + 5)) * AROUND;
      this.drops[i * 3] = cam.x + Math.cos(a) * d; this.drops[i * 3 + 1] = feet + 0.03; this.drops[i * 3 + 2] = cam.z + Math.sin(a) * d;
    }
    (this.splashes.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }
}
