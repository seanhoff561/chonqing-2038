// A small kit for code-built props (M3-34): boxes, cylinders and lumpy blobs, each part tinted, a little dirtier
// or faded at random, and given a surface from the prop atlas (U-016) with UVs in metres projected along its
// faces, merged into one geometry so every prop draws with one shared material.
import * as THREE from 'three';
import { mulberry } from './rand';
import { TEX_SCALE, tileOf, type Tex } from './prop-atlas';

const DUST = new THREE.Color(0x9a9282);

export class Kit {
  private pos: number[] = [];
  private nor: number[] = [];
  private col: number[] = [];
  private uv: number[] = [];
  private tile: number[] = [];
  private c = new THREE.Color();
  private tex: Tex = 'plain';
  readonly r: () => number;

  constructor(seed: number) { this.r = mulberry(seed); }

  /** The surface for the parts that follow. */
  use(tex: Tex) { this.tex = tex; return this; }

  /** Add a geometry in prop space, tinted `color` with up to `vary` of random dirt. */
  add(g: THREE.BufferGeometry, color: number, vary = 0.12) {
    const ng = g.index ? g.toNonIndexed() : g;
    ng.computeVertexNormals();
    const p = ng.getAttribute('position'), n = ng.getAttribute('normal');
    this.c.setHex(color).multiplyScalar(1 - this.r() * vary);
    const k = 1 / TEX_SCALE[this.tex], t = tileOf(this.tex), ou = this.r() * 7, ov = this.r() * 7;
    for (let i = 0; i < p.count; i += 3) {
      // One projection per triangle, along its face normal: the texture's up stays up on the sides.
      const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
      // Years of dust settle on whatever faces up.
      const d = this.tex === 'glass' || this.tex === 'leaves' ? 0 : Math.max(0, n.getY(i) - 0.5) * 0.7;
      const cr = this.c.r + (DUST.r - this.c.r) * d, cg = this.c.g + (DUST.g - this.c.g) * d, cb = this.c.b + (DUST.b - this.c.b) * d;
      for (let j = i; j < i + 3; j++) {
        const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
        this.pos.push(x, y, z);
        this.nor.push(n.getX(j), n.getY(j), n.getZ(j));
        this.col.push(cr, cg, cb);
        const [u, v] = ny >= nx && ny >= nz ? [x, z] : nx >= nz ? [z, y] : [x, y];
        this.uv.push(ou + u * k, ov + v * k);
        this.tile.push(t);
      }
    }
    return this;
  }

  /** A box w x h x d standing on y (centred in x and z), turned by ry then tilted by rx/rz. */
  box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
    const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
    return this.add(place(g, x, y, z, ry, rx, rz), color);
  }

  /** A cylinder (radii r0 bottom, r1 top) of height h standing on y; axis 'x' or 'z' lays it down. */
  cyl(r0: number, r1: number, h: number, color: number, x = 0, y = 0, z = 0, seg = 8, axis: 'y' | 'x' | 'z' = 'y', ry = 0) {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg).translate(0, h / 2, 0);
    if (axis === 'x') g.rotateZ(-Math.PI / 2).translate(-h / 2, 0, 0); else if (axis === 'z') g.rotateX(Math.PI / 2).translate(0, 0, -h / 2);
    return this.add(place(g, x, y, z, ry), color);
  }

  /** A side profile of (z, y) points extruded w wide across x, centred on x: car bodies, cabins, ramps. */
  prism(pts: [number, number][], w: number, color: number, x = 0) {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))), { depth: w, bevelEnabled: false });
    return this.add(g.rotateY(-Math.PI / 2).translate(x + w / 2, 0, 0), color);
  }

  /** A lumpy blob (foliage, rubble, sacks): an icosahedron with jittered vertices, squashed by sy. */
  blob(rad: number, color: number, x = 0, y = 0, z = 0, sy = 1, detail = 1) {
    const g = new THREE.IcosahedronGeometry(rad, detail);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) { const k = 0.8 + this.r() * 0.4; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * sy, p.getZ(i) * k); }
    return this.add(g.translate(x, y, z), color, 0.25);
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('tile', new THREE.Float32BufferAttribute(this.tile, 1));
    return g;
  }
}

function place(g: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) {
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  return g.translate(x, y, z);
}

/** Leaf cards: crossed quads carrying the leaf texture, for canopies, vines and weeds. */
export function leafCards(cards: { x: number; y: number; z: number; s: number; ry: number }[], tint: number): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], col: number[] = [], tile: number[] = [];
  const c = new THREE.Color(tint);
  for (const k of cards) for (const a of [k.ry, k.ry + Math.PI / 2]) {
    const dx = Math.cos(a) * k.s / 2, dz = Math.sin(a) * k.s / 2, h = k.s / 2;
    const a0 = 0.001, a1 = 0.999;
    const q = [[-dx, -h, -dz, a0, a0], [dx, -h, dz, a1, a0], [dx, h, dz, a1, a1], [-dx, -h, -dz, a0, a0], [dx, h, dz, a1, a1], [-dx, h, -dz, a0, a1]];
    // Both windings, normals up on each: lit like a canopy from either side, with front-face culling kept.
    for (const [px, py, pz, u, v] of [...q, ...[...q].reverse()]) { pos.push(k.x + px, k.y + py, k.z + pz); nor.push(0, 1, 0); uv.push(u, v); col.push(c.r, c.g, c.b); tile.push(LEAVES); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('tile', new THREE.Float32BufferAttribute(tile, 1));
  return g;
}
const LEAVES = tileOf('leaves');
