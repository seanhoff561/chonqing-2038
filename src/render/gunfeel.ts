// Guns made real (M4-21b, U-032): aiming down the sights (right mouse) brings the pistol up to the eye, its sights on
// the middle of the view, and zooms; each shot flashes at the muzzle, runs the slide back and kicks the gun up and
// back into his hands, settling. The camera's own kick (the sim's) and his lean are FPCamera's.
import * as THREE from 'three';

/** The pistol's rear sight in model space, and where it comes to in the camera's aimed. */
const SIGHT = new THREE.Vector3(-0.09, 0, 0.026), EYE = new THREE.Vector3(0, -0.004, -0.3), BARREL = new THREE.Vector3(0, 0, -1);

export class GunFeel {
  /** 0 hip to 1 aimed, eased */
  ads = 0;
  private kick = 0;
  private flash = 0;
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();

  fired() { this.kick = 1; this.flash = 0.05; }

  /** Each frame, before the camera: raising the gun to the eye or lowering it. */
  aim(dt: number, aiming: boolean) { this.ads += ((aiming ? 1 : 0) - this.ads) * (1 - Math.exp(-14 * dt)); }

  /** Each frame, after the hands: their group (in camera space) placed for the aim and kick, the held model's slide
   *  and flash. */
  update(dt: number, group: THREE.Group, held: THREE.Object3D | null) {
    this.kick *= Math.exp(-14 * dt);
    this.flash = Math.max(0, this.flash - dt);
    group.position.set(0, 0, 0); group.quaternion.identity();
    if (!held) return;
    const slide = held.getObjectByName('slide'), flash = held.getObjectByName('flash');
    if (slide) slide.position.z = -0.062 + 0.028 * Math.min(1, this.kick * 1.6);
    if (flash) { flash.visible = this.flash > 0; flash.rotation.z = Math.random() * Math.PI; }
    // The barrel turned onto the view's axis (about the sight, held low at the hip); aimed, the sight at the eye.
    held.updateWorldMatrix(true, false);
    const cam = group.parent!, inv = new THREE.Matrix4().copy(cam.matrixWorld).invert();
    const m = new THREE.Matrix4().multiplyMatrices(inv, held.matrixWorld), sight = SIGHT.clone().applyMatrix4(m);
    const barrel = BARREL.clone().transformDirection(m);
    this.q.setFromUnitVectors(barrel, BARREL);
    group.quaternion.copy(this.q);
    this.v.copy(sight).applyQuaternion(this.q);
    group.position.copy(sight).lerp(EYE, this.ads).sub(this.v);
    // The kick: up at the muzzle and back.
    group.rotateX(0.16 * this.kick);
    group.position.z += 0.035 * this.kick;
  }
}
