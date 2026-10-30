// Hidden, he sees the inside of what he's in (M3-47, U-021), not through it: a crate's slats with daylight
// between them, a dumpster's walls under a lid propped open a crack, a wardrobe's door crack with coats hanging,
// a car boot's carpet under a lid not quite shut, a van's ribbed load space, a drum's or a tank's curved wall with
// light round the lid, a kiosk's counter under its shutter. Built per kind and size, inside out, set round the
// camera while he's in it.
import * as THREE from 'three';
import type { HideSpot } from '../world/world';

const mats = new Map<number, THREE.Material>();
/** A surface seen from inside: both faces, so a shell reads whichever way it's built. */
const mat = (color: number) => { let m = mats.get(color); if (!m) mats.set(color, (m = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }))); return m; };
const box = (g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, color: number, rx = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z); m.rotation.x = rx; g.add(m);
};

/** Walls, floor and lid of a w x h x d space (floor at 0, centred), each a slab t thick just outside it; gaps
 *  say where light comes in. */
function shell(kind: string, w: number, h: number, d: number): THREE.Group {
  const g = new THREE.Group(), t = 0.03, W = w / 2 + t / 2, D = d / 2 + t / 2;
  /** Floor, walls and (with lid) the top; the front wall (+z) stops `gap` short of the floor, or `top` short of
   *  the lid. */
  const walls = (c: number, lid: boolean, gap = 0, top = 0) => {
    box(g, w + 2 * t, t, d + 2 * t, 0, -t / 2, 0, c);
    box(g, t, h, d + 2 * t, -W, h / 2, 0, c); box(g, t, h, d + 2 * t, W, h / 2, 0, c);
    box(g, w, h, t, 0, h / 2, -D, c); box(g, w, h - gap - top, t, 0, gap + (h - gap - top) / 2, D, c);
    if (lid) box(g, w + 2 * t, t, d + 2 * t, 0, h + t / 2, 0, c);
  };
  switch (kind) {
    case 'crate': case 'box': {
      // Slats, a hand's width each, with a finger of daylight between.
      box(g, w + 2 * t, t, d + 2 * t, 0, -t / 2, 0, 0x6a5238);
      for (let y = 0.02; y < h; y += 0.15) {
        const s = Math.min(0.12, h - y);
        box(g, t, s, d + 2 * t, -W, y + s / 2, 0, 0x7a6042); box(g, t, s, d + 2 * t, W, y + s / 2, 0, 0x7a6042);
        box(g, w, s, t, 0, y + s / 2, -D, 0x7a6042); box(g, w, s, t, 0, y + s / 2, D, 0x7a6042);
      }
      for (let x = -w / 2; x < w / 2; x += 0.15) box(g, Math.min(0.12, w / 2 - x), t, d + 2 * t, x + 0.06, h + t / 2, 0, 0x6a5238);
      break;
    }
    case 'dumpster': {
      // Steel walls; one lid down, the other propped a few centimetres on something.
      walls(0x2e3a30, false);
      box(g, w / 2 + t, t, d + 2 * t, -w / 4, h + t / 2, 0, 0x1a1c1e);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(w / 2 + t, t, d + 2 * t), mat(0x1a1c1e));
      lid.position.set(w / 4, h + 0.04, 0); lid.rotation.x = -0.12; g.add(lid);
      box(g, 0.3, 0.12, 0.25, w / 4, 0.06, -d / 4, 0x2a3a2a); box(g, 0.35, 0.18, 0.3, -w / 4, 0.09, d / 5, 0x1e2420);
      break;
    }
    case 'wardrobe': {
      // Wood all round; the doors meet with a crack of light down the middle; coats hang in front of his face.
      box(g, w + 2 * t, t, d + 2 * t, 0, -t / 2, 0, 0x4a3828);
      box(g, t, h, d + 2 * t, -W, h / 2, 0, 0x5a4430); box(g, t, h, d + 2 * t, W, h / 2, 0, 0x5a4430);
      box(g, w, h, t, 0, h / 2, -D, 0x5a4430); box(g, w + 2 * t, t, d + 2 * t, 0, h + t / 2, 0, 0x4a3828);
      box(g, w / 2 - 0.015, h, t, -w / 4 - 0.0075, h / 2, D, 0x5a4430); box(g, w / 2 - 0.015, h, t, w / 4 + 0.0075, h / 2, D, 0x5a4430);
      box(g, w - 0.1, 0.02, 0.02, 0, h - 0.15, -d / 4, 0x8a8a8a);
      for (let x = -w / 2 + 0.15; x < w / 2 - 0.1; x += 0.22) box(g, 0.05, 0.9, 0.45, x, h - 0.65, -d / 4, [0x3a3a4a, 0x6a2a2a, 0x2a4a3a, 0x8a7a5a][Math.round(x * 10) & 3]);
      break;
    }
    case 'boot': {
      // Carpet round him, the lid down on its latch but not shut: a slit of light along the back.
      box(g, w + 2 * t, t, d + 2 * t, 0, -t / 2, 0, 0x2a2a2c);
      box(g, t, h, d + 2 * t, -W, h / 2, 0, 0x2e2e30); box(g, t, h, d + 2 * t, W, h / 2, 0, 0x2e2e30);
      box(g, w, h, t, 0, h / 2, D, 0x2e2e30); box(g, w, h - 0.04, t, 0, (h - 0.04) / 2, -D, 0x3a3a3c);
      box(g, w + 2 * t, t, d + 2 * t, 0, h + t / 2, 0.02, 0x222224);
      box(g, 0.5, 0.15, 0.3, w / 4, 0.075, d / 5, 0x4a3a2a);
      break;
    }
    case 'van': {
      // A van's load space: ribbed steel, a strip of light under the back doors.
      walls(0x5a5e62, true, 0.04);
      for (let z = -d / 2 + 0.3; z < d / 2; z += 0.5) for (const x of [-W + 0.03, W - 0.03]) box(g, 0.04, h, 0.06, x, h / 2, z, 0x4a4e52);
      break;
    }
    case 'drum': case 'tank': {
      // A curved wall round him, the lid off by a hand's breadth.
      const r = Math.min(w, d) / 2 + t, c = kind === 'drum' ? 0x2a4a7a : 0x4a5052;
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20, 1, true), mat(c));
      wall.position.y = h / 2; g.add(wall);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat(c)); floor.rotation.x = -Math.PI / 2; g.add(floor);
      const lid = new THREE.Mesh(new THREE.CircleGeometry(r * 1.05, 20), mat(c)); lid.rotation.x = Math.PI / 2; lid.position.set(r * 0.25, h + 0.02, 0); g.add(lid);
      break;
    }
    default: {
      // A kiosk or a cabinet: walls all round, its shutter down to a hand's breadth off the counter.
      walls(0x2a3a32, true, h * 0.45);
      box(g, w, h * 0.35, t, 0, h * 0.175, d / 2 + t / 2, 0x2a3a32);
      box(g, w, 0.05, 0.4, 0, h * 0.35, d / 2 - 0.2, 0x5a5a56);
    }
  }
  return g;
}

export class HideView {
  readonly group = new THREE.Group();
  private key = '';

  /** Show the inside of the place he's hidden in (or nothing). */
  update(h: HideSpot | null) {
    if (!h) { this.group.visible = false; return; }
    const b = h.inner, w = b.x1 - b.x0, ht = b.y1 - b.y0, d = b.z1 - b.z0, key = `${h.id}:${h.kind}:${b.x0}:${b.z0}`;
    if (key !== this.key) {
      this.key = key;
      this.group.clear();
      this.group.add(shell(h.kind, w, ht, d));
      this.group.position.set((b.x0 + b.x1) / 2, b.y0, (b.z0 + b.z1) / 2);
      this.group.rotation.y = h.yaw ?? 0;
    }
    this.group.visible = true;
  }
}
