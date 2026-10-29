// First-person camera: eye height by posture, head bob, landing dip, wall-run tilt.
import * as THREE from 'three';
import type { Player } from '../sim/player';
import type { Vec3 } from '../sim/types';
import { movement as M } from '../data/movement';

export class FPCamera {
  readonly cam: THREE.PerspectiveCamera;
  baseFov = 75;
  private eye = M.eye.stand;
  private bob = 0;
  private dip = 0;
  private roll = 0;
  private fov = 75;

  constructor(aspect: number) {
    this.cam = new THREE.PerspectiveCamera(75, aspect, 0.05, 400);
    this.cam.rotation.order = 'YXZ';
  }

  landed(h: number) { if (h > 0.8) this.dip = Math.min(0.3, h * 0.045); }

  update(p: Player, pos: Vec3, yaw: number, pitch: number, dt: number) {
    let target = M.eye[p.posture];
    if (p.mode === 'hang') target = M.eye.stand - 0.15;
    const k = 1 - Math.exp(-12 * dt);
    this.eye += (target - this.eye) * k;
    const sp = Math.hypot(p.vel.x, p.vel.z);
    const walking = p.onGround && p.mode === 'ground' && sp > 0.3;
    if (walking) this.bob += dt * sp * 2.2;
    const amp = walking ? Math.min(1, sp / 7) : 0;
    this.dip *= Math.exp(-6 * dt);
    let rollTarget = 0;
    if (p.mode === 'wallrun') {
      const side = Math.sign(p.wall.nx * Math.cos(yaw) - p.wall.nz * Math.sin(yaw));
      rollTarget = 0.14 * side;
    }
    this.roll += (rollTarget - this.roll) * k;
    const sprintFov = sp > 6 ? 6 : 0;
    this.fov += (this.baseFov + sprintFov - this.fov) * k;
    if (Math.abs(this.cam.fov - this.fov) > 0.01) { this.cam.fov = this.fov; this.cam.updateProjectionMatrix(); }
    const by = Math.abs(Math.sin(this.bob)) * 0.045 * amp, bx = Math.sin(this.bob) * 0.025 * amp;
    this.cam.position.set(pos.x + Math.cos(yaw) * bx, pos.y + this.eye + by - this.dip, pos.z - Math.sin(yaw) * bx);
    this.cam.rotation.set(pitch, yaw, this.roll);
  }

  eyeHeight() { return this.eye; }
}
