// The street-dressing library (M3-34, M3-15, U-014): code-built, vertex-coloured props in the look of the
// reference photo, weathered and abandoned, plus the occupying machine's hardware. Each builds one mesh (shared
// material) and optional leaf-card and glowing parts; buildProps merges them per chunk.
import * as THREE from 'three';
import type { Prop } from '../world/world';
import { Kit, leafCards } from './propkit';
import { propAtlas, atlasMaterial } from './prop-atlas';

// One material for every library prop: the atlas carries every surface, leaves included (alpha-tested).
const PROP_MAT = atlasMaterial(new THREE.MeshPhongMaterial({ map: propAtlas(), alphaTest: 0.45, vertexColors: true, shininess: 8 }));
const leaves = () => PROP_MAT;
// The ASI's cyan strips and red camera lights share one unlit material, coloured per vertex: one draw per chunk.
const GLOW_MAT = new THREE.MeshBasicMaterial({ vertexColors: true });
const ASI = 0x9fe8ff, RED = 0xff3020;

const seedOf = (p: Prop) => (Math.round(p.x * 13) * 73856093) ^ (Math.round(p.z * 7) * 19349663) ^ Math.round(p.y * 5);
type Part = { geo: THREE.BufferGeometry; mat: THREE.Material };
const group = (parts: Part[]) => { const g = new THREE.Group(); for (const p of parts) g.add(new THREE.Mesh(p.geo, p.mat)); return g; };

const PAINT = [0xd8d6d0, 0x9a9da0, 0x2a2c2e, 0x7a2a24, 0x2e4a66, 0x5a6a52, 0xb8a888];
const TIRE = 0x1b1b1b, RUST = 0x6a4a32, BURNT = 0x2b2725;

/** A road vehicle from its side profile: body and cabin in one prism, glass set into the cabin, wheels in the
 *  arches, bumpers and lamps; burnt out, rusting, doors hanging, tyres flat. */
function vehicle(p: Prop, L: number, W: number, H: number, kind: 'car' | 'van' | 'bus'): THREE.Object3D {
  const k = new Kit(seedOf(p)), r = k.r;
  const burnt = r() < 0.2, paint = burnt ? BURNT : PAINT[Math.floor(r() * PAINT.length)];
  const l = L / 2, sill = 0.32, belt = sill + H * (kind === 'bus' ? 0.32 : 0.42), top = H;
  // Side profile, front at +z.
  const body: [number, number][] = kind === 'car'
    ? [[-l, sill], [l, sill], [l, belt - 0.05], [l * 0.42, belt], [l * 0.08, top], [-l * 0.5, top], [-l * 0.86, belt + 0.02], [-l, belt - 0.04]]
    : kind === 'van' ? [[-l, sill], [l, sill], [l, belt], [l * 0.78, top], [-l, top]]
    : [[-l, sill], [l, sill], [l, top - 0.1], [l - 0.1, top], [-l, top]];
  k.use(burnt ? 'rust' : 'paint').prism(body, W, paint);
  // Glass: the cabin's window band, standing just proud of the body.
  const g0 = belt + 0.06, g1 = top - (kind === 'bus' ? 0.35 : 0.08);
  const glass: [number, number][] = kind === 'car'
    ? [[-l * 0.84, g0], [l * 0.4, g0], [l * 0.1, g1], [-l * 0.48, g1]]
    : kind === 'van' ? [[-l * 0.2, g0], [l * 0.99, g0], [l * 0.8, g1], [-l * 0.2, g1]]
    : [[-l + 0.3, g0], [l + 0.01, g0], [l + 0.01, g1], [-l + 0.3, g1]];
  k.use('glass').prism(glass, W + 0.03, burnt ? 0x2a2622 : 0xb8c0c4);
  if (kind === 'car') k.prism([[l * 0.4, g0], [l * 0.44, g0 - 0.02], [l * 0.12, g1 + 0.02], [l * 0.08, g1]], W * 0.92, burnt ? 0x2a2622 : 0xb8c0c4);
  // Wheels and arches.
  const axle = kind === 'bus' ? l - 1.6 : l - 0.8;
  k.use('rubber');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const flat = r() < 0.3 ? 0.08 : 0;
    k.cyl(0.36, 0.36, 0.26, TIRE, sx * (W / 2 - 0.14), 0.36 - flat, sz * axle, 12, 'x');
    k.cyl(0.2, 0.2, 0.27, 0x8a8a86, sx * (W / 2 - 0.14), 0.36 - flat, sz * axle, 8, 'x');
  }
  // Bumpers, lamps, plates.
  k.use('plastic').box(W * 1.02, 0.22, 0.14, burnt ? BURNT : 0x3a3a3a, 0, sill, l).box(W * 1.02, 0.22, 0.14, burnt ? BURNT : 0x3a3a3a, 0, sill, -l);
  if (!burnt) for (const sx of [-1, 1]) { k.box(0.32, 0.14, 0.04, 0xd8d0b0, sx * W * 0.34, belt - 0.22, l + 0.01); k.box(0.32, 0.14, 0.04, 0x8a2018, sx * W * 0.34, belt - 0.22, -l - 0.01); }
  k.use('sign').box(0.44, 0.14, 0.02, 0x3a5aa8, 0, sill + 0.24, l + 0.08);
  // Rust and grime patches; a door left open; the dark ground under the body stands in for its shadow.
  k.use('rust');
  for (let i = 0; i < 3; i++) k.box(0.02, 0.2 + r() * 0.3, 0.3 + r() * 0.8, RUST, (r() < 0.5 ? -1 : 1) * (W / 2 + 0.005), sill + r() * 0.3, (r() - 0.5) * L * 0.8);
  if (kind === 'car' && r() < 0.3) k.use(burnt ? 'rust' : 'paint').box(0.06, belt - sill, 1.0, paint, W / 2 + 0.38, sill + 0.05, 0.1, 0.9);
  k.use('plain').box(W * 1.04, 0.01, L * 1.02, 0x101010, 0, 0.01);
  const geo = k.geometry();
  // Flat tyres: a lean.
  if (r() < 0.4) geo.rotateZ((r() - 0.5) * 0.08).rotateX((r() - 0.5) * 0.05);
  return group([{ geo, mat: PROP_MAT }]);
}

function tree(p: Prop, big: boolean): THREE.Object3D {
  const k = new Kit(seedOf(p)).use('bark'), r = k.r, s = big ? 1.5 : 1;
  const h = (3 + r() * 1.5) * s;
  k.cyl(0.2 * s, 0.13 * s, h, 0x6e5e4c, 0, 0, 0, 7);
  const cards: { x: number; y: number; z: number; s: number; ry: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2, l = (1 + r()) * s;
    k.cyl(0.07 * s, 0.04 * s, l, 0x6e5e4c, Math.cos(a) * 0.3, h * 0.75, Math.sin(a) * 0.3, 5, 'x', a);
  }
  // The crown is leaves only (U-028): clusters of leaf cards, no solid core showing through.
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2, d = r() * 1.4 * s, y = h + (r() - 0.3) * 1.4 * s;
    for (let j = 0; j < 9; j++) cards.push({ x: Math.cos(a) * d + (r() - 0.5) * 2 * s, y: y + (r() - 0.5) * 1.4 * s, z: Math.sin(a) * d + (r() - 0.5) * 2 * s, s: (0.9 + r() * 0.6) * s, ry: r() * Math.PI });
  }
  // Fig trees drop aerial roots.
  if (big) for (let i = 0; i < 5; i++) { const a = r() * Math.PI * 2, d = 0.4 + r() * 1.2, l = h * (0.3 + r() * 0.3); k.cyl(0.025, 0.015, l, 0x9a8c74, Math.cos(a) * d, h * 0.85 - l, Math.sin(a) * d, 4); }
  return group([{ geo: k.geometry(), mat: PROP_MAT }, { geo: leafCards(cards, 0x9aa070), mat: leaves() }]);
}

/** A patch of greenery on a wall: fig roots over a retaining wall, or a vine (prop faces out of the wall, +z). */
function wallGreen(p: Prop, roots: boolean): THREE.Object3D {
  const k = new Kit(seedOf(p)).use('bark'), r = k.r, w = p.w ?? 4, h = p.h ?? 4;
  const cards: { x: number; y: number; z: number; s: number; ry: number }[] = [];
  if (roots) for (let i = 0; i < 14; i++) k.cyl(0.06 + r() * 0.05, 0.03, h * (0.4 + r() * 0.6), 0x6e6252, (r() - 0.5) * w, -h * (0.4 + r() * 0.6) + h, 0.08, 5);
  for (let i = 0; i < (roots ? 20 : 30); i++) cards.push({ x: (r() - 0.5) * w, y: roots ? h - r() * h * 0.5 : r() * h, z: 0.2 + r() * 0.3, s: 0.6 + r() * 0.6, ry: (r() - 0.5) * 0.8 });
  const parts: Part[] = [{ geo: leafCards(cards, 0x8a9468), mat: leaves() }];
  if (roots) parts.push({ geo: k.geometry(), mat: PROP_MAT });
  return group(parts);
}

const LIB: Record<string, (p: Prop) => THREE.Object3D> = {
  car: p => vehicle(p, 4.4, 1.8, 1.45, 'car'),
  van: p => vehicle(p, 4.9, 1.95, 2.0, 'van'),
  bus: p => vehicle(p, 11, 2.5, 3.0, 'bus'),
  scooter: p => {
    const k = new Kit(seedOf(p)).use('paint'), c = PAINT[Math.floor(k.r() * PAINT.length)];
    k.box(0.35, 0.35, 1.2, c, 0, 0.25).box(0.3, 0.12, 0.55, 0x222222, 0, 0.62, -0.15).box(0.08, 0.6, 0.1, c, 0, 0.5, 0.55).box(0.6, 0.04, 0.05, 0x333333, 0, 1.1, 0.55);
    for (const z of [-0.55, 0.6]) k.cyl(0.2, 0.2, 0.08, TIRE, 0, 0.2, z, 10, 'x');
    const g = k.geometry();
    if (k.r() < 0.6) g.rotateZ(Math.PI / 2 * 0.92).translate(0.15, 0.02, 0);
    return group([{ geo: g, mat: PROP_MAT }]);
  },
  bike: p => {
    const k = new Kit(seedOf(p)).use('paint'), c = k.r() < 0.5 ? 0xd8a020 : 0xd85a20;
    for (const z of [-0.55, 0.55]) k.add(new THREE.TorusGeometry(0.32, 0.03, 5, 14).rotateY(Math.PI / 2).translate(0, 0.33, z), TIRE);
    k.box(0.05, 0.05, 1.0, c, 0, 0.55).box(0.05, 0.5, 0.05, c, 0, 0.35, -0.15).box(0.05, 0.55, 0.05, c, 0, 0.45, 0.45).box(0.5, 0.04, 0.04, 0x333333, 0, 1.0, 0.45).box(0.18, 0.06, 0.25, 0x222222, 0, 0.85, -0.2);
    const g = k.geometry();
    if (k.r() < 0.5) g.rotateZ(Math.PI / 2 * 0.95).translate(0.1, 0.03, 0);
    return group([{ geo: g, mat: PROP_MAT }]);
  },
  jersey: p => { const k = new Kit(seedOf(p)).use('concrete'); k.box(0.62, 0.3, 2, 0xa8a49a).box(0.3, 0.52, 2, 0xa8a49a, 0, 0.3); k.box(0.31, 0.12, 2.02, 0xc89a2a, 0, 0.55); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  barrier: p => {
    const k = new Kit(seedOf(p)).use('paint');
    for (const x of [-1.05, 1.05]) k.box(0.05, 1.05, 0.05, 0x8a8c8e, x, 0).box(0.05, 0.05, 0.5, 0x8a8c8e, x, 0);
    k.box(2.1, 0.05, 0.05, 0x8a8c8e, 0, 1.0).box(2.1, 0.05, 0.05, 0x8a8c8e, 0, 0.15);
    for (let x = -0.9; x <= 0.9; x += 0.15) k.box(0.025, 0.85, 0.025, 0x8a8c8e, x, 0.15);
    return group([{ geo: k.geometry(), mat: PROP_MAT }]);
  },
  sandbags: p => { const k = new Kit(seedOf(p)).use('fabric'); for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) k.blob(0.32, 0xa89a78, -0.9 + row * 0.3 + i * 0.6, 0.18 + row * 0.3, 0, 0.5, 0); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  rubblepile: p => {
    const k = new Kit(seedOf(p)).use('concrete'), r = k.r, s = p.w ?? 2;
    for (let i = 0; i < 10; i++) k.box((0.3 + r() * 0.8) * s / 2, (0.15 + r() * 0.4) * s / 2, (0.3 + r() * 0.8) * s / 2, [0x8c877e, 0x6e6a62, 0x9a8a72][i % 3], (r() - 0.5) * s, 0, (r() - 0.5) * s, r() * 3, (r() - 0.5) * 0.6, (r() - 0.5) * 0.6);
    for (let i = 0; i < 3; i++) k.cyl(0.015, 0.015, 1 + r(), 0x5a3a28, (r() - 0.5) * s, 0.2, (r() - 0.5) * s, 4, 'x', r() * 3);
    return group([{ geo: k.geometry(), mat: PROP_MAT }]);
  },
  debris: p => { const k = new Kit(seedOf(p)).use('concrete'), r = k.r; for (let i = 0; i < 14; i++) k.box(0.1 + r() * 0.3, 0.04 + r() * 0.06, 0.1 + r() * 0.3, [0x8c877e, 0x7a4a36, 0xd8d2c0, 0x3a3a3a][i % 4], (r() - 0.5) * 3, 0, (r() - 0.5) * 3, r() * 3); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  sign: p => { const k = new Kit(seedOf(p)).use('sign'), r = k.r; k.box(3, 0.08, 0.9, [0xa82a22, 0x2a4a8a, 0xd8d2c0, 0x2a6a4a][Math.floor(r() * 4)], 0, 0, 0, 0, 0.12, 0.05); k.box(2.6, 0.02, 0.5, 0xd8d0b0, 0, 0.09, 0, 0, 0.12, 0.05); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  boxes: p => { const k = new Kit(seedOf(p)).use('cardboard'), r = k.r; for (let i = 0; i < 4; i++) { const s = 0.35 + r() * 0.3; k.box(s, s * 0.8, s, 0xa88a5a, (r() - 0.5) * 1.2, i > 2 ? 0.35 : 0, (r() - 0.5) * 1.2, r() * 3); } return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  trash: p => { const k = new Kit(seedOf(p)).use('bag'), r = k.r; for (let i = 0; i < 5; i++) k.blob(0.28 + r() * 0.12, r() < 0.6 ? 0x1e2420 : 0x2a3a2a, (r() - 0.5) * 1.4, 0.2, (r() - 0.5) * 1.4, 0.75, 0); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  lamppost: p => {
    const k = new Kit(seedOf(p)).use('paint'), r = k.r;
    k.cyl(0.1, 0.07, 7.5, 0x4a4e52, 0, 0, 0, 8).box(0.08, 0.08, 1.6, 0x4a4e52, 0, 7.2, 0.7).box(0.3, 0.12, 0.6, 0x3a3e42, 0, 7.05, 1.4);
    k.box(0.35, 0.5, 0.18, 0x5a5e62, 0, 3.2, 0.12);
    const g = k.geometry();
    if (r() < 0.15) g.rotateX(0.18 + r() * 0.2);
    const cam = new Kit(1).box(0.22, 0.16, 0.3, 0xd8d8d8, 0, 6.2, 0.25).geometry();
    return group([{ geo: g, mat: PROP_MAT }, { geo: cam, mat: PROP_MAT }, { geo: new Kit(2).box(0.05, 0.05, 0.05, RED, 0, 6.24, 0.42).geometry(), mat: GLOW_MAT }]);
  },
  bench: p => { const k = new Kit(seedOf(p)).use('wood'); k.box(1.8, 0.06, 0.45, 0x6a5a44, 0, 0.42).box(1.8, 0.4, 0.05, 0x6a5a44, 0, 0.5, -0.2); for (const x of [-0.75, 0.75]) k.box(0.06, 0.42, 0.4, 0x3a3a3a, x, 0); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  bin: p => { const k = new Kit(seedOf(p)).use('paint'); k.cyl(0.3, 0.32, 0.9, 0x2e5a3e, 0, 0, 0, 10).cyl(0.34, 0.34, 0.06, 0x2a4a34, 0, 0.9, 0, 10); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  bollard: p => group([{ geo: new Kit(seedOf(p)).use('paint').cyl(0.12, 0.1, 0.9, 0x5a5c5e, 0, 0, 0, 8).cyl(0.13, 0.13, 0.06, 0xc8a020, 0, 0.7, 0, 8).geometry(), mat: PROP_MAT }]),
  railing: p => { const k = new Kit(seedOf(p)).use('metal'), w = p.w ?? 3; for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 3) k.box(0.05, 1.05, 0.05, 0x5a5e5a, x, 0); k.box(w, 0.05, 0.05, 0x5a5e5a, 0, 1.0).box(w, 0.04, 0.04, 0x5a5e5a, 0, 0.5); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  kiosk: p => { const k = new Kit(seedOf(p)).use('paint'); k.box(2.4, 2.4, 2.0, 0x3a5a4a).box(2.8, 0.12, 2.4, 0x2a3a32, 0, 2.4).box(2.0, 1.4, 0.04, 0x8a8a86, 0, 0.8, 1.02); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  stall: p => {
    const k = new Kit(seedOf(p)).use('metal'), r = k.r;
    k.box(1.6, 0.85, 0.8, 0x8a8278).box(1.7, 0.05, 0.9, 0x5a5a5a, 0, 0.85);
    for (const x of [-0.7, 0.7]) k.cyl(0.18, 0.18, 0.06, TIRE, x, 0.18, 0.42, 8, 'z');
    for (const x of [-0.8, 0.8]) k.box(0.04, 1.2, 0.04, 0x6a6a6a, x, 0.9, -0.35);
    k.box(2.0, 0.04, 1.4, r() < 0.5 ? 0xa82a22 : 0x2a5a8a, 0, 2.1, 0, 0, 0.15);
    k.cyl(0.25, 0.22, 0.3, 0x8a8a8a, -0.4, 0.9, 0).cyl(0.2, 0.2, 0.25, 0x6a6a6a, 0.3, 0.9, 0.1);
    return group([{ geo: k.geometry(), mat: PROP_MAT }]);
  },
  mahjong: p => { const k = new Kit(seedOf(p)).use('wood'), r = k.r; k.box(0.9, 0.04, 0.9, 0x2a6a4a, 0, 0.72).box(0.08, 0.72, 0.08, 0x3a3a3a, 0, 0); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + r() * 0.5; k.box(0.35, 0.42, 0.35, 0x8a3a2a, Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75); } for (let i = 0; i < 12; i++) k.box(0.03, 0.04, 0.02, 0xe8e0c8, (r() - 0.5) * 0.7, 0.76, (r() - 0.5) * 0.7, r() * 3); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  laundry: p => { const k = new Kit(seedOf(p)).use('fabric'), r = k.r, w = p.w ?? 3; k.cyl(0.02, 0.02, w, 0x6a6a6a, 0, 2.3, 0, 4, 'x'); for (let x = -w / 2 + 0.3; x < w / 2; x += 0.45 + r() * 0.3) k.box(0.4 + r() * 0.2, 0.5 + r() * 0.4, 0.02, [0x8a2a22, 0x3c5a7a, 0xc9b98a, 0x6a6f4a, 0xd8d4c8][Math.floor(r() * 5)], x, 1.4 + r() * 0.3); return group([{ geo: k.geometry(), mat: PROP_MAT }]); },
  bangbang: p => { const k = new Kit(seedOf(p)).use('wood'); k.cyl(0.03, 0.03, 1.8, 0x8a7a4a, 0, 0, 0, 5).cyl(0.01, 0.01, 0.9, 0x6a5a3a, 0.05, 0.8, 0.02, 3); const g = k.geometry().rotateX(-0.25); return group([{ geo: g, mat: PROP_MAT }]); },
  pot: p => { const k = new Kit(seedOf(p)).use('concrete'), r = k.r; k.cyl(0.18, 0.24, 0.35, 0x8a4a32, 0, 0, 0, 8); const cards = Array.from({ length: 4 }, () => ({ x: (r() - 0.5) * 0.3, y: 0.55, z: (r() - 0.5) * 0.3, s: 0.45 + r() * 0.2, ry: r() * 3 })); return group([{ geo: k.geometry(), mat: PROP_MAT }, { geo: leafCards(cards, 0x8a9a60), mat: leaves() }]); },
  weeds: p => { const k = new Kit(seedOf(p)), r = k.r; const cards = Array.from({ length: 6 }, () => ({ x: (r() - 0.5) * 1.2, y: 0.15, z: (r() - 0.5) * 1.2, s: 0.25 + r() * 0.3, ry: r() * 3 })); return group([{ geo: leafCards(cards, 0xa0a868), mat: leaves() }]); },
  shrub: p => { const k = new Kit(seedOf(p)).use('bark'), r = k.r; k.blob(0.6, 0x4a5a32, 0, 0.45, 0, 0.8); const cards = Array.from({ length: 10 }, () => ({ x: (r() - 0.5) * 1.2, y: 0.3 + r() * 0.6, z: (r() - 0.5) * 1.2, s: 0.5 + r() * 0.3, ry: r() * 3 })); return group([{ geo: k.geometry(), mat: PROP_MAT }, { geo: leafCards(cards, 0x8a9a5a), mat: leaves() }]); },
  tree: p => tree(p, false),
  figtree: p => tree(p, true),
  figroots: p => wallGreen(p, true),
  vine: p => wallGreen(p, false),
  dronedock: p => {
    const k = new Kit(seedOf(p)).use('metal');
    k.cyl(0.25, 0.3, 2.2, 0x2a2e32, 0, 0, 0, 8).box(2.4, 0.2, 2.4, 0x3a3e44, 0, 2.2).add(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.4, 0), 0x22262a);
    const glow = new Kit(3).box(2.42, 0.05, 0.08, ASI, 0, 2.34, 1.2).box(2.42, 0.05, 0.08, ASI, 0, 2.34, -1.2).geometry();
    return group([{ geo: k.geometry(), mat: PROP_MAT }, { geo: glow, mat: GLOW_MAT }]);
  },
  scanner: p => {
    const k = new Kit(seedOf(p)).use('metal');
    for (const x of [-1.6, 1.6]) k.box(0.3, 3, 0.4, 0x2a2e32, x, 0);
    k.box(3.5, 0.35, 0.45, 0x2a2e32, 0, 3);
    const glow = new Kit(4).box(3.0, 0.06, 0.05, ASI, 0, 2.9, 0.23).box(0.05, 2.6, 0.05, ASI, -1.43, 0.2, 0.2).box(0.05, 2.6, 0.05, ASI, 1.43, 0.2, 0.2).geometry();
    return group([{ geo: k.geometry(), mat: PROP_MAT }, { geo: glow, mat: GLOW_MAT }]);
  },
  campole: p => {
    const k = new Kit(seedOf(p)).use('paint');
    k.cyl(0.08, 0.06, 4.5, 0x3a3e42, 0, 0, 0, 8).box(0.25, 0.2, 0.45, 0xe0e0e0, 0, 4.4, 0.2).cyl(0.25, 0.25, 0.04, 0x2a2e32, 0, 4.1, 0, 8);
    return group([{ geo: k.geometry(), mat: PROP_MAT }, { geo: new Kit(5).box(0.05, 0.05, 0.05, RED, 0, 4.5, 0.44).geometry(), mat: GLOW_MAT }]);
  },
  // The occupier's LED edict board on two posts: rows of glowing glyph bars on a black face (+z).
  edict: p => {
    const k = new Kit(seedOf(p)).use('metal'), r = k.r;
    for (const x of [-1.3, 1.3]) k.box(0.14, 2.8, 0.14, 0x2a2e32, x, 0);
    k.box(3.2, 1.7, 0.18, 0x15181a, 0, 2.6).box(3.3, 0.08, 0.26, 0x2a2e32, 0, 4.3);
    const glow = new Kit(seedOf(p) + 1);
    for (let row = 0; row < 4; row++) for (let x = -1.4; x < 1.3;) { const w = 0.12 + r() * 0.3; glow.box(w, 0.16, 0.02, row ? ASI : RED, x + w / 2, 3.95 - row * 0.36, 0.1); x += w + 0.06; }
    return group([{ geo: k.geometry(), mat: PROP_MAT }, { geo: glow.geometry(), mat: GLOW_MAT }]);
  },
  // A bundle of cables down a wall (out of it, +z), clipped every few metres, a junction box and a loop or two.
  cablebundle: p => {
    const k = new Kit(seedOf(p)).use('rubber'), r = k.r, h = p.h ?? 9;
    for (let i = 0; i < 5 + Math.floor(r() * 4); i++) k.cyl(0.018, 0.018, h, [0x1a1a1a, 0x2a2a2a, 0x3a3a3a, 0x5a4a3a][i % 4], (i - 3) * 0.035, 0, 0.08 + (i % 2) * 0.03, 4);
    for (let y = 1; y < h; y += 2.5) k.box(0.32, 0.05, 0.08, 0x4a4a4a, 0, y, 0.06);
    k.box(0.4, 0.5, 0.15, 0x5a5e5a, 0.3, 1.2 + r() * 2, 0.08);
    for (let i = 0; i < 2; i++) k.add(new THREE.TorusGeometry(0.25 + r() * 0.2, 0.02, 4, 10, Math.PI).rotateZ(Math.PI).translate(-0.3 + i * 0.5, 2 + r() * (h - 3), 0.12), 0x1e1e1e);
    return group([{ geo: k.geometry(), mat: PROP_MAT }]);
  },
  // Roof clutter: a satellite dish, a mast of aerials, plastic stools left from summer nights.
  dish: p => {
    const k = new Kit(seedOf(p)).use('metal');
    k.cyl(0.04, 0.04, 0.8, 0x6a6a6a, 0, 0, 0, 5).add(new THREE.SphereGeometry(0.45, 10, 4, 0, Math.PI * 2, 0, 0.7).scale(1, 0.4, 1).rotateX(-1.1).translate(0, 0.95, 0.1), 0xc8c4bc);
    return group([{ geo: k.geometry(), mat: PROP_MAT }]);
  },
  antenna: p => {
    const k = new Kit(seedOf(p)).use('metal'), r = k.r, h = 2.5 + r() * 2.5;
    k.cyl(0.03, 0.025, h, 0x5a5a5a, 0, 0, 0, 5);
    for (let y = h * 0.5; y < h; y += 0.45) k.box(0.9 - (y / h) * 0.4, 0.025, 0.025, 0x5a5a5a, 0, y, 0, r() * 0.3);
    return group([{ geo: k.geometry(), mat: PROP_MAT }]);
  },
  stools: p => {
    const k = new Kit(seedOf(p)).use('plastic'), r = k.r;
    for (let i = 0; i < 2 + Math.floor(r() * 3); i++) {
      const c = [0xb8302a, 0x2a5a9a, 0x3a8a4a][Math.floor(r() * 3)], x = (r() - 0.5) * 1.6, z = (r() - 0.5) * 1.6;
      if (r() < 0.3) k.cyl(0.16, 0.14, 0.42, c, x, 0.16, z, 8, 'x', r() * 3); else k.cyl(0.16, 0.13, 0.42, c, x, 0, z, 8);
    }
    return group([{ geo: k.geometry(), mat: PROP_MAT }]);
  },
  // A Line 2 straddle monorail train (after monorail-line2 photos): white with the line's green band, a car
  // wrapping the beam, window band with some panes gone, bench seats and poles inside. Length along z.
  train: p => {
    const k = new Kit(seedOf(p)), r = k.r, n = p.w ?? 2, L = 14.8, G = 0.4, hw = 1.45, total = n * L + (n - 1) * G;
    for (let c = 0; c < n; c++) {
      const z0 = -total / 2 + c * (L + G), z1 = z0 + L, zc = (z0 + z1) / 2;
      k.use('paint');
      for (const sx of [-1, 1]) {
        const x = sx * (hw - 0.04);
        k.box(0.08, 2.45, L, 0xe4e2da, x, -1.2, zc).box(0.09, 0.14, L, 0x1f8a4a, x, 0.9, zc).box(0.08, 0.45, L, 0xe4e2da, x, 2.25, zc);
        for (let z = z0 + 0.8; z < z1 - 0.5; z += 1.7) k.box(0.08, 1.0, 0.25, 0xe4e2da, x, 1.25, z);
        for (const d of [0.27, 0.73]) k.box(0.1, 2.0, 1.3, 0x1f8a4a, x, 0.4, z0 + L * d);
      }
      k.box(hw * 2, 0.15, L, 0x6a6a66, 0, 0.25, zc).box(hw * 2 - 0.2, 0.25, L - 0.4, 0xd8d6ce, 0, 2.7, zc);
      for (let i = 0; i < 3; i++) k.use('metal').box(1.1, 0.35, 1.6, 0x8a8c8a, 0, 2.95, z0 + 3 + i * 4.4);
      // End walls with the doors through.
      k.use('paint');
      for (const z of [z0 + 0.04, z1 - 0.04]) {
        const nose = (c === 0 && z < zc) || (c === n - 1 && z > zc);
        for (const sx of [-1, 1]) k.box(hw - 0.45, 2.3, 0.08, nose ? 0x1f8a4a : 0xe4e2da, sx * (0.45 + (hw - 0.45) / 2), 0.4, z);
        k.box(0.9, 0.4, 0.08, 0xe4e2da, 0, 2.3, z);
        if (nose) k.use('glass').box(hw * 2 - 0.3, 0.8, 0.1, 0x90989c, 0, 1.4, z + (z < zc ? -0.03 : 0.03)).use('paint');
      }
      // Glass in the window band, a few panes broken out.
      k.use('glass');
      for (const sx of [-1, 1]) for (let z = z0 + 0.92; z < z1 - 1.6; z += 1.7) if (r() > 0.25) k.box(0.03, 1.0, 1.45, 0xb8c0c4, sx * (hw - 0.02), 1.25, z + 0.72);
      // Inside: bench seats along the walls, grab poles, litter.
      k.use('fabric');
      for (const sx of [-1, 1]) k.box(0.45, 0.45, L - 3.6, 0x2a6a8a, sx * (hw - 0.32), 0.4, zc);
      k.use('metal');
      for (let z = z0 + 2; z < z1 - 1; z += 3) for (const sx of [-1, 1]) k.cyl(0.02, 0.02, 2.3, 0xc8c8c8, sx * 0.55, 0.4, z, 6);
      k.use('bag');
      for (let i = 0; i < 4; i++) k.blob(0.18 + r() * 0.1, 0x2a2a2a, (r() - 0.5) * 1.6, 0.5, z0 + 1 + r() * (L - 2), 0.6, 0);
      // The bogies' skirts round the beam.
      k.use('metal');
      for (const z of [z0 + 2.8, z1 - 2.8]) for (const sx of [-1, 1]) k.box(0.3, 1.1, 2.6, 0x3a3c3e, sx * 0.62, -1.15, z);
      if (c < n - 1) k.use('rubber').box(2.2, 2.3, G + 0.1, 0x2a2a2a, 0, 0.4, z1 + G / 2);
    }
    return group([{ geo: k.geometry(), mat: PROP_MAT }]);
  },
  // A shop's neon sign on a gantry (old commercial neon, not the occupier's cyan): a box sign of glowing glyphs
  // on both faces with a lit strip under it, on two thin posts; length w along x, h the height of its bottom.
  neonsign: p => {
    const k = new Kit(seedOf(p)).use('metal'), r = k.r, w = p.w ?? 3, y = p.h ?? 4, c = [0xff4fa0, 0xffb040, 0x80ff90][Math.floor(r() * 3)];
    for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) k.box(0.08, y, 0.08, 0x3a3a3a, x, 0);
    k.use('paint').box(w, 0.9, 0.3, 0x1a1a1e, 0, y);
    const glow = new Kit(seedOf(p) + 2);
    for (const z of [0.16, -0.16]) for (let x = -w / 2 + 0.25; x < w / 2 - 0.4;) { const gw = 0.3 + r() * 0.25; glow.box(gw, 0.55, 0.02, c, x + gw / 2, y + 0.18, z); x += gw + 0.12; }
    glow.box(w - 0.1, 0.03, 0.26, c, 0, y - 0.02);
    return group([{ geo: k.geometry(), mat: PROP_MAT }, { geo: glow.geometry(), mat: GLOW_MAT }]);
  },
  // A building's LED screen (M3-46): a black frame of w x h on the wall (+z out), lit in blocks of colour that
  // read as ads and slogans from the street; the crowded centres are full of them.
  ledscreen: p => {
    const k = new Kit(seedOf(p)).use('metal'), r = k.r, w = p.w ?? 10, h = p.h ?? 6;
    k.box(w + 0.4, h + 0.4, 0.3, 0x18191b, 0, -0.2, -0.15);
    const glow = new Kit(seedOf(p) + 3), pal = [0xff3a6a, 0x3ae0ff, 0xffd03a, 0xffffff, 0xff7a20, 0x9a5aff, 0x40ff9a];
    // A dark field with bright content, as screens read at a distance.
    const bg = [0x0c1424, 0x1c0810, 0x08180e, 0x14101c, 0x201408][Math.floor(r() * 5)];
    glow.box(w, h, 0.02, bg, 0, 0, 0.02);
    for (let i = 0; i < 6 + Math.floor(r() * 8); i++) { const bw = w * (0.1 + r() * 0.4), bh = h * (0.08 + r() * 0.3); glow.box(bw, bh, 0.02, pal[Math.floor(r() * pal.length)], (r() - 0.5) * (w - bw), (h - bh) * r(), 0.04); }
    return group([{ geo: k.geometry(), mat: PROP_MAT }, { geo: glow.geometry(), mat: GLOW_MAT }]);
  },
  // A blade sign over a shop front (its +z out of the wall) as Chongqing's are (U-028): mostly a tall light box,
  // big characters down both faces in red or white, a neon tube round the edge; else a dark board with the
  // characters themselves in neon tube.
  neonblade: p => {
    const k = new Kit(seedOf(p)).use('metal'), r = k.r, h = p.h ?? 3, glow = new Kit(seedOf(p) + 4), lit = r() < 0.65;
    const tube = [0xff3040, 0xff4fa0, 0x60e0ff, 0xffb040, 0x80ff90][Math.floor(r() * 5)];
    const face = lit ? [0xfff4e0, 0xffd040, 0xd81c1c, 0xf4f8ff][Math.floor(r() * 4)] : 0x15161a, ink = face === 0xd81c1c ? 0xfff0d0 : 0xb01414;
    k.box(0.08, 0.08, 1.0, 0x3a3a3a, 0, h - 0.2, 0.5).box(0.08, 0.08, 1.0, 0x3a3a3a, 0, 0.2, 0.5);
    (lit ? glow : k).box(0.24, h, 0.8, face, 0, 0, 0.6);
    const s = 0.52, t = lit ? 0.07 : 0.035, pen = lit ? k : glow;
    for (let y = h - 0.22 - s; y > 0.15; y -= s + 0.1) for (const [z0, y0, z1, y1] of glyph(r)) for (const x of [-0.13, 0.13])
      pen.box(0.02, Math.max(t, (y1 - y0) * s), Math.max(t, (z1 - z0) * s), lit ? ink : tube, x, y + y0 * s - (y1 === y0 ? t / 2 : 0), 0.6 + ((z0 + z1) / 2 - 0.5) * s);
    for (const x of [-0.13, 0.13]) glow.box(0.02, 0.03, 0.8, tube, x, h - 0.05, 0.6).box(0.02, 0.03, 0.8, tube, x, 0.02, 0.6).box(0.02, h - 0.04, 0.03, tube, x, 0.02, 0.215).box(0.02, h - 0.04, 0.03, tube, x, 0.02, 0.985);
    return group([{ geo: k.geometry(), mat: PROP_MAT }, { geo: glow.geometry(), mat: GLOW_MAT }]);
  },
  dronewreck: p => {
    const k = new Kit(seedOf(p)).use('metal'), r = k.r;
    k.box(0.5, 0.18, 0.7, 0x2a2e32, 0, 0, 0, 0, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4);
    for (const a of [0.8, 2.35, 3.9, 5.5]) { k.box(0.06, 0.04, 0.6, 0x2a2e32, Math.sin(a) * 0.35, 0.08, Math.cos(a) * 0.35, a); k.cyl(0.22, 0.22, 0.02, 0x4a4e52, Math.sin(a) * 0.62, 0.1, Math.cos(a) * 0.62, 10); }
    return group([{ geo: k.geometry(), mat: PROP_MAT }]);
  },
};

/** A made-up character in a unit cell, as a sign reads from the street: three to five strokes across and down
 *  ([z0, y0, z1, y1], one pair equal). */
function glyph(r: () => number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [], n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    if (i === 0 || (i > 1 && r() < 0.5)) { const y = [0.1, 0.5, 0.9][Math.floor(r() * 3)], a = 0.05 + r() * 0.3; out.push([a, y, a + 0.5 + r() * 0.15, y]); }
    else { const z = [0.2, 0.5, 0.8][Math.floor(r() * 3)], a = 0.05 + r() * 0.3; out.push([z, a, z, a + 0.5 + r() * 0.15]); }
  }
  return out;
}

export const libKinds = () => Object.keys(LIB);
export const libProp = (p: Prop): THREE.Object3D | null => LIB[p.kind]?.(p) ?? null;
