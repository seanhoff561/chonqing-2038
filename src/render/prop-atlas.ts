// The prop texture atlas (U-016): sixteen painted-realistic surfaces in one 1024 px canvas, drawn after the
// reference photos (chipped paint, rust, rubber, cast concrete, timber, tarp, plastic, grimy glass, leaves,
// cardboard, stone, bark, bin bags, galvanised metal, faded sign faces). Parts carry a tile index and UVs in
// metres; the shader wraps each part's UVs inside its tile, so the whole library still draws with one material.
import * as THREE from 'three';
import { canvasTexture } from './textures';
import { mulberry } from './rand';

export const TILES = ['paint', 'rust', 'rubber', 'concrete', 'wood', 'fabric', 'plastic', 'glass', 'leaves', 'cardboard', 'stone', 'bark', 'bag', 'metal', 'sign', 'plain'] as const;
export type Tex = (typeof TILES)[number];
/** Metres one repeat of each surface covers. */
export const TEX_SCALE: Record<Tex, number> = { paint: 1.6, rust: 1.2, rubber: 0.6, concrete: 1.5, wood: 1.2, fabric: 0.8, plastic: 1, glass: 1.4, leaves: 1, cardboard: 0.8, stone: 1.6, bark: 1, bag: 0.6, metal: 1.4, sign: 1.5, plain: 2 };
export const tileOf = (t: Tex) => TILES.indexOf(t);

const S = 256;
type Paint = (g: CanvasRenderingContext2D, r: () => number) => void;

/** Draw `f` at the tile and its wrapped neighbours so shapes crossing an edge come back on the other side. */
const wrap = (g: CanvasRenderingContext2D, f: () => void) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.save(); g.translate(dx, dy); f(); g.restore(); } };
const speckle = (g: CanvasRenderingContext2D, r: () => number, n: number, amount: number, size = 2) => {
  for (let i = 0; i < n; i++) { const v = (r() - 0.5) * amount; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(r() * S, r() * S, 1 + r() * size, 1 + r() * size); }
};
const blot = (g: CanvasRenderingContext2D, r: () => number, n: number, rgb: string, a: number, r0: number, r1: number) => {
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, rad = r0 + r() * (r1 - r0), al = a * (0.3 + r() * 0.7);
    wrap(g, () => { const grd = g.createRadialGradient(x, y, 0, x, y, rad); grd.addColorStop(0, `rgba(${rgb},${al})`); grd.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); });
  }
};
const scratches = (g: CanvasRenderingContext2D, r: () => number, n: number, rgb: string, a: number) => {
  g.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, l = 4 + r() * 18, an = r() * Math.PI;
    g.strokeStyle = `rgba(${rgb},${a * (0.4 + r() * 0.6)})`;
    wrap(g, () => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke(); });
  }
};
/** Grime running down from the top of a tile (the top of a part), as rain leaves it. */
const runs = (g: CanvasRenderingContext2D, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) {
    const x = r() * S, l = 30 + r() * 150, w = 1 + r() * 6;
    const grd = g.createLinearGradient(0, 0, 0, l); grd.addColorStop(0, `rgba(30,26,20,${a * (0.4 + r() * 0.6)})`); grd.addColorStop(1, 'rgba(30,26,20,0)');
    g.fillStyle = grd; g.fillRect(x, 0, w, l);
  }
};
const fill = (g: CanvasRenderingContext2D, c: string) => { g.fillStyle = c; g.fillRect(0, 0, S, S); };

const PAINTERS: Record<Tex, Paint> = {
  // Painted sheet metal: fine orange-peel, chips down to dark primer, rust blooming from the chips, grime runs.
  paint: (g, r) => { fill(g, '#dcdcdc'); speckle(g, r, 3000, 0.08); blot(g, r, 14, '255,255,255', 0.12, 10, 40); scratches(g, r, 24, '70,70,70', 0.25); blot(g, r, 10, '120,70,30', 0.5, 2, 9); blot(g, r, 6, '90,50,25', 0.35, 8, 22); runs(g, r, 18, 0.25); },
  rust: (g, r) => { fill(g, '#8a5a3a'); speckle(g, r, 6000, 0.35, 3); blot(g, r, 30, '150,80,35', 0.6, 8, 40); blot(g, r, 20, '60,35,20', 0.6, 6, 30); blot(g, r, 8, '200,120,60', 0.4, 4, 14); },
  // Tyre rubber: near black, a diagonal tread, dust in the grooves.
  rubber: (g, r) => { fill(g, '#3a3a3a'); for (let y = 0; y < S; y += 16) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, y, S, 6); } speckle(g, r, 2500, 0.2); blot(g, r, 10, '120,110,95', 0.25, 10, 40); },
  // Cast concrete: pits, form lines, damp stains low and grime from the top.
  concrete: (g, r) => { fill(g, '#cfccc4'); speckle(g, r, 7000, 0.22); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.3})`; g.beginPath(); g.arc(r() * S, r() * S, 0.6 + r() * 1.6, 0, 7); g.fill(); } g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, S / 2, S, 2); blot(g, r, 12, '70,66,55', 0.25, 15, 60); runs(g, r, 20, 0.3); },
  // Weathered planks: grain lines, dark gaps every 64 px, grey sun-bleached ends.
  wood: (g, r) => {
    fill(g, '#b8a184');
    for (let y = 0; y < S; y += 64) {
      g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.12})`; g.fillRect(0, y, S, 64);
      for (let i = 0; i < 26; i++) { const yy = y + 4 + r() * 56; g.strokeStyle = `rgba(60,40,25,${0.15 + r() * 0.25})`; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(S / 3, yy + (r() - 0.5) * 6, (2 * S) / 3, yy + (r() - 0.5) * 6, S, yy); g.stroke(); }
      g.fillStyle = 'rgba(25,18,12,0.8)'; g.fillRect(0, y, S, 3);
    }
    blot(g, r, 8, '40,30,20', 0.35, 4, 10); blot(g, r, 10, '150,150,150', 0.3, 20, 60);
  },
  // Woven tarp or cloth: a fine weave, folds and water stains.
  fabric: (g, r) => { fill(g, '#d8d6d0'); for (let i = 0; i < S; i += 3) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(i, 0, 1, S); g.fillRect(0, i, S, 1); } for (let i = 0; i < 8; i++) { const x = r() * S; const grd = g.createLinearGradient(x - 12, 0, x + 12, 0); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, 'rgba(0,0,0,0.18)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(x - 12, 0, 24, S); } blot(g, r, 12, '90,80,60', 0.3, 10, 45); },
  // Moulded plastic: smooth, scuffed, sun-chalked.
  plastic: (g, r) => { fill(g, '#e0e0e0'); speckle(g, r, 1200, 0.05); blot(g, r, 16, '255,255,255', 0.2, 15, 50); scratches(g, r, 30, '80,80,80', 0.2); blot(g, r, 8, '60,55,45', 0.3, 6, 25); },
  // Grimy glass: dark, a sky reflection band, dirt thick at the bottom, rain tracks, the odd crack.
  glass: (g, r) => {
    const grd = g.createLinearGradient(0, 0, 0, S); grd.addColorStop(0, '#8a96a0'); grd.addColorStop(0.45, '#4a545c'); grd.addColorStop(1, '#6a6458'); g.fillStyle = grd; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(40, 0); g.lineTo(110, 0); g.lineTo(30, S); g.lineTo(-40, S); g.fill();
    for (let i = 0; i < 40; i++) { const x = r() * S; g.fillStyle = `rgba(180,175,160,${r() * 0.15})`; g.fillRect(x, r() * S * 0.5, 1 + r() * 2, 40 + r() * 120); }
    g.strokeStyle = 'rgba(230,230,230,0.5)'; g.lineWidth = 1; for (let k = 0; k < 2; k++) { let x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 6; i++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
  },
  leaves: (g, r) => {
    for (let i = 0; i < 150; i++) {
      const x = 16 + r() * (S - 32), y = 16 + r() * (S - 32), s = 9 + r() * 16, a = r() * Math.PI, v = 0.55 + r() * 0.45;
      g.fillStyle = `rgb(${Math.floor(150 * v)},${Math.floor(170 * v)},${Math.floor(110 * v)})`;
      g.beginPath(); g.ellipse(x, y, s, s * 0.42, a, 0, Math.PI * 2); g.fill();
      g.strokeStyle = `rgba(40,50,25,0.5)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x - Math.cos(a) * s, y - Math.sin(a) * s); g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); g.stroke();
    }
  },
  // Corrugated cardboard: flutes showing through, packing tape, water damage.
  cardboard: (g, r) => { fill(g, '#c4a47a'); for (let x = 0; x < S; x += 6) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(x, 0, 2, S); } g.fillStyle = 'rgba(210,190,150,0.7)'; g.fillRect(0, S / 2 - 14, S, 28); blot(g, r, 10, '70,50,30', 0.4, 10, 50); speckle(g, r, 1500, 0.1); },
  // Rough grey stone in courses, mortar dark.
  stone: (g, r) => { fill(g, '#8a8780'); for (let y = 0; y < S; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < S; x += 64) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.15})`; g.fillRect(x + 2, y + 2, 60, 28); } for (let y = 0; y < S; y += 32) { g.fillStyle = 'rgba(30,30,25,0.6)'; g.fillRect(0, y, S, 2); } speckle(g, r, 5000, 0.25); blot(g, r, 10, '60,70,40', 0.35, 10, 40); },
  bark: (g, r) => { fill(g, '#6a5a48'); for (let i = 0; i < 90; i++) { const x = r() * S; g.fillStyle = `rgba(20,15,10,${0.2 + r() * 0.4})`; wrap(g, () => g.fillRect(x, r() * S, 2 + r() * 4, 30 + r() * 90)); } speckle(g, r, 3000, 0.25); blot(g, r, 8, '80,100,50', 0.3, 10, 30); },
  // Black bin-bag plastic: wrinkles catch the light.
  bag: (g, r) => { fill(g, '#2a2a2a'); g.lineWidth = 2; for (let i = 0; i < 70; i++) { const x = r() * S, y = r() * S, l = 10 + r() * 50, an = r() * Math.PI; g.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.15})`; wrap(g, () => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(an + 0.6) * l / 2, y + Math.sin(an + 0.6) * l / 2, x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke(); }); } },
  // Galvanised metal: spangle, white rust, streaks and a seam.
  metal: (g, r) => { fill(g, '#b4b6b4'); blot(g, r, 40, '255,255,255', 0.12, 6, 20); blot(g, r, 30, '0,0,0', 0.1, 6, 20); speckle(g, r, 2500, 0.15); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, S - 4, S, 2); blot(g, r, 6, '110,70,35', 0.4, 3, 12); runs(g, r, 24, 0.3); },
  // A faded sign face: rows of characters in red and blue on white, peeling.
  sign: (g, r) => {
    fill(g, '#e8e4da');
    for (let row = 0; row < 3; row++) { g.fillStyle = ['#a8322a', '#2a4a8a', '#3a3a3a'][row]; for (let x = 14; x < S - 30;) { const w = 18 + r() * 14; for (let k = 0; k < 4; k++) g.fillRect(x + r() * w * 0.7, 20 + row * 80 + r() * 40, 3 + r() * w * 0.4, 3 + r() * 12); x += w + 6; } }
    blot(g, r, 12, '120,110,90', 0.4, 10, 40); blot(g, r, 6, '255,255,255', 0.5, 10, 30); runs(g, r, 14, 0.3);
  },
  plain: (g, r) => { fill(g, '#e6e6e6'); speckle(g, r, 2000, 0.06); blot(g, r, 8, '60,55,45', 0.15, 20, 60); },
};

export function propAtlas(): THREE.Texture {
  const t = canvasTexture('prop-atlas', S * 4, S * 4, g => {
    TILES.forEach((name, i) => {
      g.save(); g.translate((i % 4) * S, Math.floor(i / 4) * S);
      g.beginPath(); g.rect(0, 0, S, S); g.clip();
      PAINTERS[name](g, mulberry(101 + i));
      g.restore();
    });
  }, false);
  t.anisotropy = 4;
  return t;
}

/** Patch a material so its map is read through the atlas: the part's tile, its metre UVs wrapped inside it. */
export function atlasMaterial<M extends THREE.Material>(m: M): M {
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float tile;\nvarying float vTile;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvTile = tile;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTile;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
  vec2 cell = vec2(mod(vTile + 0.5, 4.0) - 0.5, 3.0 - floor((vTile + 0.5) / 4.0));
  vec2 atlasG = vMapUv * 0.234375;
  vec4 sampledDiffuseColor = textureGrad(map, (cell + 0.03125 + fract(vMapUv) * 0.9375) * 0.25, dFdx(atlasG), dFdy(atlasG));
  diffuseColor *= sampledDiffuseColor;
#endif`);
  };
  m.customProgramCacheKey = () => 'prop-atlas';
  return m;
}
