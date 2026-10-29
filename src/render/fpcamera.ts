// First-person camera: eye height by posture, head bob, landing dip, wall-run tilt.
import * as THREE from 'three';
import type { Player } from '../sim/player';
import type { Vec3 } from '../sim/types';
import { movement as M } from '../data/movement';

export class FPCamera {
  readonly cam: THREE.PerspectiveCamera;
  baseFov = 75;
  /** 0 none, 0.5 sprain, 1 broken leg: an uneven step */
  limp = 0;
  private eye = M.eye.stand;
  private bob = 0;
  private dip = 0;
  private roll = 0;
  private fov = 75;
  /** 0..1 eased sprint amount */
  sprint = 0;

  constructor(aspect: number) {
    this.cam = new THREE.PerspectiveCamera(75, aspect, 0.05, 400);
    this.cam.rotation.order = 'YXZ';
  }

  landed(h: number) { if (h > 0.8) this.dip = Math.min(0.3, h * 0.045); }

  update(p: Player, pos: Vec3, yaw: number, pitch: number, dt: number) {
    let target = M.eye[p.posture];
    const k = 1 - Math.exp(-12 * dt);
    this.eye += (target - this.eye) * k;
    const sp = Math.hypot(p.vel.x, p.vel.z);
    const walking = p.onGround && p.mode === 'ground' && sp > 0.3;
    if (walking) this.bob += dt * sp * 2.2;
    const amp = walking ? Math.min(1, sp / 7) : 0;
    this.dip *= Math.exp(-6 * dt);
    // A slight lean away from the wall while clinging to it.
    let rollTarget = 0;
    if (p.mode === 'cling') rollTarget = 0.08 * Math.sign(p.wall.nx * Math.cos(yaw) - p.wall.nz * Math.sin(yaw));
    this.roll += (rollTarget - this.roll) * k;
    // Sprinting has to read clearly (U-003): FOV kick, harder bob, a slight lean.
    const sprinting = walking && sp > 5.5;
    this.sprint += ((sprinting ? 1 : 0) - this.sprint) * (1 - Math.exp(-6 * dt));
    this.fov += (this.baseFov + this.sprint * 9 - this.fov) * k;
    if (Math.abs(this.cam.fov - this.fov) > 0.01) { this.cam.fov = this.fov; this.cam.updateProjectionMatrix(); }
    const limpDip = this.limp * (walking ? Math.max(0, Math.sin(this.bob)) * 0.09 : 0);
    const bobAmp = amp * (1 + this.sprint * 0.8);
    const by = Math.abs(Math.sin(this.bob)) * 0.045 * bobAmp - limpDip, bx = Math.sin(this.bob) * 0.025 * bobAmp;
    this.cam.position.set(pos.x + Math.cos(yaw) * bx, pos.y + this.eye + by - this.dip, pos.z - Math.sin(yaw) * bx);
    this.cam.rotation.set(pitch - this.sprint * 0.04, yaw, this.roll + limpDip * 0.4 + Math.sin(this.bob) * 0.006 * this.sprint);
  }

  eyeHeight() { return this.eye; }
}
