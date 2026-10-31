// Held items as small 3D models in the same lit style as the hands (U-006).
// Each model is built around the fist: the part he grips sits at the origin running along X (through the
// curled fingers). He holds things in a handshake grip, so -X is up in his view and -Z is forward.
import * as THREE from 'three';
import { item } from '../data/items';

const M = (color: number, rough = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const steel = M(0x4a4f55, 0.45, 0.6), dark = M(0x1d1f22, 0.5, 0.3), rubber = M(0x222222, 0.9), red = M(0x9a2420, 0.6), wood = M(0x6b4a2e, 0.8);
const yellow = M(0xc9a227, 0.6), white = M(0xd8d4c8, 0.8), plastic = M(0x2d4a5a, 0.6), olive = M(0x4a5236, 0.8), glass = M(0x6f9fb0, 0.2, 0.1);

const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
const cyl = (r: number, l: number, m: THREE.Material, axis: 'x' | 'y' | 'z' = 'x', x = 0, y = 0, z = 0, r2 = r) => {
  const g = new THREE.CylinderGeometry(r, r2, l, 14);
  if (axis === 'x') g.rotateZ(Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o;
};
const group = (...o: THREE.Object3D[]) => { const g = new THREE.Group(); g.add(...o); return g; };

/** The QSZ-92 (M4-21b, U-032): a raked polymer grip with its magazine's base, the frame and trigger guard, the steel
 *  slide (named, to run back as it fires) with its sights and ejection port, the barrel's crown, and a muzzle flash
 *  (named, hidden until a shot). */
function pistol() {
  const poly = M(0x2c2f32, 0.7, 0.05), slideMat = M(0x464b52, 0.4, 0.5);
  const grip = group(box(0.105, 0.03, 0.036, poly), box(0.012, 0.032, 0.038, dark, 0.058, 0, 0.002), ...[0, 1, 2, 3].map(k => box(0.006, 0.031, 0.037, rubber, -0.03 + k * 0.022, 0, 0)));
  grip.rotation.y = -0.32; grip.position.set(0.012, 0, 0.012);
  const slide = group(box(0.032, 0.028, 0.19, slideMat), box(0.008, 0.006, 0.006, dark, -0.019, 0, -0.088), box(0.008, 0.012, 0.006, dark, -0.019, 0, 0.088), box(0.004, 0.004, 0.004, white, -0.024, 0, 0.088),
    box(0.012, 0.0285, 0.035, dark, -0.004, 0, -0.005), ...[0, 1, 2, 3, 4].map(k => box(0.02, 0.0285, 0.003, dark, 0, 0, 0.06 + k * 0.007)));
  slide.name = 'slide'; slide.position.set(-0.066, 0, -0.062);
  const flash = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 7, 1, true).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  flash.name = 'flash'; flash.position.set(-0.066, 0, -0.24); flash.visible = false;
  return group(grip, box(0.026, 0.026, 0.16, poly, -0.042, 0, -0.07), box(0.004, 0.022, 0.05, poly, -0.012, 0, -0.04), box(0.032, 0.022, 0.004, poly, -0.03, 0, -0.065), box(0.016, 0.006, 0.006, steel, -0.022, 0, -0.03),
    slide, cyl(0.0065, 0.012, steel, 'z', -0.07, 0, -0.16), cyl(0.0035, 0.013, rubber, 'z', -0.07, 0, -0.161), flash);
}

const models: Record<string, () => THREE.Object3D> = {
  crowbar: () => group(cyl(0.012, 0.6, steel, 'x', -0.2), box(0.012, 0.03, 0.07, steel, -0.5, 0, -0.03), box(0.05, 0.012, 0.03, steel, 0.1, 0, -0.02)),
  knife: () => group(box(0.1, 0.03, 0.022, rubber), box(0.13, 0.004, 0.028, steel, -0.11, 0, 0)),
  pistol: () => pistol(),
  shotgun: () => group(box(0.04, 0.12, 0.05, wood, 0, -0.02, 0.08), cyl(0.013, 0.7, dark, 'z', 0, 0.05, -0.3), box(0.05, 0.05, 0.3, wood, 0, 0.03, 0.25)),
  nailgun: () => group(box(0.12, 0.04, 0.04, yellow, 0.01), box(0.08, 0.06, 0.26, yellow, -0.07, 0, -0.08), box(0.03, 0.03, 0.05, dark, -0.07, 0, -0.23)),
  boltcutters: () => group(cyl(0.012, 0.45, rubber, 'x', -0.1), cyl(0.012, 0.45, rubber, 'x', -0.1, 0, -0.04), box(0.12, 0.02, 0.05, steel, -0.38, 0, -0.02)),
  grapple: () => group(cyl(0.012, 0.18, steel, 'x', -0.08), ...[0, 1, 2].map(k => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 10, Math.PI), steel); t.rotation.set((k * Math.PI * 2) / 3, 0, -Math.PI / 2); t.position.x = -0.18; return t; })),
  rope: () => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 16), M(0x8a7a50, 0.9)); t.rotation.y = Math.PI / 2; return t; },
  ladder: () => group(box(0.5, 0.03, 0.05, steel, 0.15, -0.12, 0), box(0.5, 0.03, 0.05, steel, 0.15, 0.12, 0), ...[0, 1, 2].map(k => box(0.02, 0.24, 0.02, steel, -0.05 + k * 0.2))),
  extinguisher: () => group(cyl(0.06, 0.32, red, 'x', 0.14), box(0.03, 0.05, 0.06, dark, -0.04, 0, 0)),
  firecrackers: () => group(...Array.from({ length: 8 }, (_, k) => cyl(0.009, 0.05, red, 'y', 0.03 + k * 0.03, -0.03 * (k % 2)))),
  grenade: () => group(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), olive), box(0.02, 0.03, 0.02, steel, 0, 0.045, 0)),
  emp: () => group(cyl(0.04, 0.18, dark, 'x', 0.06), new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 14), M(0xb36a2a, 0.4, 0.8))),
  jammer: () => group(box(0.13, 0.03, 0.08, dark, 0.04), ...[0, 1, 2].map(k => cyl(0.004, 0.12, rubber, 'y', -0.0 + k * 0.04, 0.07, -0.03))),
  sdr: () => group(box(0.06, 0.012, 0.02, plastic), cyl(0.003, 0.08, rubber, 'y', 0.03, 0.04)),
  dronectl: () => group(box(0.16, 0.03, 0.1, dark, 0.04), cyl(0.008, 0.02, rubber, 'y', 0.0, 0.025, -0.02), cyl(0.008, 0.02, rubber, 'y', 0.08, 0.025, -0.02)),
  binoculars: () => group(cyl(0.025, 0.11, dark, 'z', 0, 0, 0), cyl(0.025, 0.11, dark, 'z', 0.06, 0, 0)),
  headlamp: () => group(cyl(0.02, 0.03, dark, 'z'), new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 6, 18), rubber)),
  water: () => group(cyl(0.032, 0.21, glass, 'x', -0.03), cyl(0.014, 0.03, white, 'x', -0.15)),
  riverwater: () => group(cyl(0.032, 0.21, M(0x7a7a5a, 0.3), 'x', -0.03), cyl(0.014, 0.03, white, 'x', -0.15)),
  bottle: () => group(cyl(0.032, 0.21, glass, 'x', -0.03), cyl(0.014, 0.03, white, 'x', -0.15)),
  energy: () => cyl(0.027, 0.13, M(0xc9a227, 0.4, 0.4), 'x'),
  luncheon: () => cyl(0.045, 0.1, M(0xb02a24, 0.4, 0.5), 'x'),
  noodles: () => cyl(0.05, 0.1, M(0xd8483a, 0.7), 'x', 0, 0, 0, 0.042),
  bread: () => box(0.2, 0.09, 0.1, M(0xb57a3c, 0.9), 0.04),
  chocolate: () => box(0.14, 0.012, 0.06, M(0x5a3020, 0.6), 0.03),
  firstaid: () => group(box(0.18, 0.1, 0.07, M(0xd0d0c8, 0.7), 0.04), box(0.06, 0.02, 0.075, red, 0.04), box(0.02, 0.06, 0.075, red, 0.04)),
  bandage: () => cyl(0.03, 0.06, white, 'x'),
  painkillers: () => cyl(0.018, 0.06, white, 'x'),
  phone: () => box(0.075, 0.15, 0.008, dark, 0, 0.04),
  cameratap: () => group(box(0.05, 0.03, 0.02, plastic), box(0.02, 0.005, 0.03, steel, 0.035)),
  cloner: () => box(0.08, 0.05, 0.015, plastic, 0.02, 0.01),
  grinder: () => group(cyl(0.03, 0.22, M(0x2a6a9a, 0.6), 'x', -0.05), cyl(0.06, 0.006, M(0x777777, 0.4, 0.5), 'z', -0.17, 0, -0.04)),
  oxygen: () => group(cyl(0.05, 0.4, M(0x3a7a4a, 0.4, 0.3), 'x', 0.12), box(0.04, 0.04, 0.04, steel, -0.1)),
  jerrycan: () => box(0.22, 0.3, 0.12, M(0x6a7a3a, 0.7), 0.05, -0.1),
  carbattery: () => box(0.28, 0.18, 0.17, dark, 0.06, -0.08),
  mylar: () => box(0.08, 0.04, 0.05, M(0xc0c4c8, 0.2, 0.9)),
};

const CAT_COLOR: Record<string, number> = { food: 0xb08a3a, drink: 0x5a8ab0, tool: 0x5a5e62, weapon: 0x2a2c2e, ammo: 0x8a7a40, med: 0xd0ccc0, part: 0x40707a, key: 0xc8a840, wear: 0x4a5a3a, throw: 0x6a4a3a, device: 0x2a3a40, misc: 0x707070 };

// Where the left hand grips on two-handed items (model space); others get a fist stacked above the right one.
const SUPPORT: Record<string, [number, number, number]> = {
  crowbar: [-0.18, 0, 0], boltcutters: [-0.12, 0, -0.04], shotgun: [0, 0.05, -0.32], nailgun: [-0.07, 0, -0.15], pistol: [0.035, -0.05, 0.01],
  extinguisher: [0.1, -0.06, 0], oxygen: [0.12, -0.05, 0], grinder: [-0.12, 0, 0], ladder: [0.05, -0.2, 0], jerrycan: [0.05, -0.2, 0], carbattery: [0.06, -0.22, 0],
  binoculars: [0.09, 0, 0], water: [-0.09, 0, 0], riverwater: [-0.09, 0, 0], bottle: [-0.09, 0, 0],
};

/** Small things (keys, cards, pills, a phone, small devices) and the knife are held in one hand (U-007). */
export function oneHanded(id: string): boolean {
  const d = item(id);
  return id === 'knife' || d.cat === 'key' || (d.w * d.h === 1 && d.kg <= 0.4);
}

/** Where the left hand grips the held item, in model space; null for one-handed items. */
export function supportPoint(id: string): THREE.Vector3 | null {
  if (oneHanded(id)) return null;
  const at = SUPPORT[id];
  if (at) return new THREE.Vector3(...at);
  const d = item(id);
  return new THREE.Vector3(-Math.min(0.25, Math.max(0.09, Math.max(d.w, d.h) * 0.04)), 0, 0);
}

/** The item model for a held item: a dedicated shape, or a box sized from its backpack footprint. */
export function itemModel(id: string): THREE.Object3D {
  const make = models[id];
  if (make) return make();
  const d = item(id);
  if (d.cat === 'key') return box(0.085, 0.054, 0.004, M(0xc8a840, 0.5, 0.3), 0.02, 0.02);
  const long = Math.max(d.w, d.h), short = Math.min(d.w, d.h);
  return box(0.04 + long * 0.05, 0.03 + short * 0.025, 0.04 + short * 0.03, M(CAT_COLOR[d.cat] ?? 0x777777, 0.7), 0.03);
}

export const modelledItems = () => Object.keys(models);
