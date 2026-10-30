// Under the river (M3-48, U-021): with his head under the surface the water closes in murky green-brown, sight
// short, the light dim and wavering, silt drifting past; the surface hangs overhead, lit from above. The moment
// his head is out it's all gone.
import * as THREE from 'three';
import type { World } from '../world/world';
import type { View } from './view';

/** Silt in a box this big round the camera, wrapping as he moves. */
const BOX = 14, N = 900;

export class Underwater {
  readonly silt: THREE.Points;
  /** The surface from below: lit from above, paler overhead and fading into the murk. */
  private readonly sheet = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: 0x5a6a44, side: THREE.DoubleSide }));
  private readonly base = new Float32Array(N * 3);

  constructor(private view: View) {
    for (let i = 0; i < N * 3; i++) this.base[i] = Math.random() * BOX;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.silt = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8a8460, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false }));
    this.silt.frustumCulled = false;
    this.silt.visible = false;
    this.sheet.rotation.x = Math.PI / 2;
    this.sheet.visible = false;
    view.scene.add(this.silt, this.sheet);
  }

  /** Whether the camera is under water: then the fog, light and silt turn murky (after the sky has set them). */
  update(world: World, t: number): boolean {
    const c = this.view.fp.cam.position, w = world.water.find(w => c.x > w.x0 && c.x < w.x1 && c.z > w.z0 && c.z < w.z1 && c.y < w.y1 && c.y > w.y0);
    this.silt.visible = this.sheet.visible = !!w;
    if (!w) return false;
    this.sheet.position.set(c.x, w.y1 - 0.02, c.z);
    const fog = this.view.scene.fog as THREE.Fog, wave = 1 + 0.12 * Math.sin(t * 1.7) + 0.06 * Math.sin(t * 4.3 + 1);
    fog.color.setHex(0x2a3322).multiplyScalar(wave);
    fog.near = 0.3; fog.far = 9;
    (this.view.scene.background as THREE.Color).copy(fog.color);
    this.view.sun.intensity *= 0.1 * wave;
    this.view.hemi.intensity *= 0.25 * wave;
    // The silt drifts slowly downstream and settles, wrapping round the camera.
    const p = this.silt.geometry.getAttribute('position') as THREE.BufferAttribute, a = p.array as Float32Array;
    for (let i = 0; i < N; i++) {
      const x = this.base[i * 3] + t * 0.15, y = this.base[i * 3 + 1] - t * 0.04, z = this.base[i * 3 + 2] + Math.sin(t * 0.5 + i) * 0.2;
      a[i * 3] = c.x - BOX / 2 + (((x - c.x) % BOX) + BOX) % BOX;
      a[i * 3 + 1] = c.y - BOX / 2 + (((y - c.y) % BOX) + BOX) % BOX;
      a[i * 3 + 2] = c.z - BOX / 2 + (((z - c.z) % BOX) + BOX) % BOX;
    }
    p.needsUpdate = true;
    return true;
  }
}
