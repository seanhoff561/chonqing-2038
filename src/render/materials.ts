// World materials: canvas textures and the metres each texture repeat covers. Surfaces are weathered in the
// look of the reference photo (U-009): stains, rain streaks, moss, patching. Facades with window grids live
// in facades.ts and glow at night.
import * as THREE from 'three';
import { canvasTexture, noise, blotches, streaks } from './textures';
import { mulberry } from './rand';
import { MAT } from '../world/mats';
import { drawFacade, drawFacadeLights, isFacade, FACADE_M, FACADE_BAY } from './facades';

export { isFacade, FACADE_BAY };

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function grid(g: CanvasRenderingContext2D, w: number, h: number, cw: number, ch: number, line: string, lw: number, offsetRows = false) {
  g.strokeStyle = line; g.lineWidth = lw;
  for (let y = 0; y <= h; y += ch) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let y = 0, row = 0; y < h; y += ch, row++)
    for (let x = offsetRows && row % 2 ? cw / 2 : 0; x <= w; x += cw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + ch); g.stroke(); }
}

/** Units laid in courses (bricks, pavers, roof tiles), each a little different in tone. */
function courses(g: CanvasRenderingContext2D, w: number, h: number, cw: number, ch: number, joint: string, seed: number, vary: number, half = true) {
  const r = mulberry(seed);
  for (let y = 0, row = 0; y < h; y += ch, row++)
    for (let x = half && row % 2 ? -cw / 2 : 0; x < w; x += cw) {
      const v = (r() - 0.5) * vary;
      g.fillStyle = v > 0 ? `rgba(255,245,230,${v})` : `rgba(20,15,10,${-v})`;
      g.fillRect(x, y, cw, ch);
    }
  grid(g, w, h, cw, ch, joint, 2, half);
}

function cracks(g: CanvasRenderingContext2D, w: number, h: number, seed: number, n: number) {
  const r = mulberry(seed);
  g.strokeStyle = 'rgba(25,22,18,0.45)'; g.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    let x = r() * w, y = r() * h;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += r() * 25; g.lineTo(x, y); }
    g.stroke();
  }
}

const draws: Record<number, [Draw, number]> = {
  [MAT.concrete]: [(g, w, h) => {
    noise(g, w, h, '#8a867d', 0.16, 1);
    blotches(g, w, h, 101, 30, '50,46,40', 0.18, 20, 90); blotches(g, w, h, 102, 15, '225,220,205', 0.12, 20, 70);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < h; y += h / 4) g.fillRect(0, y, w, 2);
    streaks(g, 0, w, 0, 103, 40, [h * 0.1, h * 0.6], '45,42,36', 0.2); cracks(g, w, h, 104, 4);
  }, 4],
  [MAT.block]: [(g, w, h) => { noise(g, w, h, '#8a8478', 0.12, 2); g.fillStyle = '#c9a227'; g.fillRect(0, h - 22, w, 22); for (let x = -20; x < w; x += 40) { g.fillStyle = '#222'; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 20, h - 22); g.lineTo(x + 40, h - 22); g.lineTo(x + 20, h); g.fill(); } }, 2],
  [MAT.brick]: [(g, w, h) => {
    noise(g, w, h, '#6e655c', 0.14, 3); courses(g, w, h, 64, 18, 'rgba(50,46,42,0.85)', 31, 0.35);
    blotches(g, w, h, 32, 20, '40,48,34', 0.2, 15, 60); streaks(g, 0, w, 0, 33, 25, [h * 0.1, h * 0.5], '35,32,28', 0.18);
  }, 2],
  [MAT.metal]: [(g, w, h) => {
    noise(g, w, h, '#555a5e', 0.12, 4);
    for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, 0, 5, h); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 9, 0, 4, h); }
    blotches(g, w, h, 41, 18, '120,70,35', 0.3, 10, 50); streaks(g, 0, w, 0, 42, 20, [h * 0.2, h * 0.8], '110,65,30', 0.25);
  }, 1.5],
  [MAT.wood]: [(g, w, h) => {
    noise(g, w, h, '#5c4532', 0.14, 5);
    const r = mulberry(51);
    for (let y = 0; y < h; y += 2 + r() * 4) { g.fillStyle = `rgba(${r() < 0.5 ? '30,20,10' : '120,95,70'},${0.05 + r() * 0.1})`; g.fillRect(0, y, w, 1 + r() * 2); }
    grid(g, w, h, w, 42, 'rgba(0,0,0,0.5)', 3); blotches(g, w, h, 52, 10, '20,18,15', 0.25, 10, 40);
  }, 1.5],
  [MAT.tile]: [(g, w, h) => {
    noise(g, w, h, '#dcd8d0', 0.08, 6); courses(g, w, h, 32, 16, 'rgba(70,66,60,0.4)', 61, 0.12, false);
    blotches(g, w, h, 62, 25, '60,55,45', 0.2, 15, 70); streaks(g, 0, w, 0, 63, 40, [h * 0.1, h * 0.7], '50,46,40', 0.22);
  }, 1.5],
  [MAT.stone]: [(g, w, h) => {
    noise(g, w, h, '#716f69', 0.18, 7); courses(g, w, h, 96, 64, 'rgba(25,24,22,0.6)', 71, 0.25);
    blotches(g, w, h, 72, 25, '35,40,30', 0.2, 10, 50); cracks(g, w, h, 73, 6);
  }, 2],
  [MAT.plaster]: [(g, w, h) => {
    noise(g, w, h, '#ccc7bd', 0.14, 8);
    blotches(g, w, h, 81, 30, '70,65,55', 0.16, 20, 100); blotches(g, w, h, 82, 15, '230,225,210', 0.15, 20, 80);
    streaks(g, 0, w, 0, 83, 50, [h * 0.1, h * 0.8], '55,52,45', 0.22); cracks(g, w, h, 84, 5);
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(40,50,30,0.25)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, 4],
  [MAT.asphalt]: [(g, w, h) => { noise(g, w, h, '#4c4d4e', 0.18, 9); blotches(g, w, h, 91, 20, '0,0,0', 0.2, 20, 80); cracks(g, w, h, 92, 6); }, 4],
  [MAT.glass]: [(g, w, h) => {
    // Neutral grey glass: each tower's colour (M3-46) tints it.
    g.fillStyle = '#7c8488'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, 'rgba(200,212,220,0.35)'); grd.addColorStop(0.5, 'rgba(190,205,215,0.05)'); grd.addColorStop(1, 'rgba(200,212,220,0.25)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h); grid(g, w, h, 64, 96, '#11161a', 4); streaks(g, 0, w, 0, 93, 20, [h * 0.2, h], '20,25,28', 0.3);
  }, 3],
  [MAT.moss]: [(g, w, h) => { noise(g, w, h, '#45503a', 0.3, 11); blotches(g, w, h, 111, 40, '25,32,20', 0.4, 8, 40); blotches(g, w, h, 112, 20, '110,125,70', 0.25, 6, 25); }, 2],
  [MAT.grass]: [(g, w, h) => { noise(g, w, h, '#5a6838', 0.32, 251); blotches(g, w, h, 252, 70, '32,42,20', 0.35, 6, 34); blotches(g, w, h, 253, 50, '150,150,80', 0.3, 5, 22); blotches(g, w, h, 254, 30, '95,85,60', 0.3, 4, 16); }, 3],
  [MAT.rubble]: [(g, w, h) => { noise(g, w, h, '#77726a', 0.3, 261); blotches(g, w, h, 262, 120, '150,145,135', 0.5, 3, 12); blotches(g, w, h, 263, 70, '120,70,50', 0.45, 3, 10); blotches(g, w, h, 264, 90, '35,33,30', 0.45, 2, 8); blotches(g, w, h, 265, 25, '80,90,50', 0.3, 6, 20); }, 2.5],
  [MAT.crate]: [(g, w, h) => { noise(g, w, h, '#8a6a42', 0.15, 12); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); }, 0.8],
  [MAT.water]: [(g, w, h) => noise(g, w, h, '#1d2c2a', 0.1, 13), 4],
  [MAT.roofTile]: [(g, w, h) => {
    noise(g, w, h, '#3d3f41', 0.12, 14);
    for (let x = 0; x < w; x += 24) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x, 0, 9, h); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 17, 0, 6, h); }
    for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, y, w, 3); }
    blotches(g, w, h, 141, 30, '45,55,35', 0.35, 8, 40);
  }, 1.5],
  [MAT.blossom]: [(g, w, h) => { noise(g, w, h, '#cfb2b6', 0.3, 201); blotches(g, w, h, 202, 60, '190,120,140', 0.4, 6, 26); blotches(g, w, h, 203, 50, '60,45,40', 0.5, 4, 14); }, 2],
  [MAT.leaves]: [(g, w, h) => { noise(g, w, h, '#7a7a3a', 0.3, 211); blotches(g, w, h, 212, 60, '205,175,40', 0.45, 6, 24); blotches(g, w, h, 213, 40, '40,50,25', 0.4, 5, 20); }, 2],
  [MAT.tealMetal]: [(g, w, h) => {
    noise(g, w, h, '#3f7f86', 0.12, 221);
    for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x, 0, 6, h); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x + 10, 0, 4, h); }
    blotches(g, w, h, 222, 14, '120,90,60', 0.25, 10, 40);
  }, 2],
  [MAT.cloth]: [(g, w, h) => {
    const r = mulberry(231), cols = ['#8a2a22', '#3c5a7a', '#c9b98a', '#6a6f4a', '#d8d4c8', '#5a3d5c'];
    for (let x = 0; x < w; x += 32) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, 0, 32, h); }
    blotches(g, w, h, 232, 20, '30,25,20', 0.3, 10, 40);
  }, 1],
  [MAT.mark]: [(g, w, h) => { g.fillStyle = '#d4b020'; g.fillRect(0, 0, w, h); g.fillStyle = '#151515'; for (let x = -h; x < w; x += 48) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.lineTo(x + h + 24, 0); g.lineTo(x + 24, h); g.fill(); } }, 1],
};

const mats = new Map<string, THREE.MeshPhongMaterial>();
const glowing: THREE.MeshPhongMaterial[] = [];

/** A dull grey sky to reflect when surfaces are wet (M3-13). */
let skyEnv: THREE.CubeTexture | null = null;
function wetSky(): THREE.CubeTexture {
  if (skyEnv) return skyEnv;
  const face = (top: boolean, bottom: boolean) => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d')!, grd = g.createLinearGradient(0, 0, 0, 32);
    grd.addColorStop(0, top || !bottom ? '#7e868c' : '#2a2b2c'); grd.addColorStop(1, bottom || !top ? '#3a3c3e' : '#7e868c');
    g.fillStyle = bottom ? '#2a2b2c' : top ? '#7e868c' : grd; g.fillRect(0, 0, 32, 32);
    return c;
  };
  skyEnv = new THREE.CubeTexture([face(false, false), face(false, false), face(true, false), face(false, true), face(false, false), face(false, false)]);
  skyEnv.needsUpdate = true;
  return skyEnv;
}

/** Detail radius (U-012): detailed chunks draw inside it, the far stand-ins outside it. */
export const lodRadius = { value: 1e9 };
export type Lod = 'all' | 'near' | 'far';

/** Cut fragments by horizontal distance from the camera: near keeps inside the radius, far keeps outside. */
function lodCut(m: THREE.Material, lod: Lod) {
  if (lod === 'all') return;
  m.onBeforeCompile = sh => {
    sh.uniforms.uLodR = lodRadius;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vLodXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvLodXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vLodXZ;\nuniform float uLodR;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\nif (length(vLodXZ - cameraPosition.xz) ${lod === 'near' ? '>' : '<'} uLodR) discard;`);
  };
  m.customProgramCacheKey = () => lod;
}

/** A world material; vc for meshes that carry vertex colours (the merged world); lod splits near and far. */
export function material(id: number, vc = false, lod: Lod = 'all'): THREE.MeshPhongMaterial {
  const key = `${id}:${vc}:${lod}`;
  let m = mats.get(key);
  if (m) return m;
  if (id === MAT.lamp) {
    m = new THREE.MeshPhongMaterial({ color: 0xfff1c0, emissive: 0xffd890, emissiveIntensity: 1.2, vertexColors: vc });
    lodCut(m, lod);
  } else if (isFacade(id)) {
    const map = canvasTexture(`facade${id}`, 1024, 1024, (g, w) => drawFacade(id, g, w));
    const lights = canvasTexture(`facadeLit${id}`, 512, 512, (g, w) => drawFacadeLights(id, g, w));
    m = new THREE.MeshPhongMaterial({ map, vertexColors: vc, emissive: 0xffffff, emissiveMap: lights, emissiveIntensity: 0, ...DRY });
    glowing.push(m);
    lodCut(m, lod);
  } else {
    const [draw] = draws[id] ?? draws[MAT.concrete];
    const tex = canvasTexture(`mat${id}`, 512, 512, draw);
    // Water shows from below too (M3-48).
    m = new THREE.MeshPhongMaterial({ map: tex, vertexColors: vc, transparent: id === MAT.water, opacity: id === MAT.water ? 0.82 : 1, side: id === MAT.water ? THREE.DoubleSide : THREE.FrontSide, ...DRY });
    lodCut(m, lod);
  }
  mats.set(key, m);
  return m;
}

/** The open ground (M3-56b, M3-56c): paving giving way to grass and to rubble by per-vertex weights ('grass',
 *  'rubble'), each edge broken up by its texture's own tone so it wanders instead of following the triangles. */
export function groundMaterial(lod: Lod): THREE.MeshPhongMaterial {
  const key = `ground:${lod}`;
  let m = mats.get(key);
  if (m) return m;
  const grass = material(MAT.grass, true, lod).map, rubble = material(MAT.rubble, true, lod).map;
  const k = (texScale(MAT.concrete) / texScale(MAT.grass)).toFixed(4), kr = (texScale(MAT.concrete) / texScale(MAT.rubble)).toFixed(4);
  m = new THREE.MeshPhongMaterial({ map: material(MAT.concrete, true, lod).map, vertexColors: true, ...DRY });
  lodCut(m, lod);
  const cut = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    cut.call(m, sh, r);
    sh.uniforms.grassMap = { value: grass };
    sh.uniforms.rubbleMap = { value: rubble };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float grass;\nattribute float rubble;\nvarying vec2 vCover;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCover = vec2(grass, rubble);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D grassMap;\nuniform sampler2D rubbleMap;\nvarying vec2 vCover;')
      .replace('#include <map_fragment>', `vec4 sampledDiffuseColor = texture2D(map, vMapUv), gTex = texture2D(grassMap, vMapUv * ${k}), rTex = texture2D(rubbleMap, vMapUv * ${kr});
sampledDiffuseColor = mix(sampledDiffuseColor, gTex, smoothstep(0.35, 0.65, vCover.x + (gTex.g - 0.36) * 1.2));
diffuseColor *= mix(sampledDiffuseColor, rTex, smoothstep(0.35, 0.65, vCover.y + (rTex.r - 0.42) * 1.2));`);
  };
  m.customProgramCacheKey = () => `ground${lod}`;
  mats.set(key, m);
  return m;
}

const DRY = { shininess: 30, specular: 0x000000, reflectivity: 0, combine: THREE.MixOperation };
let wet = -1;
/** 0 dry to 1 soaked (M3-13): surfaces darken, pick up a sheen and reflect the grey sky. */
/** k: how wet (0..1); day: daylight 0..1, so the sky's reflection fades at night. Wet surfaces go darker with a
 *  sheen (U-019): no fresnel in Phong, so the reflection stays faint rather than washing everything pale. */
export function setWet(k: number, day = 1) {
  const r = 0.1 * k * (0.15 + 0.85 * day);
  if (Math.abs(k - wet) < 0.01 && Math.abs(r - wetR) < 0.005) return;
  wet = k; wetR = r;
  for (const m of mats.values()) {
    if (m.emissiveIntensity > 1) continue;
    if (k > 0 && !m.envMap) { m.envMap = wetSky(); m.needsUpdate = true; }
    m.color.setScalar(1 - 0.34 * k);
    m.specular.setScalar(0.25 * k * (0.3 + 0.7 * day));
    m.reflectivity = r;
  }
}
let wetR = 0;

/** 0 by day to 1 at night: lit windows glow. */
export function setNight(k: number) { for (const m of glowing) m.emissiveIntensity = k * 0.9; }

/** Metres covered by one texture repeat. */
export const texScale = (id: number) => (isFacade(id) ? FACADE_M : (draws[id] ?? draws[MAT.concrete])[1]);
