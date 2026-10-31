// The light map (M3-16, DESIGN section 3): how lit a place is, 0..1, for the machines' eyes. Ambient by the hour
// (day 1.0, dusk about half, night 0.12), less under a roof, next to none underground but in a lit hall; plus the
// strongest light near: lampposts 0.6 within 8 m, neon and LED signs 0.35 within 5 m, lamps 0.5 within 6 m,
// floodlights 1.0 over the ground they're aimed at, his own headlamp. The lights are world data, gathered once from
// the props and the lamp and neon decor.
import { MAT } from '../world/mats';
import { heightAt } from '../world/heightfield';
import { raycast, type Box } from '../world/geom';
import type { World, Light } from '../world/world';
import { daylight } from './clock';

export const AMBIENT = { night: 0.12, indoors: 0.06, under: 0.02, hall: 0.5 };
const SIGNS = new Set(['neonblade', 'neonsign', 'ledscreen', 'ledboard']);
const CELL = 16;
const grids = new WeakMap<World, Map<number, Light[]>>();
const key = (i: number, j: number) => i * 65536 + j;
const point = (x: number, y: number, z: number): Box => ({ x0: x, y0: y, z0: z, x1: x, y1: y, z1: z });

/** Every light in the world, gathered on first use. */
export function lightsOf(w: World): Light[] {
  if (w.lights) return w.lights;
  const out: Light[] = [];
  for (const p of w.props) {
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    // (A lamppost's lamp is 7 m up: lit under it down its height and a few metres further, the street sloping.)
    if (p.kind === 'lamppost') out.push({ kind: 'post', box: { x0: p.x, y0: p.y - 4, z0: p.z, x1: p.x, y1: p.y + 7, z1: p.z }, r: 8, v: 0.6 });
    else if (SIGNS.has(p.kind)) out.push({ kind: 'neon', box: point(p.x + fx * 0.6, p.y + (p.h ?? 1) / 2, p.z + fz * 0.6), r: 5 + (p.w ?? 0) / 2, v: 0.35 });
    // (A gate's floodlight, 11 m up its mast, lights the apron 8 m out in front.)
    else if (p.kind === 'floodlight') out.push({ kind: 'flood', box: point(p.x + fx * 8, p.y - 10, p.z + fz * 8), r: 10, v: 1 });
    else if (p.kind === 'lamp') out.push({ kind: 'lamp', box: point(p.x, p.y + 0.5, p.z), r: 5, v: 0.5 });
  }
  for (const s of w.decor) {
    if (s.mat === MAT.lamp) out.push({ kind: 'lamp', box: s, r: 6, v: 0.5 });
    else if (s.mat === MAT.neon) out.push({ kind: 'neon', box: s, r: 5, v: 0.35 });
  }
  return (w.lights = out);
}

function grid(w: World) {
  let g = grids.get(w);
  if (g) return g;
  g = new Map();
  for (const l of lightsOf(w)) {
    for (let i = Math.floor((l.box.x0 - l.r) / CELL); i <= Math.floor((l.box.x1 + l.r) / CELL); i++)
      for (let j = Math.floor((l.box.z0 - l.r) / CELL); j <= Math.floor((l.box.z1 + l.r) / CELL); j++) {
        const k = key(i, j), c = g.get(k);
        if (c) c.push(l); else g.set(k, [l]);
      }
  }
  grids.set(w, g);
  return g;
}

/** The strongest light on a point from the lights near it: full within half its reach, falling to none at it. */
export function localLight(w: World, x: number, y: number, z: number): number {
  let best = 0;
  for (const l of grid(w).get(key(Math.floor(x / CELL), Math.floor(z / CELL))) ?? []) {
    const b = l.box, dx = Math.max(b.x0 - x, 0, x - b.x1), dy = Math.max(b.y0 - y, 0, y - b.y1), dz = Math.max(b.z0 - z, 0, z - b.z1);
    const d = Math.hypot(dx, dy, dz);
    if (d < l.r) best = Math.max(best, l.v * Math.min(1, 2 * (1 - d / l.r)));
  }
  return best;
}

/** The light there is without lamps: the sky's by the hour, half of it at best under a roof, next to none
 *  underground (a lit hall's own lights aside). */
export function ambientAt(w: World, x: number, y: number, z: number, time: number): number {
  const day = daylight(time), zone = w.zones.find(q => q.kind === 'under' && x >= q.box.x0 && x <= q.box.x1 && y >= q.box.y0 && y <= q.box.y1 && z >= q.box.z0 && z <= q.box.z1);
  if (zone) return zone.lit ? AMBIENT.hall : AMBIENT.under;
  // Under a roof: something a metre across or more straight overhead (a cable or a beam isn't a roof).
  const up = raycast(w.index, x, y + 1, z, 0, 1, 0, 40), over = up ? w.solids[up.id] : null;
  const covered = !!up && (!over || Math.min(over.x1 - over.x0, over.z1 - over.z0) >= 1);
  if (covered && w.ground && y < (heightAt(w.ground, x, z) ?? -Infinity) - 2.5) return AMBIENT.under;
  return covered ? AMBIENT.indoors + (0.5 - AMBIENT.indoors) * day : AMBIENT.night + (1 - AMBIENT.night) * day;
}

/** How lit a point is (its foot), 0..1, at game time `time`; `own` is a light he carries (his headlamp). */
export function lightAt(w: World, pos: { x: number; y: number; z: number }, time: number, own = 0): number {
  return Math.min(1, ambientAt(w, pos.x, pos.y, pos.z, time) + Math.max(own, localLight(w, pos.x, pos.y + 1, pos.z)));
}

/** His headlamp's light on him: white 1.0, red 0.4. */
export const LAMP_LIGHT = [0, 1, 0.4] as const;
