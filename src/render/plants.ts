// Foliage (M3-62, U-031): the city's trees by species and the low green under them, code-built like the rest of the
// prop library (bark from the kit, leaves as cards from the atlas), each a list of geometries for the library's one
// shared material. Camphor, broad and dense; palms, a slender trunk and a fan of drooping fronds; bamboo in clumps;
// ginkgo, upright and narrow, gold in places; clipped hedges; ferns. (The banyan is the library's fig.)
import * as THREE from 'three';
import type { Prop } from '../world/world';
import { Kit, leafCards } from './propkit';

type Card = { x: number; y: number; z: number; s: number; ry: number };
const BARK = 0x6e5e4c;

const seedOf = (p: Prop) => (Math.round(p.x * 13) * 73856093) ^ (Math.round(p.z * 7) * 19349663) ^ Math.round(p.y * 5);

/** A limb l long, r0 thick at its foot at height y on the trunk, leaning `tilt` from upright toward heading a. */
const limb = (a: number, l: number, tilt: number, r0: number, y: number) =>
  new THREE.CylinderGeometry(r0 * 0.5, r0, l, 6).translate(0, l / 2, 0).rotateZ(-tilt).rotateY(-a).translate(0, y, 0);

/** A camphor: a short thick trunk forking into heavy limbs under a broad dome of dark leaves. */
function camphor(p: Prop): THREE.BufferGeometry[] {
  const k = new Kit(seedOf(p)).use('bark'), r = k.r, s = 0.85 + r() * 0.5, h = 2.4 * s, cards: Card[] = [];
  k.cyl(0.38 * s, 0.28 * s, h, BARK, 0, 0, 0, 8);
  // Limbs up and out from the fork into the crown.
  for (let i = 0, n = 3 + Math.floor(r() * 3); i < n; i++) k.add(limb((i / n) * Math.PI * 2 + r() * 0.5, (2.4 + r()) * s, 0.7 + r() * 0.3, 0.16 * s, h - 0.2), BARK);
  const R = 3.2 * s, top = h + 1.6 * s;
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R, y = top + (1 - (d / R) ** 2) * 1.8 * s * r() + (r() - 0.4) * 0.8;
    cards.push({ x: Math.cos(a) * d, y, z: Math.sin(a) * d, s: (1 + r() * 0.6) * s, ry: r() * Math.PI });
  }
  return [k.geometry(), leafCards(cards, 0x6a7a46)];
}

/** A palm: a slender ringed trunk, leaning a little, its crown a fan of fronds drooping from the top. */
function palm(p: Prop): THREE.BufferGeometry[] {
  const k = new Kit(seedOf(p)).use('bark'), r = k.r, h = 5 + r() * 3, lean = (r() - 0.5) * 0.12, cards: Card[] = [];
  k.cyl(0.17, 0.13, h, 0x8a7c62, 0, 0, 0, 7);
  for (let y = 0.6; y < h; y += 0.45) k.cyl(0.18, 0.18, 0.05, 0x6a5c48, 0, y, 0, 7);
  for (let f = 0, n = 9 + Math.floor(r() * 4); f < n; f++) {
    const a = (f / n) * Math.PI * 2 + r() * 0.3, L = 2.2 + r() * 0.8;
    // Along the frond, out and arching down: small cards side by side.
    for (let t = 0.15; t <= 1; t += 0.12) cards.push({ x: Math.cos(a) * L * t, y: h + 0.3 + 0.8 * t - 1.6 * t * t, z: Math.sin(a) * L * t, s: 0.55 - t * 0.2, ry: a + Math.PI / 2 });
  }
  const g = [k.geometry(), leafCards(cards, 0x7a9050)];
  for (const q of g) q.rotateZ(lean);
  return g;
}

/** A clump of bamboo: a dozen thin jointed culms, leaning out from the middle, leafy toward their tops. */
function bamboo(p: Prop): THREE.BufferGeometry[] {
  const k = new Kit(seedOf(p)).use('bark'), r = k.r, cards: Card[] = [], n = 9 + Math.floor(r() * 7);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.5, h = 4 + r() * 3, x = Math.cos(a) * d, z = Math.sin(a) * d, ox = Math.cos(a) * 0.12 * h, oz = Math.sin(a) * 0.12 * h;
    // (Leaning out: tipped about x and z, then stood at its place in the clump.)
    k.add(new THREE.CylinderGeometry(0.025, 0.035 + r() * 0.015, h, 5).translate(0, h / 2, 0).rotateX(Math.atan2(oz, h)).rotateZ(-Math.atan2(ox, h)).translate(x, 0, z), 0x8a9a5a);
    for (let j = 0; j < 6; j++) { const t = 0.55 + r() * 0.45; cards.push({ x: x + ox * t + (r() - 0.5) * 0.8, y: h * t, z: z + oz * t + (r() - 0.5) * 0.8, s: 0.5 + r() * 0.3, ry: r() * Math.PI }); }
  }
  return [k.geometry(), leafCards(cards, 0x8aa45a)];
}

/** A ginkgo: a straight trunk under a narrow crown in tiers, green or (one in three) gone gold. */
function ginkgo(p: Prop): THREE.BufferGeometry[] {
  const k = new Kit(seedOf(p)).use('bark'), r = k.r, h = 6 + r() * 4, cards: Card[] = [];
  k.cyl(0.22, 0.12, h, 0x5e5448, 0, 0, 0, 7);
  for (let y = h * 0.3; y < h; y += 0.9) {
    const rad = 1.8 * (1 - (y - h * 0.3) / (h * 0.8)) + 0.3;
    for (let i = 0; i < 2; i++) k.add(limb(r() * Math.PI * 2, rad, 1.2, 0.05, y), 0x5e5448);
    for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, d = r() * rad; cards.push({ x: Math.cos(a) * d, y: y + 0.3 + r() * 0.5, z: Math.sin(a) * d, s: 0.7 + r() * 0.4, ry: r() * Math.PI }); }
  }
  return [k.geometry(), leafCards(cards, r() < 0.33 ? 0xd8b040 : 0x9aa852)];
}

/** A clipped hedge p.w long (along z): a squared mass of leaves, grown ragged on top since nobody trims it. */
function hedge(p: Prop): THREE.BufferGeometry[] {
  const k = new Kit(seedOf(p)).use('leaves'), r = k.r, w = p.w ?? 3, cards: Card[] = [];
  k.box(0.7, 0.9, w, 0x4a6a34, 0, 0, 0);
  for (let z = -w / 2 + 0.2; z < w / 2; z += 0.35) cards.push({ x: (r() - 0.5) * 0.5, y: 0.95 + r() * 0.25, z, s: 0.4 + r() * 0.3, ry: r() * Math.PI });
  return [k.geometry(), leafCards(cards, 0x5a7a3c)];
}

/** Ferns: a low spray of fronds out of the shade. */
function fern(p: Prop): THREE.BufferGeometry[] {
  const r = new Kit(seedOf(p)).r, cards: Card[] = [];
  for (let f = 0, n = 7 + Math.floor(r() * 5); f < n; f++) { const a = r() * Math.PI * 2; for (let t = 0.2; t <= 1; t += 0.25) cards.push({ x: Math.cos(a) * 0.7 * t, y: 0.15 + 0.35 * t - 0.25 * t * t, z: Math.sin(a) * 0.7 * t, s: 0.3, ry: a }); }
  return [leafCards(cards, 0x6a9a44)];
}

/** A potted plant left on a step: a big glazed pot with a small palm or a shrub in it. */
function potplant(p: Prop): THREE.BufferGeometry[] {
  const k = new Kit(seedOf(p)).use('concrete'), r = k.r, cards: Card[] = [];
  k.cyl(0.28, 0.36, 0.55, [0x2a4a6a, 0x8a4a32, 0x5a5a5a, 0x3a6a5a][Math.floor(r() * 4)], 0, 0, 0, 10);
  if (r() < 0.5) for (let f = 0; f < 7; f++) { const a = r() * Math.PI * 2; for (let t = 0.2; t <= 1; t += 0.2) cards.push({ x: Math.cos(a) * 0.8 * t, y: 0.6 + 1.1 * t - 0.6 * t * t, z: Math.sin(a) * 0.8 * t, s: 0.3, ry: a + Math.PI / 2 }); }
  else for (let i = 0; i < 10; i++) cards.push({ x: (r() - 0.5) * 0.6, y: 0.75 + r() * 0.6, z: (r() - 0.5) * 0.6, s: 0.4 + r() * 0.25, ry: r() * 3 });
  return [k.geometry(), leafCards(cards, 0x6a8a44)];
}

export const PLANTS: Record<string, (p: Prop) => THREE.BufferGeometry[]> = { camphor, palm, bamboo, ginkgo, hedge, fern, potplant };
