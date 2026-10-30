// Ways in and out (M3-36, U-014, U-034): doors and windows and what holds them. A door is a leaf drawn as a prop,
// its collision a hidden solid its interactable switches: open (no leaf), shut, locked or jammed (forced with E
// held, loudly), chained (bolt cutters, M5-25). A window is broken in (open), glazed (the glass broken out with E
// held, loudly) or barred.
import { MAT } from '../mats';
import { rand, type Rng } from '../../sim/rng';
import type { Solid } from '../geom';
import type { Fabric } from './buildings';

export type Lock = 'open' | 'shut' | 'locked' | 'jammed' | 'chained';
export type Glazing = 'open' | 'glass' | 'barred';

/** A lock by weights for open, shut, locked, jammed and chained. */
export function roll(r: Rng, w: [number, number, number, number, number]): Lock {
  let q = rand(r) * w.reduce((a, b) => a + b, 0);
  for (const [i, k] of (['open', 'shut', 'locked', 'jammed', 'chained'] as const).entries()) if ((q -= w[i]) < 0) return k;
  return 'shut';
}

/** A door in a doorway: `box` fills it (made hidden, its collision), the leaf hinged at `hinge` running along
 *  `dir` (a unit step) `w` wide. */
export function door(id: string, box: Solid, hinge: [number, number], dir: [number, number], w: number, lock: Lock, out: Fabric, label: [string, string] = ['门', 'Door']) {
  if (lock === 'open') return;
  box.mat = MAT.hidden; box.part = id;
  out.solids.push(box);
  out.props.push({ kind: 'door', x: hinge[0], y: box.y0, z: hinge[1], yaw: Math.atan2(-dir[1], dir[0]), w, h: box.y1 - box.y0, d: 0.05, text: id });
  out.inter.push({ id, kind: 'door', x: hinge[0] + (dir[0] * w) / 2, y: box.y0 + 1.1, z: hinge[1] + (dir[1] * w) / 2, r: 0.9, zh: label[0], en: label[1], data: lock === 'shut' ? { part: id } : { part: id, lock } });
}

/** A window opening's state: `box` fills it (made hidden): its glass to break out, or bars across it running along
 *  `dir`, centred at `c`. */
export function glaze(id: string, box: Solid, c: [number, number], dir: [number, number], w: number, state: Glazing, out: Fabric) {
  if (state === 'open') return;
  box.mat = MAT.hidden; box.part = id;
  out.solids.push(box);
  const h = box.y1 - box.y0;
  if (state === 'glass') {
    out.props.push({ kind: 'pane', x: c[0], y: box.y0, z: c[1], yaw: Math.atan2(-dir[1], dir[0]), w, h, d: 0.03, text: id });
    out.inter.push({ id, kind: 'window', x: c[0], y: box.y0 + h / 2, z: c[1], r: 0.9, zh: '窗', en: 'Window', data: { part: id } });
    return;
  }
  // Bars a hand apart, and a rail across top and bottom.
  const bar = (u: number, t: number, y0: number, y1: number) => {
    const x = c[0] + dir[0] * u, z = c[1] + dir[1] * u, hx = Math.abs(dir[0]) * t + Math.abs(dir[1]) * 0.02, hz = Math.abs(dir[1]) * t + Math.abs(dir[0]) * 0.02;
    out.decor.push({ x0: x - hx, y0, z0: z - hz, x1: x + hx, y1, z1: z + hz, mat: MAT.metal, ramp: 0, low: 0 });
  };
  for (let u = -w / 2 + 0.06; u < w / 2; u += 0.13) bar(u, 0.012, box.y0, box.y1);
  for (const y of [box.y0 + 0.05, box.y1 - 0.08]) bar(0, w / 2, y, y + 0.03);
}

/** A cover over a hole to climb through (M3-73a, M3-83, U-044): a grate's bars or a trapdoor's plate, `box` its
 *  collision (made hidden), opened with F like the start hideout's grate (sim/grate.ts): from below, bolted ones
 *  take drawing the bolts; from above a bolted one won't lift. `c` its middle, `w` its width (square). Its
 *  interactable is a 'grate' with no bags (a manhole's kind). */
export function cover(id: string, box: Solid, c: [number, number], w: number, kind: 'grate' | 'hatch', loose: boolean, out: Pick<Fabric, 'solids' | 'props' | 'inter'>, label: [string, string]) {
  box.mat = MAT.hidden; box.part = id;
  out.solids.push(box);
  out.props.push({ kind, x: c[0], y: (box.y0 + box.y1) / 2, z: c[1], yaw: 0, w, text: id });
  out.inter.push({ id, kind: 'grate', x: c[0], y: (box.y0 + box.y1) / 2, z: c[1], r: Math.max(0.8, w * 0.6), zh: label[0], en: label[1], data: { part: id, manhole: true, half: w / 2, ...(loose ? { loose: true } : {}) } });
}
