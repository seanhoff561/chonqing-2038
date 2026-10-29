// The held item in his right hand: a simple stand-in shape per item, coloured by kind.
import * as THREE from 'three';
import { item } from '../data/items';

const COLORS: Record<string, number> = { food: 0xb08a3a, drink: 0x5a8ab0, tool: 0x6a6e72, weapon: 0x2a2c2e, ammo: 0x8a7a40, med: 0xc0c0b8, part: 0x40707a, key: 0xc8a840, wear: 0x4a5a3a, throw: 0x6a4a3a, device: 0x2a3a40, misc: 0x707070 };

export function heldMesh(id: string): THREE.Object3D {
  const d = item(id);
  const long = Math.max(d.w, d.h), short = Math.min(d.w, d.h);
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.05 + short * 0.03, 0.04 + short * 0.02, 0.06 + long * 0.07), new THREE.MeshLambertMaterial({ color: COLORS[d.cat] ?? 0x777777 }));
  m.position.z = -0.04 - long * 0.03;
  g.add(m);
  return g;
}
