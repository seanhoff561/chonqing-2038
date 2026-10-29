// Set dressing built from code by prop kind.
import * as THREE from 'three';
import type { Prop } from '../world/world';
import { material } from './materials';
import { MAT } from '../world/mats';
import { textTexture } from './textures';
import { mergeGeometries } from './view';

const lam = (color: number, emissive = 0) => new THREE.MeshLambertMaterial({ color, emissive });
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);

type Builder = (p: Prop) => THREE.Object3D;

/** Brick vault over the chamber: walls to 1.8 m, an elliptical vault to the crown, ribs every 2.5 m. */
function arches(p: Prop): THREE.Object3D {
  const g = new THREE.Group();
  const L = p.w!, W = p.d!, spring = 1.8, rise = p.h! - spring;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const seg = 12;
  for (let i = 0; i < seg; i++) {
    const a0 = (Math.PI * i) / seg, a1 = (Math.PI * (i + 1)) / seg;
    const z0 = Math.cos(a0) * W / 2, y0 = spring + Math.sin(a0) * rise, z1 = Math.cos(a1) * W / 2, y1 = spring + Math.sin(a1) * rise;
    const nz = -(Math.cos(a0) + Math.cos(a1)) / 2, ny = -(Math.sin(a0) + Math.sin(a1)) / 2;
    // The vault opens where the vent shaft rises.
    const spans: [number, number][] = p.gap && Math.abs(z0) < 1.3 && Math.abs(z1) < 1.3 ? [[0, p.gap[0]], [p.gap[1], L]] : [[0, L]];
    for (const [a, b] of spans) {
      const quad = [[a, y0, z0], [b, y1, z1], [b, y0, z0], [a, y0, z0], [a, y1, z1], [b, y1, z1]];
      const u = [[a, i], [b, i + 1], [b, i], [a, i], [a, i + 1], [b, i + 1]];
      quad.forEach((q, k) => { pos.push(q[0], q[1], q[2]); nor.push(0, ny, nz); uv.push(u[k][0] / 2, u[k][1] * 0.35); });
    }
  }
  // Brick wall facings from floor to the springing line.
  for (const side of [-1, 1]) {
    const z = side * (W / 2 - 0.01);
    const quad = side < 0 ? [[0, 0, z], [L, 0, z], [L, spring, z], [0, 0, z], [L, spring, z], [0, spring, z]] : [[L, 0, z], [0, 0, z], [0, spring, z], [L, 0, z], [0, spring, z], [L, spring, z]];
    for (const q of quad) { pos.push(q[0], q[1], q[2]); nor.push(0, 0, -side); uv.push(q[0] / 2, q[1] / 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const vault = new THREE.Mesh(geo, material(MAT.brick));
  g.add(vault);
  const ribs: THREE.BufferGeometry[] = [];
  for (let x = 1.25; x < L; x += 2.5)
    for (let i = 0; i < seg; i++) {
      const a = (Math.PI * (i + 0.5)) / seg;
      const r = new THREE.BoxGeometry(0.25, 0.12, (Math.PI * W) / 2 / seg + 0.05);
      r.rotateX(-a + Math.PI / 2).translate(x, spring + Math.sin(a) * rise - 0.04, Math.cos(a) * (W / 2 - 0.04));
      ribs.push(r);
    }
  g.add(new THREE.Mesh(mergeGeometries(ribs), material(MAT.brick)));
  return g;
}

function lamp(): THREE.Object3D {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.05, 10).translate(0, 0.025, 0), lam(0x333333)));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10).translate(0, 0.12, 0), lam(0xffd9a0, 0xffb060)));
  const light = new THREE.PointLight(0xffb870, 6, 14, 1.6);
  light.position.y = 0.3;
  g.add(light);
  return g;
}

/** Neon sign: emissive canvas text, optionally vertical. */
function neon(p: Prop): THREE.Object3D {
  const vertical = (p.h ?? 0) > (p.w ?? 1);
  const text = vertical ? p.text!.split('').join('\n') : p.text!;
  const colors = ['#ff3b6b', '#3bd6ff', '#ffcf3b', '#7dff6a', '#ff7a2f'];
  const fg = colors[(p.text!.charCodeAt(0) + p.text!.length) % colors.length];
  const g = new THREE.Group();
  if (vertical) {
    const chars = p.text!.split('');
    chars.forEach((ch, i) => {
      const { tex } = textTexture(ch, { fg, size: 64, pad: 6 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w!, p.w!), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: true }));
      m.position.y = -i * p.w! * 1.05;
      g.add(m);
    });
  } else {
    const { tex, aspect } = textTexture(text, { fg, size: 64, pad: 8 });
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(p.h! * aspect, p.h!), new THREE.MeshBasicMaterial({ map: tex, transparent: true })));
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x0a0a0c }));
  back.position.z = -0.03;
  g.add(back);
  g.userData.fit = () => {
    const bb = new THREE.Box3().setFromObject(g.children[0]);
    if (vertical) { back.scale.set(p.w! * 1.2, p.text!.length * p.w! * 1.05 + 0.1, 1); back.position.y = -(p.text!.length - 1) * p.w! * 0.525; }
    else back.scale.set(bb.max.x - bb.min.x + 0.2, p.h! * 1.2, 1);
  };
  g.userData.fit();
  return g;
}

/** A sweeping searchlight beam: a long additive cone that pans. */
function searchlight(p: Prop): THREE.Object3D {
  const g = new THREE.Group();
  const len = p.d ?? 60;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(len * 0.12, len, 20, 1, true).translate(0, -len / 2, 0).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  cone.rotation.x = 0.2;
  const pivot = new THREE.Group();
  pivot.add(cone);
  g.add(pivot);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.5, 10), lam(0x333333, 0x666666)));
  const phase = p.x * 0.13;
  g.userData.tick = (t: number) => { pivot.rotation.y = Math.sin(t * 0.25 + phase) * 1.2; pivot.rotation.x = 0.7 + Math.sin(t * 0.17 + phase) * 0.25; };
  return g;
}

/** Scripted machines crossing over the hideout grate: decor only, they cannot perceive anything. */
function patrolDecor(): THREE.Object3D {
  const g = new THREE.Group();
  const drone = new THREE.Group();
  drone.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.6), lam(0x222428)));
  for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) drone.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12).translate(x, 0.1, z), lam(0x555555)));
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe8f0ff }));
  led.position.y = -0.1;
  drone.add(led);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.5, 14, 16, 1, true).translate(0, -7, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  drone.add(beam);
  const bot = new THREE.Group();
  bot.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 1.1).translate(0, 0.65, 0), lam(0x2e3034)));
  for (const [x, z] of [[-0.25, -0.4], [0.25, -0.4], [-0.25, 0.4], [0.25, 0.4]]) bot.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08).translate(x, 0.27, z), lam(0x3a3c40)));
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05).translate(0, 0.75, -0.58), new THREE.MeshBasicMaterial({ color: 0xe8f0ff }));
  bot.add(eye);
  g.add(drone, bot);
  g.userData.tick = (t: number) => {
    const a = t * 0.15;
    drone.position.set(Math.sin(a) * 18, 9 + Math.sin(t * 0.6) * 0.5, Math.sin(a * 2) * 5);
    const k = ((t * 0.06) % 1) * 2 - 1;
    bot.position.set(k * 22, 0, 1.6);
    bot.rotation.y = -Math.PI / 2;
    for (let i = 1; i <= 4; i++) bot.children[i].rotation.x = Math.sin(t * 6 + i * Math.PI / 2) * 0.4;
  };
  return g;
}

const builders: Record<string, Builder> = {
  arches,
  lamp,
  neon,
  searchlight,
  patrolDecor,
  // A hinged door slab: w wide, h tall, d thick; text is its interactable id. Swings open with the world state.
  door: p => {
    const g = new THREE.Group();
    const slab = new THREE.Mesh(box(p.w!, p.h!, p.d ?? 0.06, p.w! / 2, 0, 0), material(MAT.metal));
    g.add(slab);
    let a = 0;
    g.userData.tick = (_t: number, open: Record<string, boolean>) => { a += ((open[p.text!] ? 1.45 : 0) - a) * 0.15; slab.rotation.y = a; };
    return g;
  },
  stilts: p => {
    const parts: THREE.BufferGeometry[] = [];
    const o = p.w! / 2 - 0.1;
    for (const [x, z] of [[-o, -o], [o, -o], [-o, o], [o, o]]) parts.push(new THREE.BoxGeometry(0.1, p.h!, 0.1).translate(x, p.h! / 2, z));
    return new THREE.Mesh(mergeGeometries(parts), material(MAT.metal));
  },
  neonGlow: () => { const l = new THREE.PointLight(0xff3b8b, 5, 16, 1.5); return l; },
  mattress: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(box(2.0, 0.16, 1.1, 0, -0.16, 0), lam(0x5d5546)));
    g.add(new THREE.Mesh(box(0.5, 0.1, 0.8, -0.7, 0, 0), lam(0x7a7262)));
    g.add(new THREE.Mesh(box(1.2, 0.04, 1.05, 0.35, 0, 0.02), lam(0x3d4a52)));
    return g;
  },
  workbench: () => {
    const g = new THREE.Group();
    const wood = lam(0x5a4632), steel = lam(0x55595c);
    g.add(new THREE.Mesh(box(2.4, 0.06, 0.75, 0, -0.06, 0), wood));
    for (const [x, z] of [[-1.1, -0.3], [1.1, -0.3], [-1.1, 0.3], [1.1, 0.3]]) g.add(new THREE.Mesh(box(0.06, 0.84, 0.06, x, -0.9, z), steel));
    g.add(new THREE.Mesh(box(0.2, 0.12, 0.15, 0.95, 0, -0.2), steel));
    g.add(new THREE.Mesh(box(0.35, 0.03, 0.25, -0.1, 0, 0.05), lam(0x2a3a2a)));
    g.add(new THREE.Mesh(box(0.25, 0.08, 0.1, 0.4, 0, 0.15), lam(0x8a2a20)));
    return g;
  },
  crate: p => new THREE.Mesh(box(p.w!, p.h!, p.d!, 0, 0, 0), material(MAT.crate)),
  carbattery: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(box(0.3, 0.19, 0.18, 0, 0, 0), lam(0x1a1a1a)));
    g.add(new THREE.Mesh(box(0.03, 0.03, 0.03, -0.1, 0.19, 0), lam(0xaa2020)));
    g.add(new THREE.Mesh(box(0.03, 0.03, 0.03, 0.1, 0.19, 0), lam(0x202020)));
    return g;
  },
  inverter: () => new THREE.Mesh(box(0.22, 0.08, 0.14, 0, 0, 0), lam(0x6a6e70)),
  rubble: p => {
    const g = new THREE.Group();
    const m = material(MAT.stone);
    for (let i = 0; i < 9; i++) {
      const r = 0.25 + ((i * 37) % 10) / 25;
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), m);
      s.position.set(((i * 53) % 10) / 10 * p.w! - p.w! / 2, r * 0.7 + ((i * 17) % 5) / 6 * (p.h! - r), ((i * 29) % 7) / 7 * 0.8 - 0.4);
      s.rotation.set(i, i * 2, i * 3);
      g.add(s);
    }
    return g;
  },
  grate: p => {
    const parts: THREE.BufferGeometry[] = [];
    const n = Math.round(p.w! / 0.12);
    for (let i = 0; i <= n; i++) parts.push(new THREE.BoxGeometry(0.03, 0.06, p.w!).translate(-p.w! / 2 + (i / n) * p.w!, 0, 0));
    for (const z of [-p.w! / 2, 0, p.w! / 2]) parts.push(new THREE.BoxGeometry(p.w!, 0.07, 0.05).translate(0, 0, z));
    return new THREE.Mesh(mergeGeometries(parts), lam(0x2c2e30));
  },
  graffiti: p => {
    const { tex, aspect } = textTexture(p.text!, { fg: 'rgba(210,205,190,0.75)', size: 44, font: '"Noto Sans CJK SC", sans-serif' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * aspect, 0.5), new THREE.MeshLambertMaterial({ map: tex, transparent: true }));
    return m;
  },
};

type Tick = (t: number, open: Record<string, boolean>) => void;
const ticking: Tick[] = [];
/** Animate props that move (searchlights, scripted patrols, doors following the world state). */
export function tickProps(t: number, open: Record<string, boolean> = {}) { for (const f of ticking) f(t, open); }

export function buildProps(props: Prop[]): THREE.Group {
  ticking.length = 0;
  const g = new THREE.Group();
  for (const p of props) {
    const b = builders[p.kind];
    if (!b) continue;
    const o = b(p);
    o.position.set(p.x, p.y, p.z);
    o.rotation.y = p.yaw;
    if (o.userData.tick) ticking.push(o.userData.tick);
    g.add(o);
  }
  return g;
}

export const propKinds = () => Object.keys(builders);
