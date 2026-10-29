// Painted facades (M3-10, U-009): a 12 m square of wall, 4 bays by 4 floors of 3 m, in the look of the
// reference photo: floor bands, dark recessed openings (most glassless, some glazed, barred, caged or bricked
// up), sills, AC units, lattice screens, rain streaks under every ledge, moss and patches. The same seed draws
// a matching mask of lit windows for night.
import { MAT } from '../world/mats';
import { mulberry } from './rand';
import { noise, blotches, streaks } from './textures';

export const FACADE_M = 12, FACADE_BAY = 3;

interface Style {
  seed: number; wall: string; band: string; win: [number, number]; sill: number; tile?: boolean; brick?: boolean; lattice?: boolean;
  /** abandoned: openings show bare, pale back walls */
  open?: boolean;
  /** each floor a white balcony parapet over a dark recessed strip */
  bands?: boolean;
  /** share of bays with no window; floors between floor bands */
  blank?: number; bandEvery?: number;
}

const STYLES: Record<number, Style> = {
  [MAT.facade]: { seed: 21, wall: '#bdb6a8', band: '#cbc5b8', win: [1.4, 1.6], sill: 0.9, blank: 0.12 },
  [MAT.facadeTile]: { seed: 22, wall: '#e0b4a2', band: '#e8e2d6', win: [1.0, 1.1], sill: 1.1, tile: true, blank: 0.45, bandEvery: 2 },
  [MAT.facadeBrick]: { seed: 23, wall: '#b09b7f', band: '#a08d72', win: [0.9, 1.15], sill: 1.0, brick: true, lattice: true, blank: 0.4 },
  [MAT.facadeOpen]: { seed: 24, wall: '#87796a', band: '#958775', win: [2.2, 1.9], sill: 0.75, open: true },
  [MAT.facadeBand]: { seed: 25, wall: '#d6d4cd', band: '#ebe9e2', win: [2.4, 1.6], sill: 1.05, bands: true },
};

export const isFacade = (id: number) => id in STYLES;

type Window = { x: number; y: number; w: number; h: number; kind: number; lit: boolean };

/** Window layout for a style, shared by the colour and the night mask. */
function layout(st: Style, px: number): Window[] {
  const r = mulberry(st.seed), out: Window[] = [];
  const S = FACADE_M * px;
  for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
    const w = st.win[0] * px * (0.75 + r() * 0.5), h = st.win[1] * px * (0.9 + r() * 0.2);
    const x = (b * FACADE_BAY + FACADE_BAY / 2) * px - w / 2, y = S - (f * FACADE_BAY + st.sill) * px - h;
    const kind = r(), lit = r() < 0.2 && kind < 0.45;
    if (r() >= (st.blank ?? 0)) out.push({ x, y, w, h, kind, lit });
  }
  return out;
}

export function drawFacade(id: number, g: CanvasRenderingContext2D, S: number) {
  const st = STYLES[id], px = S / FACADE_M, r = mulberry(st.seed + 100);
  // Wall: base, large damp and bleached patches, fine speckle.
  noise(g, S, S, st.wall, 0.14, st.seed);
  blotches(g, S, S, st.seed + 1, 40, '60,55,45', 0.16, px * 0.5, px * 2.5);
  blotches(g, S, S, st.seed + 2, 25, '235,230,215', 0.1, px * 0.5, px * 2);
  if (st.brick) {
    for (let y = 0, row = 0; y < S; y += px * 0.075, row++) for (let x = (row % 2) * px * 0.13; x < S; x += px * 0.26) {
      g.fillStyle = `rgba(${r() < 0.5 ? '70,55,40' : '200,185,160'},${0.05 + r() * 0.1})`;
      g.fillRect(x, y, px * 0.25, px * 0.065);
    }
  }
  if (st.tile) {
    g.fillStyle = 'rgba(90,60,50,0.18)';
    for (let y = 0; y < S; y += px * 0.12) g.fillRect(0, y, S, 1);
    for (let x = 0; x < S; x += px * 0.24) g.fillRect(x, 0, 1, S);
  }
  // Patched render.
  for (let i = 0; i < 10; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '80,75,65' : '215,210,195'},${0.06 + r() * 0.08})`;
    g.fillRect(r() * S, r() * S, px * (0.5 + r() * 1.8), px * (0.4 + r() * 1.2));
  }
  // Floor bands: the slab edge, its shadow, moss on top, streaks below.
  for (let f = 0; f <= 4; f += st.bandEvery ?? 1) {
    const y = S - f * FACADE_BAY * px;
    g.fillStyle = st.band; g.fillRect(0, y - px * 0.28, S, px * 0.28);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, S, px * 0.06);
    g.fillStyle = 'rgba(52,62,40,0.5)';
    for (let i = 0; i < 60; i++) g.fillRect(r() * S, y - px * 0.28 - r() * 3, 2 + r() * 10, 2 + r() * 3);
    streaks(g, 0, S, y + px * 0.04, st.seed + 10 + f, 70, [px * 0.2, px * 1.6], '45,42,38', 0.22);
  }
  if (st.bands) {
    // Balcony floors: a dark recessed strip of windows behind a white parapet, the slab edge above.
    for (let f = 0; f < 4; f++) {
      const top = S - (f + 1) * FACADE_BAY * px, bot = S - f * FACADE_BAY * px;
      g.fillStyle = '#2a2b2c'; g.fillRect(0, top + px * 0.45, S, bot - top - px * 1.5);
      for (let x = 0; x < S; x += px * 1.5) { g.fillStyle = r() < 0.4 ? '#3a4044' : '#101112'; g.fillRect(x + px * 0.15, top + px * 0.6, px * 1.0, px * 1.0); g.fillStyle = st.wall; g.fillRect(x + px * 1.2, top + px * 0.45, px * 0.3, bot - top - px * 1.5); }
      g.fillStyle = '#d9d6ce'; g.fillRect(0, bot - px * 1.05, S, px * 1.05);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, bot - px * 1.05, S, px * 0.05);
      streaks(g, 0, S, bot - px * 1.0, st.seed + 40 + f, 60, [px * 0.1, px * 0.9], '70,68,62', 0.25);
    }
  }
  for (const w of st.bands ? [] : layout(st, px)) {
    const { x, y, w: ww, h } = w;
    // Recess: deep shadow at the head, a little light on the jamb.
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#1a1917'); grd.addColorStop(1, '#3a3632');
    g.fillStyle = grd; g.fillRect(x, y, ww, h);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x, y, px * 0.06, h);
    // Every painted window is visibly shut (U-014): barred, glazed, rolled down, shuttered, boarded, caged or
    // bricked up. Real openings are geometry.
    const k = w.kind;
    if (k < 0.25) {
      // Behind a security grille: the room (pale bare walls in an abandoned block), bars in front.
      if (st.open) {
        const back = g.createLinearGradient(0, y, 0, y + h);
        back.addColorStop(0, '#2a2826'); back.addColorStop(0.25, k < 0.12 ? '#c9c5bb' : '#8d8980'); back.addColorStop(1, '#4a4743');
        g.fillStyle = back; g.fillRect(x + ww * 0.12, y + h * 0.1, ww * 0.76, h * 0.9);
      }
      g.fillStyle = '#56585a';
      for (let bx = x + px * 0.05; bx < x + ww; bx += px * 0.1) g.fillRect(bx, y, Math.max(3, px * 0.045), h);
      for (const f of [0.06, 0.5, 0.94]) g.fillRect(x, y + h * f, ww, Math.max(3, px * 0.05));
      g.fillStyle = 'rgba(120,70,35,0.35)'; g.fillRect(x, y + h * 0.92, ww, px * 0.05);
    } else if (k < 0.45) {
      // Glazed: grimy glass, a frame and mullions, a smear of reflected sky, sometimes a crack.
      g.fillStyle = w.lit ? '#5a4e40' : '#5d6970'; g.fillRect(x + 3, y + 3, ww - 6, h - 6);
      g.fillStyle = 'rgba(205,215,220,0.28)'; g.beginPath(); g.moveTo(x, y + h * 0.7); g.lineTo(x + ww * 0.6, y); g.lineTo(x + ww * 0.8, y); g.lineTo(x, y + h); g.fill();
      g.strokeStyle = '#c9c4b8'; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, ww - 4, h - 4);
      g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + h); g.moveTo(x, y + h * 0.35); g.lineTo(x + ww, y + h * 0.35); g.stroke();
      if (r() < 0.4) { g.strokeStyle = 'rgba(230,235,235,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + ww * 0.3, y + h * 0.4); g.lineTo(x + ww * 0.45, y + h * 0.6); g.lineTo(x + ww * 0.4, y + h * 0.85); g.moveTo(x + ww * 0.45, y + h * 0.6); g.lineTo(x + ww * 0.7, y + h * 0.65); g.stroke(); }
    } else if (k < 0.6) {
      // A rolled-down steel shutter, slats and rust.
      g.fillStyle = '#6d6e6a'; g.fillRect(x, y, ww, h);
      for (let sy = y; sy < y + h; sy += px * 0.09) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, sy, ww, Math.max(1, px * 0.02)); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x, sy + px * 0.03, ww, 1); }
      g.fillStyle = '#4f504d'; g.fillRect(x - px * 0.05, y - px * 0.12, ww + px * 0.1, px * 0.14);
      blotches(g, x, y, Math.floor(x + y * 3), 1, '120,70,35', 0.35, px * 0.2, px * 0.6);
    } else if (k < 0.72) {
      // Wooden shutters closed over the window.
      g.fillStyle = '#5e4a36'; g.fillRect(x, y, ww, h);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + ww / 2 - 1, y, 2, h);
      for (let sy = y + px * 0.08; sy < y + h; sy += px * 0.12) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 3, sy, ww - 6, 2); }
    } else if (k < 0.82) {
      // Boarded up: dark gap, planks nailed across at odd angles.
      for (let i = 0; i < 4; i++) {
        g.save(); g.translate(x + ww / 2, y + h * (0.15 + i * 0.23)); g.rotate((r() - 0.5) * 0.25);
        g.fillStyle = ['#7a5f42', '#6b533b', '#8a6f50'][i % 3]; g.fillRect(-ww * 0.58, -px * 0.1, ww * 1.16, px * 0.2);
        g.fillStyle = '#2a2a2a'; g.fillRect(-ww * 0.5, -1, 2, 2); g.fillRect(ww * 0.48, -1, 2, 2);
        g.restore();
      }
    } else if (k < 0.9) {
      // A balcony cage bolted over the opening, laundry inside now and then.
      g.strokeStyle = 'rgba(70,72,74,0.9)'; g.lineWidth = 2;
      const cy = y - px * 0.15, ch = h + px * 0.9;
      for (let bx = x - px * 0.2; bx <= x + ww + px * 0.2; bx += px * 0.1) { g.beginPath(); g.moveTo(bx, cy); g.lineTo(bx, cy + ch); g.stroke(); }
      for (let by = cy; by <= cy + ch; by += px * 0.3) { g.beginPath(); g.moveTo(x - px * 0.2, by); g.lineTo(x + ww + px * 0.2, by); g.stroke(); }
      if (r() < 0.6) { g.fillStyle = ['#8a2a22', '#3c5a7a', '#c9b98a', '#6a6f4a'][Math.floor(r() * 4)]; g.fillRect(x + ww * 0.2, y + h * 0.2, ww * 0.25, h * 0.4); }
    } else {
      // Bricked up, the infill a different tone.
      g.fillStyle = st.wall; g.fillRect(x, y, ww, h);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y, ww, h);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
      for (let by = y; by < y + h; by += px * 0.075) { g.beginPath(); g.moveTo(x, by); g.lineTo(x + ww, by); g.stroke(); }
    }
    // Sill and the streaks it sheds.
    g.fillStyle = st.band; g.fillRect(x - px * 0.08, y + h, ww + px * 0.16, px * 0.08);
    streaks(g, x, x + ww, y + h + px * 0.08, Math.floor(x * 7 + y), 14, [px * 0.3, px * 2.2], '40,38,34', 0.3);
    // AC unit beside or under the window, rust running from it.
    if (r() < 0.3) {
      const ax = r() < 0.5 ? x + ww + px * 0.2 : x - px * 0.95, ay = y + h * 0.35;
      g.fillStyle = '#c4c2bb'; g.fillRect(ax, ay, px * 0.75, px * 0.5);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(ax + px * 0.5, ay + px * 0.25, px * 0.18, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(ax, ay + px * 0.5, px * 0.75, px * 0.06);
      streaks(g, ax, ax + px * 0.75, ay + px * 0.56, Math.floor(ax + ay), 5, [px * 0.3, px * 1.5], '110,70,40', 0.3);
    }
    if (st.lattice && r() < 0.35) {
      // Brick lattice screen: a block of small dark openings.
      const lx = x + ww + px * 0.35, ly = y;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) { g.fillStyle = '#141210'; g.fillRect(lx + i * px * 0.16, ly + j * px * 0.18, px * 0.08, px * 0.1); }
    }
  }
  blotches(g, S, S, st.seed + 3, 30, '40,50,32', 0.12, px * 0.2, px * 0.8);
}

/** The lit windows only, warm on black: the emissive map for night. */
export function drawFacadeLights(id: number, g: CanvasRenderingContext2D, S: number) {
  const st = STYLES[id], px = S / FACADE_M;
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  for (const w of layout(st, px)) {
    if (!w.lit) continue;
    const grd = g.createLinearGradient(0, w.y, 0, w.y + w.h);
    grd.addColorStop(0, '#ffcf8a'); grd.addColorStop(1, '#c98a48');
    g.fillStyle = grd; g.fillRect(w.x + 3, w.y + 3, w.w - 6, w.h - 6);
  }
}
