// World materials: canvas textures and the metres each texture repeat covers.
import * as THREE from 'three';
import { canvasTexture, noise } from './textures';
import { MAT } from '../world/mats';

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function grid(g: CanvasRenderingContext2D, w: number, h: number, cw: number, ch: number, line: string, lw: number, offsetRows = false) {
  g.strokeStyle = line; g.lineWidth = lw;
  for (let y = 0; y <= h; y += ch) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let y = 0, row = 0; y < h; y += ch, row++)
    for (let x = offsetRows && row % 2 ? cw / 2 : 0; x <= w; x += cw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + ch); g.stroke(); }
}

const draws: Record<number, [Draw, number]> = {
  [MAT.concrete]: [(g, w, h) => { noise(g, w, h, '#77746e', 0.18, 1); grid(g, w, h, 128, 128, 'rgba(0,0,0,0.25)', 2); }, 4],
  [MAT.block]: [(g, w, h) => { noise(g, w, h, '#8a8478', 0.12, 2); g.fillStyle = '#c9a227'; g.fillRect(0, h - 22, w, 22); for (let x = -20; x < w; x += 40) { g.fillStyle = '#222'; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 20, h - 22); g.lineTo(x + 32, h - 22); g.lineTo(x + 12, h); g.fill(); } }, 2],
  [MAT.brick]: [(g, w, h) => { noise(g, w, h, '#6b625a', 0.2, 3); grid(g, w, h, 64, 21, '#3d3833', 3, true); }, 2],
  [MAT.metal]: [(g, w, h) => { noise(g, w, h, '#4c5054', 0.15, 4); for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(0, y, w, 2); } }, 1],
  [MAT.wood]: [(g, w, h) => { noise(g, w, h, '#5a4330', 0.18, 5); grid(g, w, h, w, 32, 'rgba(0,0,0,0.45)', 3); }, 1.5],
  [MAT.tile]: [(g, w, h) => { noise(g, w, h, '#b9b4a8', 0.1, 6); grid(g, w, h, 32, 16, 'rgba(60,55,50,0.45)', 2); }, 1],
  [MAT.stone]: [(g, w, h) => { noise(g, w, h, '#6f6d68', 0.22, 7); grid(g, w, h, 96, 64, 'rgba(20,20,20,0.5)', 3, true); }, 2],
  [MAT.plaster]: [(g, w, h) => { noise(g, w, h, '#a39d90', 0.16, 8); const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(40,50,30,0.35)'); g.fillStyle = grd; g.fillRect(0, 0, w, h); }, 4],
  [MAT.asphalt]: [(g, w, h) => noise(g, w, h, '#2e2f31', 0.2, 9), 4],
  [MAT.glass]: [(g, w, h) => { g.fillStyle = '#26323a'; g.fillRect(0, 0, w, h); grid(g, w, h, 64, 96, '#11161a', 4); }, 3],
  [MAT.moss]: [(g, w, h) => noise(g, w, h, '#4a5640', 0.3, 11), 2],
  [MAT.crate]: [(g, w, h) => { noise(g, w, h, '#8a6a42', 0.15, 12); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); }, 0.8],
  [MAT.water]: [(g, w, h) => noise(g, w, h, '#1d2c2a', 0.1, 13), 4],
  [MAT.roofTile]: [(g, w, h) => { noise(g, w, h, '#3b3d40', 0.15, 14); grid(g, w, h, 24, 32, 'rgba(0,0,0,0.5)', 3, true); }, 1.5],
  [MAT.mark]: [(g, w, h) => { g.fillStyle = '#d4b020'; g.fillRect(0, 0, w, h); g.fillStyle = '#151515'; for (let x = -h; x < w; x += 48) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.lineTo(x + h + 24, 0); g.lineTo(x + 24, h); g.fill(); } }, 1],
};

const mats = new Map<number, THREE.MeshLambertMaterial>();

export function material(id: number): THREE.MeshLambertMaterial {
  let m = mats.get(id);
  if (m) return m;
  const [draw] = draws[id] ?? draws[MAT.concrete];
  const tex = canvasTexture(`mat${id}`, 256, 256, draw);
  m = new THREE.MeshLambertMaterial({ map: tex, transparent: id === MAT.water, opacity: id === MAT.water ? 0.82 : 1 });
  mats.set(id, m);
  return m;
}

/** Metres covered by one texture repeat. */
export const texScale = (id: number) => (draws[id] ?? draws[MAT.concrete])[1];
