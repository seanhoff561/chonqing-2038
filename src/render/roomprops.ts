// Rooms' furniture and clutter in detail (M3-74, U-040), the props rooms.ts places (kind 'f:<model>'): code-built models on the prop atlas (timber, fabric,
// enamel, steel, plastic, cardboard), each fitted to its piece's size, in variants and states of decay: a bed's
// frame, mattress, pillows and a blanket thrown back; cabinets and wardrobes with doors, drawers and handles, now
// and then one hanging open; fridges, stoves and sinks; sofas with cushions; shelves of books; shop racks of goods;
// desks with old monitors; benches with tools; boxes, bottles, papers and clothes on the floor; a light on the
// ceiling. Thousands of them stand in the city's rooms, so they're built only near: tiles of them round the
// camera, each one mesh, freed again behind him.
import * as THREE from 'three';
import type { Prop } from '../world/world';
import { Kit } from './propkit';
import { propAtlas, atlasMaterial } from './prop-atlas';
import { mergeGeometries } from './view';

const MAT = atlasMaterial(new THREE.MeshPhongMaterial({ map: propAtlas(), vertexColors: true, shininess: 6 }));
const WOOD = [0x6b4a32, 0x8a6442, 0x4e3626, 0x9a7a58, 0x5a3e2c], CLOTH = [0x8a8478, 0x5a6a7a, 0x7a5a4a, 0x9a8a6a, 0x4a5a4a, 0x8a4a4a], ENAMEL = [0xd8d4c8, 0xc8c8be, 0xb8c0c0];
const BOOKS = [0x8a2a24, 0x2a4a6a, 0x3a5a3a, 0xc8b890, 0x5a3a5a, 0xa8742a, 0x2a2a2a];
type Model = (k: Kit, w: number, h: number, d: number) => void;
const pick = <T,>(k: Kit, a: T[]) => a[Math.floor(k.r() * a.length)];

/** Handles: a small bar on a door or drawer front at (x, y), its front at z. */
const handle = (k: Kit, x: number, y: number, z: number, upright = true) => k.use('metal').box(upright ? 0.02 : 0.12, upright ? 0.12 : 0.02, 0.03, 0x8a8a84, x, y, z + 0.015);
/** A carcass: sides, top, bottom, back, a plinth; its front open at +z. */
function carcass(k: Kit, w: number, h: number, d: number, c: number) {
  const t = 0.02;
  k.use('wood').box(t, h, d, c, -w / 2 + t / 2, 0, 0).box(t, h, d, c, w / 2 - t / 2, 0, 0).box(w, t, d, c, 0, h - t, 0).box(w - 2 * t, t, d - 0.02, c, 0, 0.08, 0)
    .box(w - 2 * t, h, t, c, 0, 0, -d / 2 + t / 2).box(w - 2 * t, 0.08, 0.02, c * 0 + 0x2a2420, 0, 0, d / 2 - 0.04);
}
/** Doors across a carcass's front: n leaves, one hanging open now and then. */
function doors(k: Kit, w: number, y0: number, h: number, d: number, n: number, c: number, open = 0.15) {
  const lw = (w - 0.04) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.02 + lw * (i + 0.5), ajar = k.r() < open;
    if (ajar) {
      // Swung out on its hinge at the carcass's edge.
      const side = i < n / 2 ? -1 : 1, hx = x + side * lw / 2, a = (0.6 + k.r() * 0.9) * -side;
      k.use('wood').box(lw - 0.01, h, 0.02, c, hx - side * Math.cos(a) * lw / 2, y0, d / 2 + Math.abs(Math.sin(a)) * lw / 2, a);
    } else {
      k.use('wood').box(lw - 0.01, h, 0.02, c, x, y0, d / 2);
      handle(k, x + (i < n / 2 ? lw / 2 - 0.06 : -lw / 2 + 0.06), y0 + h * 0.55, d / 2);
    }
  }
}
/** Drawers down a front: n of them from y0 to y1. */
function drawers(k: Kit, w: number, y0: number, y1: number, d: number, n: number, c: number, x = 0) {
  const dh = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const out = k.r() < 0.15 ? 0.15 + k.r() * 0.2 : 0;
    k.use('wood').box(w - 0.04, dh - 0.015, 0.02, c, x, y0 + i * dh, d / 2 + out);
    if (out) k.box(w - 0.08, dh * 0.6, out, c, x, y0 + i * dh + 0.02, d / 2 + out / 2 - 0.01);
    handle(k, x, y0 + i * dh + dh * 0.55, d / 2 + out, false);
  }
}
const legs = (k: Kit, w: number, d: number, h: number, c: number, t = 0.045, inset = 0.04, tex: 'wood' | 'metal' = 'wood') => {
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.use(tex).box(t, h, t, c, sx * (w / 2 - inset), 0, sz * (d / 2 - inset));
};
/** A row of books standing on a board at y, from x0 for len, depth d. */
function books(k: Kit, x0: number, len: number, y: number, d: number, maxH: number) {
  for (let x = x0; x < x0 + len - 0.03;) {
    const t = 0.02 + k.r() * 0.04, bh = maxH * (0.6 + k.r() * 0.4);
    if (k.r() < 0.12) { x += 0.08 + k.r() * 0.15; continue; }
    const lean = k.r() < 0.1 ? 0.3 : 0;
    k.use('cardboard').box(t, bh, d * (0.7 + k.r() * 0.25), pick(k, BOOKS), x + t / 2, y, 0, 0, 0, lean);
    x += t + 0.003;
  }
}
/** Goods on a shop shelf: tins, bottles, packets. */
function goods(k: Kit, x0: number, len: number, y: number, d: number, maxH: number) {
  for (let x = x0 + 0.05; x < x0 + len - 0.05; x += 0.08 + k.r() * 0.08) {
    if (k.r() < 0.35) continue;
    const q = k.r(), c = pick(k, [0xc83a2a, 0xe8c040, 0x2a6aa8, 0x3a8a4a, 0xe8e0d0, 0x8a3a8a]);
    if (q < 0.4) k.use('metal').cyl(0.035, 0.035, Math.min(maxH, 0.11), c, x, y, (k.r() - 0.5) * d * 0.5, 8);
    else if (q < 0.7) k.use('glass').cyl(0.03, 0.02, Math.min(maxH, 0.26), pick(k, [0x3a6a3a, 0x6a4a2a, 0xa8b8b0]), x, y, (k.r() - 0.5) * d * 0.5, 6);
    else k.use('cardboard').box(0.07, Math.min(maxH, 0.18), 0.05, c, x, y, (k.r() - 0.5) * d * 0.4);
  }
}

const MODELS: Record<string, Model> = {
  bed: (k, w, _h, d) => {
    const c = pick(k, WOOD), sheet = pick(k, [0xd8d0c0, 0xc8c0b0, 0xb8b0a0]);
    // Its length along x, the head at -x: frame rails, legs, headboard and footboard.
    legs(k, w, d, 0.3, c, 0.06, 0.04);
    k.use('wood').box(w, 0.12, 0.04, c, 0, 0.22, -d / 2 + 0.02).box(w, 0.12, 0.04, c, 0, 0.22, d / 2 - 0.02)
      .box(0.05, 0.9, d, c, -w / 2 + 0.025, 0, 0).box(0.05, 0.55, d, c, w / 2 - 0.025, 0, 0);
    // Mattress (stained), pillows at the head, a blanket thrown back.
    k.use('fabric').box(w - 0.12, 0.18, d - 0.06, sheet, 0.01, 0.3, 0);
    for (let i = 0, n = d > 1.2 ? 2 : 1; i < n; i++) k.box(0.4, 0.1, d / n - 0.12, 0xe0dcd0, -w / 2 + 0.3, 0.48, -d / 2 + (d / n) * (i + 0.5), 0.1, 0, 0.08);
    const bl = pick(k, CLOTH), fold = 0.3 + k.r() * 0.5;
    k.box(w * (0.55 - fold * 0.3), 0.05, d - 0.02, bl, w * (0.2 + fold * 0.15), 0.48, 0, (k.r() - 0.5) * 0.15);
    k.blob(0.22, bl, w * (0.05 - fold * 0.1), 0.55, (k.r() - 0.5) * d * 0.4, 0.4);
  },
  table: (k, w, h, d) => {
    const c = pick(k, WOOD);
    legs(k, w, d, h - 0.04, c, 0.05, 0.06);
    k.use('wood').box(w, 0.04, d, c, 0, h - 0.04, 0).box(w - 0.14, 0.08, 0.02, c, 0, h - 0.12, -d / 2 + 0.07).box(w - 0.14, 0.08, 0.02, c, 0, h - 0.12, d / 2 - 0.07);
    // On it: a bowl, a cup, a newspaper.
    if (k.r() < 0.6) k.use('plastic').cyl(0.09, 0.12, 0.06, pick(k, ENAMEL), (k.r() - 0.5) * w * 0.5, h, (k.r() - 0.5) * d * 0.4, 10);
    if (k.r() < 0.5) k.use('cardboard').box(0.3, 0.008, 0.4, 0xd8d0b8, (k.r() - 0.5) * w * 0.5, h, (k.r() - 0.5) * d * 0.3, k.r());
  },
  desk: (k, w, h, d) => {
    const c = pick(k, WOOD.concat([0x7a7a74]));
    k.use('wood').box(w, 0.035, d, c, 0, h - 0.035, 0);
    // A pedestal of drawers one side, a panel the other.
    k.box(0.42, h - 0.035, d - 0.04, c, w / 2 - 0.23, 0, 0);
    drawers(k, 0.42, 0.06, h - 0.06, d - 0.04, 3, c, w / 2 - 0.23);
    k.box(0.03, h - 0.035, d - 0.04, c, -w / 2 + 0.03, 0, 0).box(w - 0.5, 0.4, 0.02, c, -0.2, h - 0.45, -d / 2 + 0.04);
    if (k.r() < 0.7) {
      // An old CRT monitor and a keyboard.
      const mx = (k.r() - 0.5) * w * 0.3;
      k.use('plastic').box(0.4, 0.34, 0.38, 0xc8c4b4, mx, h + 0.02, -0.05).box(0.34, 0.27, 0.01, 0x1a1e20, mx, h + 0.055, 0.145)
        .box(0.16, 0.02, 0.14, 0xc8c4b4, mx, h, -0.05).box(0.44, 0.03, 0.15, 0xc0bcb0, mx, h, d / 2 - 0.12);
    }
  },
  chair: (k, w, _h, d) => {
    const c = pick(k, WOOD.concat([0x3a3e42]));
    legs(k, w, d, 0.44, c, 0.03, 0.03);
    k.use('wood').box(w, 0.03, d, c, 0, 0.44, 0).box(w, 0.42, 0.03, c, 0, 0.47, -d / 2 + 0.015);
  },
  stool: (k, w, h, d) => { const c = pick(k, WOOD.concat([0xa83a2a])); legs(k, w, d, h - 0.03, c, 0.03, 0.04); k.use('plastic').cyl(w / 2, w / 2, 0.03, c, 0, h - 0.03, 0, 12); },
  sofa: (k, w, _h, d) => {
    const c = pick(k, CLOTH);
    k.use('fabric').box(w, 0.25, d, c, 0, 0.08, 0).box(w, 0.45, 0.2, c, 0, 0.33, -d / 2 + 0.1).box(0.18, 0.28, d, c, -w / 2 + 0.09, 0.33, 0).box(0.18, 0.28, d, c, w / 2 - 0.09, 0.33, 0);
    // Seat cushions, one gone; a back cushion slumped.
    const n = w > 1.6 ? 3 : 2, cw = (w - 0.36) / n;
    for (let i = 0; i < n; i++) if (k.r() > 0.12) k.box(cw - 0.02, 0.12, d - 0.26, c, -w / 2 + 0.18 + cw * (i + 0.5), 0.33, 0.06, 0, (k.r() - 0.5) * 0.06);
    if (k.r() < 0.6) k.box(cw * 0.9, 0.35, 0.12, pick(k, CLOTH), (k.r() - 0.5) * w * 0.4, 0.45, -d / 2 + 0.28, (k.r() - 0.5) * 0.4, -0.25);
    legs(k, w, d, 0.08, 0x2a2420, 0.05, 0.08);
  },
  cabinet: (k, w, h, d) => { const c = pick(k, WOOD); carcass(k, w, h, d, c); k.box(w + 0.03, 0.03, d + 0.02, c, 0, h, 0); doors(k, w, 0.1, h - 0.14, d, 2, c, 0.2); },
  wardrobe: (k, w, h, d) => {
    const c = pick(k, WOOD);
    carcass(k, w, h, d, c);
    k.use('wood').box(w + 0.06, 0.06, d + 0.04, c, 0, h - 0.02, 0);
    doors(k, w, 0.1, h - 0.16, d, 2, c, 0.25);
    // A rail inside, clothes on it (seen when a door hangs open).
    k.use('metal').cyl(0.012, 0.012, w - 0.06, 0x8a8a84, -w / 2 + 0.03, h - 0.3, 0, 6, 'x');
    for (let x = -w / 2 + 0.12; x < w / 2 - 0.1; x += 0.12 + k.r() * 0.1) if (k.r() < 0.6) k.use('fabric').box(0.04, 0.7 + k.r() * 0.4, d * 0.7, pick(k, CLOTH), x, h - 1.3, 0);
  },
  drawer: (k, w, h, d) => { const c = pick(k, WOOD); carcass(k, w, h, d, c); k.box(w + 0.02, 0.03, d + 0.02, c, 0, h, 0); drawers(k, w, 0.1, h - 0.02, d, 3, c); if (k.r() < 0.5) k.use('glass').cyl(0.05, 0.04, 0.2, 0x8aa0a0, w * 0.25, h + 0.03, 0, 8); },
  locker: (k, w, h, d) => {
    const c = pick(k, [0x5a6a6a, 0x6a7a5a, 0x8a8a84, 0x4a5a6a]);
    k.use('metal').box(w, h, d, c, 0, 0, 0).box(w - 0.04, h - 0.08, 0.015, c, 0, 0.05, d / 2 + 0.005);
    for (let y = h - 0.25; y > h - 0.45; y -= 0.04) k.box(w * 0.6, 0.012, 0.01, 0x1a1c1e, 0, y, d / 2 + 0.013);
    k.box(0.03, 0.12, 0.03, 0x2a2a2a, w / 2 - 0.08, h * 0.5, d / 2 + 0.015).use('paint').box(0.08, 0.05, 0.005, 0xd8d0b8, 0, h - 0.15, d / 2 + 0.015);
  },
  fridge: (k, w, h, d) => {
    const c = pick(k, ENAMEL), rust = k.r() < 0.4;
    k.use(rust ? 'rust' : 'paint').box(w, h, d, c, 0, 0, 0);
    // Freezer over fridge, a seam between, long handles.
    k.use('paint').box(w - 0.01, 0.01, 0.01, 0x5a5a56, 0, h * 0.68, d / 2 + 0.002);
    k.use('metal').box(0.025, 0.25, 0.04, 0xa8a8a0, -w / 2 + 0.07, h * 0.75, d / 2 + 0.02).box(0.025, 0.5, 0.04, 0xa8a8a0, -w / 2 + 0.07, h * 0.3, d / 2 + 0.02);
    if (k.r() < 0.5) k.use('cardboard').box(0.08, 0.1, 0.005, pick(k, BOOKS), w * 0.2, h * 0.55, d / 2 + 0.003);
  },
  stove: (k, w, h, d) => {
    k.use('paint').box(w, h - 0.02, d, 0xd0ccc0, 0, 0, 0).use('metal').box(w, 0.02, d, 0x2a2a2a, 0, h - 0.02, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.cyl(0.08, 0.08, 0.025, 0x1a1a1a, x * w * 0.22, h, z * d * 0.2, 10);
    k.use('glass').box(w * 0.6, h * 0.35, 0.01, 0x1a1e20, 0, h * 0.2, d / 2 + 0.005).use('metal').box(w * 0.7, 0.02, 0.03, 0xa8a8a0, 0, h * 0.62, d / 2 + 0.02);
    for (let i = 0; i < 4; i++) k.cyl(0.015, 0.015, 0.02, 0x2a2a2a, -w * 0.3 + i * w * 0.2, h * 0.8, d / 2 + 0.01, 8, 'z');
    if (k.r() < 0.6) k.cyl(0.12, 0.11, 0.12, 0x5a5a56, -w * 0.22, h + 0.025, -d * 0.2, 12);
  },
  sink: (k, w, h, d) => {
    const c = pick(k, WOOD);
    carcass(k, w, h - 0.04, d, c); doors(k, w, 0.1, h - 0.2, d, 2, c, 0.25);
    k.use('metal').box(w, 0.04, d, 0xa8aaa8, 0, h - 0.04, 0).box(w * 0.6, 0.012, d * 0.6, 0x5a5c5c, 0, h - 0.005, 0.02);
    k.cyl(0.015, 0.015, 0.25, 0xa8aaa8, 0, h, -d / 2 + 0.08, 8).cyl(0.012, 0.012, 0.15, 0xa8aaa8, 0, h + 0.24, -d / 2 + 0.08, 6, 'z');
  },
  counter: (k, w, h, d) => {
    const c = pick(k, WOOD.concat([0xd0ccc0]));
    carcass(k, w, h - 0.04, d, c); doors(k, w, 0.1, h - 0.2, d, Math.max(2, Math.round(w / 0.5)), c, 0.2);
    k.use('stone').box(w + 0.02, 0.04, d + 0.03, pick(k, [0xb8b4a8, 0x8a8a84, 0xd8d4c8]), 0, h - 0.04, 0);
    // A kettle, jars, a chopping board.
    if (k.r() < 0.6) k.use('metal').cyl(0.08, 0.07, 0.2, 0xb8b8b0, w * 0.3, h, -0.05, 10);
    for (let i = 0, n = Math.floor(k.r() * 4); i < n; i++) k.use('glass').cyl(0.04, 0.04, 0.12 + k.r() * 0.08, pick(k, [0x8a6a3a, 0xc8b890, 0x6a8a6a]), -w / 2 + 0.15 + i * 0.1, h, -d / 2 + 0.1, 8);
    if (k.r() < 0.5) k.use('wood').box(0.35, 0.02, 0.25, 0x9a7a58, -w * 0.15, h, 0.02, 0.2);
  },
  shelf: (k, w, h, d) => {
    const c = pick(k, WOOD.concat([0x7a7a74]));
    k.use('wood').box(0.02, h, d, c, -w / 2 + 0.01, 0, 0).box(0.02, h, d, c, w / 2 - 0.01, 0, 0).box(w, h, 0.01, c, 0, 0, -d / 2 + 0.005);
    const n = 5, gap = h / n;
    for (let i = 0; i < n; i++) {
      const y = 0.05 + i * gap, tilt = k.r() < 0.08 ? 0.12 : 0;
      k.use('wood').box(w - 0.04, 0.02, d - 0.01, c, 0, y, 0, 0, 0, tilt);
      if (!tilt) books(k, -w / 2 + 0.03, w - 0.06, y + 0.02, d, Math.min(0.3, gap - 0.06));
    }
  },
  rack: (k, w, h, d) => {
    const c = pick(k, [0x6a6a66, 0x3a5a7a, 0x8a8a84]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.use('metal').box(0.035, h, 0.035, c, sx * (w / 2 - 0.02), 0, sz * (d / 2 - 0.02));
    for (let i = 0, n = 4; i < n; i++) {
      const y = 0.1 + i * ((h - 0.2) / (n - 1));
      k.use('metal').box(w, 0.02, d, c, 0, y, 0);
      if (i < n - 1) goods(k, -w / 2, w, y + 0.02, d, (h - 0.2) / (n - 1) - 0.08);
    }
  },
  crate: (k, w, h, d) => {
    const c = pick(k, [0x9a7a50, 0x8a6a44, 0xa88a60]);
    for (let y = 0; y < h - 0.05; y += 0.16) k.use('wood').box(w, 0.12, 0.02, c, 0, y, d / 2 - 0.01).box(w, 0.12, 0.02, c, 0, y, -d / 2 + 0.01).box(0.02, 0.12, d, c, w / 2 - 0.01, y, 0).box(0.02, 0.12, d, c, -w / 2 + 0.01, y, 0);
    k.box(w - 0.04, 0.02, d - 0.04, c * 0 + 0x6a5434, 0, 0.02, 0);
    if (k.r() < 0.5) k.box(w, 0.02, d, c, 0.05, h - 0.02, 0.03, 0.15);
    else for (let i = 0; i < 4; i++) k.use('cardboard').box(0.2, 0.15, 0.15, pick(k, [0xb89a70, 0xd8c8a8]), (k.r() - 0.5) * (w - 0.3), 0.04, (k.r() - 0.5) * (d - 0.3), k.r());
  },
  // Clutter on the floor.
  books: (k, w, _h, d) => { for (let y = 0, n = 2 + Math.floor(k.r() * 5); n > 0; n--) { const t = 0.03 + k.r() * 0.03; k.use('cardboard').box(w * (0.7 + k.r() * 0.3), t, d * (0.7 + k.r() * 0.3), pick(k, BOOKS), (k.r() - 0.5) * 0.05, y, 0, (k.r() - 0.5) * 0.8); y += t; } },
  bottles: (k, w, _h, d) => { for (let i = 0, n = 1 + Math.floor(k.r() * 4); i < n; i++) { const down = k.r() < 0.4; k.use('glass').cyl(0.035, 0.025, 0.26, pick(k, [0x3a6a3a, 0x6a4a2a, 0xa8b8b0, 0x2a2a2a]), (k.r() - 0.5) * w, down ? 0.035 : 0, (k.r() - 0.5) * d, 6, down ? 'x' : 'y', k.r() * 6); } },
  papers: (k, w, _h, d) => { for (let i = 0, n = 3 + Math.floor(k.r() * 6); i < n; i++) k.use('cardboard').box(0.21, 0.002, 0.29, pick(k, [0xe8e4d8, 0xd8d0b8, 0xc8c0a8]), (k.r() - 0.5) * w * 1.6, 0.002 * i, (k.r() - 0.5) * d * 1.6, k.r() * 6, (k.r() - 0.5) * 0.05); },
  box: (k, w, h, d) => {
    const c = pick(k, [0xb89a70, 0xa88a60, 0xc8b088]);
    k.use('cardboard').box(w, h, d, c, 0, 0, 0);
    // Flaps open or tape across.
    if (k.r() < 0.5) k.box(w, 0.005, d * 0.5, c, 0, h, d * 0.45, 0, -0.9).box(w, 0.005, d * 0.5, c, 0, h, -d * 0.45, 0, 0.9);
    else k.use('plastic').box(0.05, 0.003, d + 0.01, 0xc8b890, 0, h, 0);
  },
  clothes: (k, w, _h, d) => { for (let i = 0, n = 1 + Math.floor(k.r() * 3); i < n; i++) k.use('fabric').blob(0.12 + k.r() * 0.12, pick(k, CLOTH), (k.r() - 0.5) * w, 0.04, (k.r() - 0.5) * d, 0.3); },
  bag: (k, _w, _h, _d) => { k.use('bag').blob(0.2, pick(k, [0x2a2c2e, 0x5a4a3a, 0x3a4a6a]), 0, 0.15, 0, 0.8); k.use('fabric').cyl(0.01, 0.01, 0.3, 0x2a2a2a, -0.1, 0.3, 0, 4, 'x'); },
  // A light on the ceiling (y at the ceiling): a fluorescent fitting, or a bare bulb on its flex.
  light: (k, _w, _h, _d) => {
    if (k.r() < 0.6) {
      const hang = k.r() < 0.2;
      k.use('metal').box(1.25, 0.06, 0.16, 0xc8c8c0, 0, -0.07, 0, 0, 0, hang ? 0.35 : 0).use('plastic').box(1.2, 0.02, 0.12, 0xf0f0e8, 0, -0.09, 0, 0, 0, hang ? 0.35 : 0);
    } else {
      const drop = 0.4 + k.r() * 0.6;
      k.use('plastic').cyl(0.004, 0.004, drop, 0x1a1a1a, 0, -drop, 0, 4).cyl(0.03, 0.03, 0.06, 0x5a5a56, 0, -drop - 0.06, 0, 8).use('glass').blob(0.04, 0xe8e0c8, 0, -drop - 0.09, 0);
    }
  },
};
export const furnitureKinds = () => Object.keys(MODELS);

/** One piece, in place: built on its kit, knocked over onto its back if fallen, then moved and turned. */
function piece(p: Prop): THREE.BufferGeometry | null {
  const kind = p.kind.slice(2), m = MODELS[kind];
  if (!m) return null;
  const k = new Kit((Math.round(p.x * 31) * 73856093) ^ (Math.round(p.z * 17) * 19349663) ^ Math.round(p.y * 7));
  // (Furniture and what's in it as it is: it stands out against the faded city, M3-63.)
  k.muted = false;
  m(k, p.w ?? 0.5, p.h ?? 0.5, p.d ?? 0.5);
  const g = k.geometry(), M = new THREE.Matrix4();
  // On its back: its front up, lying where its footprint now runs out from the wall.
  // (Front up, then its top turned to point out of the wall; its back's edge stays at the wall.)
  if (p.text === 'fallen') g.applyMatrix4(M.makeRotationX(-Math.PI / 2)).applyMatrix4(M.makeRotationY(Math.PI)).applyMatrix4(M.makeTranslation(0, (p.d ?? 0.5) / 2, -(p.d ?? 0.5) / 2));
  return g.applyMatrix4(M.makeRotationY(p.yaw)).applyMatrix4(M.makeTranslation(p.x, p.y, p.z));
}

const TILE = 24, NEAR = 40, FAR = 52;
/** The rooms' furniture near the camera: built a tile a frame as he comes within NEAR, freed past FAR. */
export class RoomProps {
  readonly group = new THREE.Group();
  private tiles = new Map<string, Prop[]>();
  private built = new Map<string, { mesh: THREE.Mesh; i: number; j: number }>();
  constructor(props: Prop[]) {
    for (const p of props) { const k = this.key(Math.floor(p.x / TILE), Math.floor(p.z / TILE)); (this.tiles.get(k) ?? this.tiles.set(k, []).get(k)!).push(p); }
  }
  private key(i: number, j: number) { return `${i},${j}`; }
  update(at: THREE.Vector3) {
    const ci = Math.floor(at.x / TILE), cj = Math.floor(at.z / TILE), r = Math.ceil(NEAR / TILE);
    let todo = 1;
    for (let i = ci - r; i <= ci + r && todo; i++) for (let j = cj - r; j <= cj + r && todo; j++) {
      const k = this.key(i, j), ps = this.tiles.get(k);
      if (!ps || this.built.has(k) || this.dist(i, j, at) > NEAR) continue;
      const parts = ps.map(piece).filter((g): g is THREE.BufferGeometry => !!g);
      const mesh = new THREE.Mesh(parts.length ? mergeGeometries(parts) : new THREE.BufferGeometry(), MAT);
      mesh.receiveShadow = true;
      this.group.add(mesh); this.built.set(k, { mesh, i, j }); todo--;
    }
    for (const [k, b] of this.built) if (this.dist(b.i, b.j, at) > FAR) { this.group.remove(b.mesh); b.mesh.geometry.dispose(); this.built.delete(k); }
  }
  private dist(i: number, j: number, at: THREE.Vector3) { return Math.hypot(Math.max(i * TILE - at.x, 0, at.x - (i + 1) * TILE), Math.max(j * TILE - at.z, 0, at.z - (j + 1) * TILE)); }
  dispose() { for (const b of this.built.values()) b.mesh.geometry.dispose(); this.built.clear(); this.group.clear(); }
}
