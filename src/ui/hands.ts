// Hand sprites (U-002): original code-drawn hands in a dithered white-outline style (no third-party art).
// Readied hands rise when something is grabbable; gripping hands sit at the grip on screen; low grip shakes them.
import * as THREE from 'three';
import type { Player } from '../sim/player';

type Pose = 'open' | 'grip' | 'relaxed';
const W = 96, H = 128;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/** Draw the silhouette of a right hand in a pose (fingertips toward the top). */
function silhouette(g: CanvasRenderingContext2D, pose: Pose) {
  g.fillStyle = '#fff';
  const cap = (x0: number, y0: number, x1: number, y1: number, r: number) => {
    g.lineCap = 'round'; g.lineWidth = r * 2; g.strokeStyle = '#fff';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  };
  // Forearm into the bottom edge.
  g.beginPath(); g.moveTo(30, H); g.lineTo(38, 82); g.lineTo(70, 80); g.lineTo(80, H); g.fill();
  if (pose === 'open') {
    g.beginPath(); g.ellipse(52, 70, 22, 20, -0.15, 0, Math.PI * 2); g.fill();
    cap(36, 60, 30, 26, 5); cap(46, 54, 44, 16, 5.5); cap(56, 54, 58, 14, 5.5); cap(65, 58, 70, 24, 5);
    cap(32, 76, 14, 56, 6); // thumb
  } else if (pose === 'grip') {
    // Seen from behind: fingers curled forward over the hold, knuckles on top.
    g.beginPath(); g.ellipse(52, 66, 24, 22, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(34 + i * 12, 42, 6.5, 9, 0, 0, Math.PI * 2); g.fill(); }
    cap(30, 72, 22, 52, 6);
  } else {
    g.beginPath(); g.ellipse(52, 78, 21, 17, 0.1, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 4; i++) cap(38 + i * 9, 70, 40 + i * 9.5, 52 + Math.abs(i - 1.5) * 3, 4.5);
    cap(33, 84, 22, 68, 5.5);
  }
}

/** Silhouette -> white fill, black outline, grey halftone shading toward the lower left, finger creases. */
function render(pose: Pose): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  silhouette(g, pose);
  const img = g.getImageData(0, 0, W, H), d = img.data;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 128;
  const out = g.createImageData(W, H), o = out.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    const i = (y * W + x) * 4;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    let v: number;
    if (edge) v = 20;
    else {
      // Light from the upper right; deeper shade low and to the left, plus a soft shadow under the outline.
      const shade = (W - x) / W * 0.6 + y / H * 0.55 - (inside(x + 2, y - 2) ? 0 : 0.4);
      const t = BAYER[y % 4][x % 4] / 16;
      v = shade > 0.95 + t * 0.2 ? 120 : shade > 0.62 + t * 0.25 ? 175 : 245;
      if (y > H - 22 && t < (y - (H - 22)) / 30) v = Math.min(v, 150); // stippled sleeve edge
    }
    o[i] = o[i + 1] = o[i + 2] = v; o[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  // Creases.
  g.fillStyle = '#222';
  if (pose === 'grip') for (let i = 0; i < 3; i++) g.fillRect(40 + i * 12, 40, 1, 10);
  if (pose === 'open') g.fillRect(44, 74, 14, 1);
  return c;
}

export class Hands {
  private els: HTMLCanvasElement[] = [];
  private sprites = new Map<Pose, HTMLCanvasElement>();
  private t = 0;

  constructor() {
    for (const p of ['open', 'grip', 'relaxed'] as Pose[]) this.sprites.set(p, render(p));
    for (let i = 0; i < 2; i++) {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      c.className = 'hand';
      c.style.cssText = `position:fixed;pointer-events:none;image-rendering:pixelated;height:30vh;width:auto;z-index:2;transform-origin:50% 0;${i === 0 ? 'transform:scaleX(-1);' : ''}display:none`;
      document.body.appendChild(c);
      this.els.push(c);
    }
  }

  private draw(i: number, pose: Pose) {
    const c = this.els[i], g = c.getContext('2d')!;
    if (c.dataset.pose === pose) return;
    c.dataset.pose = pose;
    g.clearRect(0, 0, W, H);
    g.drawImage(this.sprites.get(pose)!, 0, 0);
  }

  /** readied: a grabbable is under the reticle and in reach. */
  update(p: Player, cam: THREE.Camera, readied: boolean, dt: number, hidden = false) {
    this.t += dt;
    const vh = innerHeight, vw = innerWidth, hh = vh * 0.3, hw = (hh * W) / H;
    const shake = p.endurance < 35 ? (35 - p.endurance) / 35 * 6 : 0;
    const v = new THREE.Vector3();
    p.hands.forEach((h, i) => {
      const el = this.els[i];
      const side = i === 0 ? -1 : 1;
      let x: number, y: number, pose: Pose, show = true;
      if (h.grip) {
        v.set(h.grip.x, h.grip.y, h.grip.z).project(cam);
        x = (v.x * 0.5 + 0.5) * vw + side * hw * 0.18;
        y = (-v.y * 0.5 + 0.5) * vh - hh * 0.3;
        pose = 'grip';
        if (v.z > 1) show = false;
        x += Math.sin(this.t * 40 + i) * shake; y += Math.cos(this.t * 37 + i * 2) * shake;
      } else if (p.mode === 'cling') {
        // Palms flat on the wall in front.
        x = vw / 2 + side * vw * 0.16;
        y = vh * 0.36;
        pose = 'open';
      } else if (readied && p.mode !== 'action') {
        x = vw / 2 + side * vw * 0.2;
        y = vh * 0.62;
        pose = 'open';
      } else if (p.mode === 'grip' || p.mode === 'wallclimb' || p.mode === 'air') {
        x = vw / 2 + side * vw * 0.27;
        y = vh * 0.8;
        pose = 'relaxed';
      } else { show = false; x = y = 0; pose = 'relaxed'; }
      if (hidden) show = false;
      el.style.display = show ? 'block' : 'none';
      if (!show) return;
      this.draw(i, pose);
      el.style.left = `${Math.round(x - hw / 2)}px`;
      el.style.top = `${Math.round(Math.min(vh - hh * 0.4, y))}px`;
    });
  }
}
