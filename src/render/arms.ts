// Simple first-person arms so climbs, hangs and held items read clearly.
import * as THREE from 'three';
import type { Player } from '../sim/player';

interface Pose { l: THREE.Vector3; r: THREE.Vector3; lr: number; rr: number; vis: boolean }

const P = (lx: number, ly: number, lz: number, rx: number, ry: number, rz: number, lr = 0, rr = 0, vis = true): Pose =>
  ({ l: new THREE.Vector3(lx, ly, lz), r: new THREE.Vector3(rx, ry, rz), lr, rr, vis });

export class Arms {
  readonly group = new THREE.Group();
  private left: THREE.Group;
  private right: THREE.Group;
  readonly held = new THREE.Group();
  private t = 0;

  constructor() {
    const skin = new THREE.MeshLambertMaterial({ color: 0xb98a6a });
    const sleeve = new THREE.MeshLambertMaterial({ color: 0x2a2f36 });
    const arm = (side: number) => {
      const g = new THREE.Group();
      const fore = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.42), sleeve);
      fore.position.z = 0.2;
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.04, 0.11), skin);
      hand.position.z = -0.03;
      const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.06), skin);
      fingers.position.set(0, -0.015, -0.1);
      fingers.rotation.x = -0.5;
      g.add(fore, hand, fingers);
      g.position.x = side * 0.2;
      return g;
    };
    this.left = arm(-1);
    this.right = arm(1);
    this.right.add(this.held);
    this.held.position.set(0, -0.02, -0.08);
    this.group.add(this.left, this.right);
  }

  private pose(p: Player): Pose {
    const s = Math.sin(this.t * 6);
    switch (p.mode) {
      case 'hang': return P(-0.22, 0.42, -0.42, 0.22, 0.42, -0.42, 1.1, 1.1);
      case 'climb': return P(-0.18, 0.3 + s * 0.12, -0.38, 0.18, 0.3 - s * 0.12, -0.38, 1.0, 1.0);
      case 'action': {
        const a = p.act!;
        if (a.kind === 'vault') return P(-0.2, -0.3, -0.45, 0.2, -0.3, -0.45, -0.9, -0.9);
        if (a.kind === 'mantle' || a.kind === 'climbup') {
          const k = a.t / a.dur;
          return P(-0.24, 0.2 - k * 0.55, -0.45, 0.24, 0.2 - k * 0.55, -0.45, 0.8 - k * 1.6, 0.8 - k * 1.6);
        }
        return P(0, 0, 0, 0, 0, 0, 0, 0, false);
      }
      case 'wallrun': return P(-0.3, -0.05, -0.35, 0.3, -0.05, -0.35, 0.2, 0.2);
      case 'swim': return P(-0.25, -0.25 + s * 0.05, -0.45, 0.25, -0.25 - s * 0.05, -0.45, -0.2, -0.2);
      case 'hidden': case 'dead': return P(0, 0, 0, 0, 0, 0, 0, 0, false);
      default: return P(-0.3, -0.55, -0.3, 0.22, -0.3, -0.42, -0.2, 0, this.held.children.length > 0);
    }
  }

  update(p: Player, dt: number) {
    this.t += dt;
    const q = this.pose(p);
    this.group.visible = q.vis;
    if (!q.vis) return;
    const k = 1 - Math.exp(-14 * dt);
    this.left.position.lerp(q.l, k);
    this.right.position.lerp(q.r, k);
    this.left.rotation.x += (q.lr - this.left.rotation.x) * k;
    this.right.rotation.x += (q.rr - this.right.rotation.x) * k;
  }
}
