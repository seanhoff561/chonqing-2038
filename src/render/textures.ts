// Canvas-drawn textures. Everything visual is made in code; Chinese text uses the system CJK fonts.
import * as THREE from 'three';
import { mulberry } from './rand';

export const CJK = '"Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif';

const cache = new Map<string, THREE.Texture>();

export function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat = true): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Speckled noise over a base colour: the starting point of most surfaces. */
export function noise(g: CanvasRenderingContext2D, w: number, h: number, base: string, amount: number, seed: number) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  const r = mulberry(seed);
  for (let i = 0; i < w * h * 0.08; i++) {
    const v = (r() - 0.5) * amount;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

/** Soft round stains: weathering blotches, damp patches, sun-bleached spots. */
export function blotches(g: CanvasRenderingContext2D, w: number, h: number, seed: number, n: number, rgb: string, alpha: number, r0: number, r1: number) {
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = r0 + r() * (r1 - r0), a = alpha * (0.3 + r() * 0.7);
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${rgb},${a})`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

/** Rain streaks running down from a ledge at y between x0 and x1, fading as they go. */
export function streaks(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, seed: number, n: number, len: [number, number], rgb: string, alpha: number) {
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), l = len[0] + r() * (len[1] - len[0]), wd = 1 + r() * 5;
    const grd = g.createLinearGradient(0, y, 0, y + l);
    grd.addColorStop(0, `rgba(${rgb},${alpha * (0.4 + r() * 0.6)})`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd;
    g.fillRect(x, y, wd, l);
  }
}

/** Text on a transparent or coloured card, for labels and signs. */
export function textTexture(text: string, opts: { fg?: string; bg?: string; size?: number; pad?: number; font?: string } = {}): { tex: THREE.Texture; aspect: number } {
  const size = opts.size ?? 48, pad = opts.pad ?? 12;
  const key = `text:${text}:${opts.fg}:${opts.bg}:${size}`;
  const m = document.createElement('canvas').getContext('2d')!;
  const font = `${size}px ${opts.font ?? CJK}`;
  m.font = font;
  const w = Math.ceil(m.measureText(text).width) + pad * 2, h = size + pad * 2;
  const tex = canvasTexture(key, w, h, g => {
    if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, w, h); }
    g.font = font;
    g.textBaseline = 'middle';
    g.fillStyle = opts.fg ?? '#fff';
    g.fillText(text, pad, h / 2 + size * 0.05);
  }, false);
  return { tex, aspect: w / h };
}
