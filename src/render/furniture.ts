// Furniture he puts down (U-013): beds, crates, and the toolbox that turns a table into a workbench.
import * as THREE from 'three';
import type { SimState } from '../sim/types';
import type { World } from '../world/world';

const lam = (c: number) => new THREE.MeshLambertMaterial({ color: c });
const box = (w: number, h: number, d: number, m: THREE.Material, y = h / 2) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.y = y; return o; };

const MODELS: Record<string, () => THREE.Object3D> = {
  mattress: () => { const g = new THREE.Group(); g.add(box(0.9, 0.16, 1.9, lam(0x7d8790)), box(0.6, 0.1, 0.35, lam(0xb8b2a4), 0.21)); g.children[1].position.z = -0.7; return g; },
  bedroll: () => { const g = new THREE.Group(); g.add(box(0.7, 0.07, 1.9, lam(0x4f5a3a))); const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 10).rotateZ(Math.PI / 2), lam(0x3f4a2e)); roll.position.set(0, 0.12, -0.85); g.add(roll); return g; },
  foldcrate: () => box(0.6, 0.42, 0.42, lam(0x2d5a7a)),
  toolbox: () => { const g = new THREE.Group(); g.add(box(0.5, 0.22, 0.25, lam(0x9a2420)), box(0.3, 0.04, 0.03, lam(0x222222), 0.26)); return g; },
};

export class Furniture {
  readonly group = new THREE.Group();
  private sig = '';

  /** Rebuild when what's placed changes. */
  sync(s: SimState, w: World) {
    const benches = Object.keys(s.wstate.benches ?? {});
    const sig = s.placed.map(p => p.id).join() + '|' + benches.join();
    if (sig === this.sig) return;
    this.sig = sig;
    this.group.clear();
    for (const p of s.placed) {
      const m = MODELS[p.item]?.();
      if (!m) continue;
      m.position.set(p.x, p.y, p.z);
      m.rotation.y = p.yaw;
      this.group.add(m);
    }
    for (const id of benches) {
      const t = w.inter.find(i => i.id === id);
      if (!t) continue;
      const m = MODELS.toolbox();
      m.position.set(t.x, t.y, t.z);
      this.group.add(m);
    }
  }
}
