// World labels: canvas text cards on obstacle faces.
import * as THREE from 'three';
import type { Label } from '../world/world';
import { textTexture } from './textures';

export function buildLabels(labels: Label[]): THREE.Group {
  const g = new THREE.Group();
  for (const l of labels) {
    const { tex, aspect } = textTexture(l.text, { fg: '#111', bg: '#e8e2c8', size: 40 });
    const h = 0.32;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshBasicMaterial({ map: tex }));
    const off = 0.02;
    m.position.set(l.x, l.y, l.z);
    switch (l.face) {
      case 's': m.position.z += off; break;
      case 'n': m.position.z -= off; m.rotation.y = Math.PI; break;
      case 'e': m.position.x += off; m.rotation.y = Math.PI / 2; break;
      case 'w': m.position.x -= off; m.rotation.y = -Math.PI / 2; break;
      case 'up': m.position.y += off; m.rotation.x = -Math.PI / 2; break;
    }
    g.add(m);
  }
  return g;
}
