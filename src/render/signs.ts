// Signage in Chinese (M3-14): one atlas of real text in the CJK font stack, drawn white on clear so each sign tints
// it: shop names down blade signs and along fascias, slogans for the red banners, QR codes for the stickers. Two
// materials share it, merged per chunk like the rest of the props: lit print (cloth, paper, stickers) and glowing
// light boxes and neon tube, brighter after dark. A scrolling LED ticker has a material of its own.
import * as THREE from 'three';
import { canvasTexture, CJK } from './textures';
import { mulberry } from './rand';
import { night } from './materials';
import { Kit } from './propkit';
import type { Prop } from '../world/world';

/** Shop names, two to four characters: what Chongqing's streets sell, and what 2038's sell. */
export const NAMES = ['火锅', '小面', '茶馆', '麻将', '理发', '药房', '旅馆', '网吧', '五金', '粮油', '烟酒', '超市', '诊所', '牙科', '烧烤', '串串',
  '豆花饭', '抄手', '快餐', '维修', '手机', '电脑', '当铺', '足浴', '眼镜', '百货', '彩票', '电池', '充电站', '义体诊所', '黑市', '夜宵'];
/** Slogans and notices for the red banners, the machines' and the city's. */
export const SLOGANS = ['宵禁时间二十一点', '服从调度保持距离', '禁止聚集', '注意安全', '严禁烟火', '配合检查', '清除隐患', '人人有责', '系统维护中', '禁止通行',
  '营业中', '欢迎光临', '二十四小时', '限时特价', '旺铺招租', '拆'];
/** The LED ticker's scrolling message. */
const TICKER = '欢迎光临 ★ 营业时间 07:00—21:00 ★ 宵禁期间禁止外出 ★ 服从调度 ★ 电池回收 ★ ';

const S = 2048, V = 128, VH = 512, H = 512, HH = 128, Q = 128;
/** Where each kind sits in the atlas: vertical names in two rows of 16 (0..1024), horizontal names then slogans in
 *  rows of 4 (1024..1792), QR codes in a row of 16 (1792..1920), the LED ticker's strip the atlas's width (1920..1984). */
const vSlot = (i: number) => ({ x: (i % 16) * V, y: Math.floor(i / 16) * VH, w: V, h: VH });
const hSlot = (i: number) => ({ x: (i % 4) * H, y: 1024 + Math.floor(i / 4) * HH, w: H, h: HH });
const qSlot = (i: number) => ({ x: (i % 16) * Q, y: 1792, w: Q, h: Q });
const TY = 1920, TH = 64;

function draw(g: CanvasRenderingContext2D) {
  g.clearRect(0, 0, S, S);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  NAMES.forEach((t, i) => {
    const s = vSlot(i), n = [...t].length, c = Math.min(110, (VH - 16) / n);
    g.font = `bold ${c}px ${CJK}`;
    [...t].forEach((ch, k) => g.fillText(ch, s.x + V / 2, s.y + 8 + c * (k + 0.5) + (VH - 16 - c * n) / 2));
  });
  [...NAMES.slice(0, 8), ...SLOGANS].forEach((t, i) => {
    const s = hSlot(i), n = [...t].length, c = Math.min(100, (H - 16) / n);
    g.font = `bold ${c}px ${CJK}`;
    g.fillText(t, s.x + H / 2, s.y + HH / 2 + c * 0.05);
  });
  // QR codes: 21 modules a side, the three finder squares, the rest at random.
  for (let i = 0; i < 16; i++) {
    const s = qSlot(i), r = mulberry(i * 101 + 7), m = (Q - 16) / 21;
    for (let a = 0; a < 21; a++) for (let b = 0; b < 21; b++) {
      const f = (x: number, y: number) => a >= x && a < x + 7 && b >= y && b < y + 7, ring = (x: number, y: number) => f(x, y) && !(a > x && a < x + 6 && b > y && b < y + 6 && !(a > x + 1 && a < x + 5 && b > y + 1 && b < y + 5));
      const on = f(0, 0) || f(14, 0) || f(0, 14) ? ring(0, 0) || ring(14, 0) || ring(0, 14) : r() < 0.5;
      if (on) g.fillRect(s.x + 8 + a * m, s.y + 8 + b * m, Math.ceil(m), Math.ceil(m));
    }
  }
  // The ticker's message, squeezed a little so a whole number of them fills the strip and it scrolls round without
  // a seam (the atlas repeats across).
  g.textAlign = 'left'; g.font = `bold 44px ${CJK}`;
  const L = g.measureText(TICKER).width, n = Math.max(1, Math.round(S / L));
  g.setTransform(S / (n * L), 0, 0, 1, 0, 0);
  for (let k = 0; k < n; k++) g.fillText(TICKER, k * L, TY + TH / 2 + 2);
  g.setTransform(1, 0, 0, 1, 0, 0);
}

let atlas: THREE.Texture | null = null;
const tex = () => {
  if (atlas) return atlas;
  atlas = canvasTexture('signs', S, S, draw, false);
  atlas.wrapS = THREE.RepeatWrapping;
  return atlas;
};

let signMat: THREE.MeshPhongMaterial | null = null;
const scroll = { value: 0 };
/** Every sign's characters, one material: print (cloth, light-box faces, stickers) lit like anything else, and
 *  where a vertex's glow is 1 (neon, lit plaques) glowing in its tint too, by day a little, after dark full; at 2
 *  (the LED ticker) scrolling along the atlas too. */
export function signs() {
  if (signMat) return signMat;
  const m = new THREE.MeshPhongMaterial({ map: tex(), emissive: 0xffffff, emissiveMap: tex(), emissiveIntensity: 0.4, vertexColors: true, alphaTest: 0.4, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => {
    sh.uniforms.scroll = scroll;
    sh.vertexShader = 'attribute float glow;\nuniform float scroll;\nvarying float vGlow;\n' + sh.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\nvGlow = min(glow, 1.0);\nvMapUv.x += step(1.5, glow) * scroll;\nvEmissiveMapUv.x += step(1.5, glow) * scroll;');
    sh.fragmentShader = 'varying float vGlow;\n' + sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor.rgb * vGlow;');
  };
  m.customProgramCacheKey = () => 'signs';
  return (signMat = m);
}
/** Every frame: the glyphs' glow by the hour, the ticker on. */
export function tickSigns(t: number) {
  if (signMat) signMat.emissiveIntensity = 0.4 + 1.1 * night.k;
  scroll.value = (t * 0.04) % 1;
}

export type Slot = { x: number; y: number; w: number; h: number };
export const slot = { name: (i: number) => vSlot(i % NAMES.length), line: (i: number) => hSlot(i % (8 + SLOGANS.length)), slogan: (i: number) => hSlot(8 + (i % SLOGANS.length)), qr: (i: number) => qSlot(i % 16), ticker: (x: number, w: number) => ({ x, y: TY, w, h: TH }) };

/** A quad w x h standing on (x, y, z), facing along +x, -x, +z or -z, its texture an atlas slot (vertical text reads
 *  down), tinted, glowing or not (2, the ticker's, scrolling). */
export function quad(s: Slot, w: number, h: number, x: number, y: number, z: number, facing: 'x' | '-x' | 'z' | '-z', tint: number, glow: 0 | 1 | 2 = 0): THREE.BufferGeometry {
  const u0 = s.x / S, u1 = (s.x + s.w) / S, v0 = 1 - (s.y + s.h) / S, v1 = 1 - s.y / S, c = new THREE.Color(tint);
  // Corners left-bottom, right-bottom, right-top, left-top as seen from the facing side (its right: -z seen from +x,
  // +x seen from +z).
  const [ax, az] = facing === 'x' ? [0, -1] : facing === '-x' ? [0, 1] : facing === 'z' ? [1, 0] : [-1, 0], n = facing === 'x' ? [1, 0, 0] : facing === '-x' ? [-1, 0, 0] : facing === 'z' ? [0, 0, 1] : [0, 0, -1];
  const p = (a: number, b: number) => [x + ax * a * w / 2, y + b * h, z + az * a * w / 2];
  const pts = [p(-1, 0), p(1, 0), p(1, 1), p(-1, 0), p(1, 1), p(-1, 1)], uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v0], [u1, v1], [u0, v1]];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pts.flatMap(() => n), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs.flat(), 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(pts.flatMap(() => [c.r, c.g, c.b]), 3));
  g.setAttribute('glow', new THREE.Float32BufferAttribute(pts.map(() => glow), 1));
  return g;
}

type Part = { geo: THREE.BufferGeometry; mat: THREE.Material };
const seedOf = (p: Prop) => (Math.round(p.x * 13) * 73856093) ^ (Math.round(p.z * 7) * 19349663) ^ Math.round(p.y * 5);

/** The sign props, flat on a wall (+z out of it, their foot at the prop), their frames and cloth in the library's
 *  material. */
export const SIGN_PROPS: Record<string, (p: Prop, frame: THREE.Material) => Part[]> = {
  // A QR sticker: a code on white under a coloured band (the pay apps' green and blue, the machines' red).
  qr: (p, frame) => {
    const k = new Kit(seedOf(p)).use('paint'), i = +(p.text ?? 0);
    k.box(0.3, 0.38, 0.004, 0xf2f2ee, 0, 0, -0.04).box(0.3, 0.07, 0.005, [0x1aad19, 0x1677ff, 0xc81414][i % 3], 0, 0.31, -0.04);
    return [{ geo: k.geometry(), mat: frame }, { geo: quad(slot.qr(i), 0.26, 0.26, 0, 0.03, -0.0375, 'z', 0x101010), mat: signs() }];
  },
  // A red cloth banner w long, tied at its corners, a slogan along it in yellow.
  redbanner: (p, frame) => {
    const k = new Kit(seedOf(p)).use('fabric'), w = p.w ?? 3.5, h = 0.8, i = +(p.text ?? 0);
    k.box(w, h, 0.01, 0xc4161c, 0, 0, -0.02);
    for (const x of [-w / 2, w / 2]) for (const y of [0.04, h - 0.04]) k.box(0.12, 0.02, 0.02, 0x2a2a2a, x, y, -0.03);
    const tw = Math.min(w - 0.3, (h - 0.16) * 4);
    return [{ geo: k.geometry(), mat: frame }, { geo: quad(slot.slogan(i), tw, h - 0.16, 0, 0.08, -0.0145, 'z', 0xffe070), mat: signs() }];
  },
  // An LED ticker w long over a shop door: a black box, its dots running amber.
  ledboard: (p, frame) => {
    const k = new Kit(seedOf(p)).use('metal'), w = p.w ?? 3, h = 0.4, r = k.r;
    k.box(w + 0.1, h + 0.1, 0.12, 0x101012, 0, 0, -0.04);
    // The strip runs at its own aspect along the board, each board somewhere else in the message, amber.
    return [{ geo: k.geometry(), mat: frame }, { geo: quad(slot.ticker(r() * S, (w / h) * TH), w, h, 0, 0.05, 0.081, 'z', 0xffb030, 2), mat: signs() }];
  },
};
