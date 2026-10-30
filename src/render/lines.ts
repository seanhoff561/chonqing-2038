// The lines he can ride (M3-52): cables strung across the streets and the ones he rigs, each a thin dark cylinder
// from end to end; a live one carries white insulators at its ends.
import * as THREE from 'three';
import type { Line } from '../world/world';
import { mergeGeometries } from './view';

const DARK = new THREE.MeshLambertMaterial({ color: 0x1c1c1e }), WHITE = new THREE.MeshLambertMaterial({ color: 0xd8d4c8 });

/** One mesh for the cables, one for the insulators. */
export function lineMeshes(lines: Line[]): THREE.Mesh[] {
  const cable: THREE.BufferGeometry[] = [], ins: THREE.BufferGeometry[] = [];
  const along = (a: THREE.Vector3, b: THREE.Vector3, r: number, out: THREE.BufferGeometry[]) => {
    const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), 5, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    out.push(g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2));
  };
  for (const l of lines) {
    const a = new THREE.Vector3(l.a.x, l.a.y, l.a.z), b = new THREE.Vector3(l.b.x, l.b.y, l.b.z);
    along(a, b, 0.022, cable);
    if (l.live) for (const [p, q] of [[a, b], [b, a]]) along(p, p.clone().lerp(q, 0.3 / p.distanceTo(q)), 0.06, ins);
  }
  return [[cable, DARK], [ins, WHITE]].filter(([g]) => (g as THREE.BufferGeometry[]).length).map(([g, m]) => new THREE.Mesh(mergeGeometries(g as THREE.BufferGeometry[]), m as THREE.Material));
}
