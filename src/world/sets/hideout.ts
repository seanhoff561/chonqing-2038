// The hideout: a brick-arched air-raid side tunnel (DESIGN section 9), built at an origin so the
// standalone scenario and the city share it. Local x runs east along the chamber; floor at oy.
import { solid, carve, type Solid, type Box } from '../geom';
import type { Prop, Zone, Climbable, Inter } from '../world';
import { MAT } from '../mats';

export interface HideoutParts {
  /** boxes to carve out of the surrounding rock */
  cuts: Box[];
  solids: Solid[];
  props: Prop[];
  zones: Zone[];
  climbables: Climbable[];
  inter: Inter[];
  /** named points for interactables and links */
  at: Record<string, { x: number; y: number; z: number }>;
}

/** shaftHalf: half the vent shaft's width (and its grate's). */
export const HIDEOUT = { length: 20, width: 4, height: 3, shaftX: 10, shaftTop: 9, shaftHalf: 1.2 };

/** shaftTop: the vent's height above the floor; kit: 'full' is the test scene's bed, bench, stash and power,
 *  'start' the friends' old hideout where a run begins (U-018): their mattress and their crate, no bench or
 *  power; prefix keeps the city's ids apart; side: how far the collapsed side passage runs north. */
export function hideoutParts(ox: number, oy: number, oz: number, o: { shaftTop?: number; kit?: 'full' | 'start'; prefix?: string; side?: number } = {}): HideoutParts {
  const H = { ...HIDEOUT, shaftTop: o.shaftTop ?? HIDEOUT.shaftTop }, furnished = (o.kit ?? 'full') === 'full', id = (s: string) => (o.prefix ?? '') + s;
  const sx = ox + H.shaftX, sz = oz, hs = H.shaftHalf;
  const cuts: Box[] = [
    { x0: ox, y0: oy, z0: oz - 2, x1: ox + H.length, y1: oy + H.height, z1: oz + 2 }, // chamber
    { x0: ox + H.length, y0: oy, z0: oz - 1, x1: ox + H.length + 6, y1: oy + 2.4, z1: oz + 1 }, // passage stub east
    { x0: sx - hs, y0: oy + H.height - 0.1, z0: sz - hs, x1: sx + hs, y1: oy + H.shaftTop, z1: sz + hs }, // vent shaft
    { x0: ox + 3.5, y0: oy, z0: oz - (o.side ?? 6), x1: ox + 5, y1: oy + 2.2, z1: oz - 2 }, // collapsed side passage
  ];
  const solids: Solid[] = [
    solid(ox + 1.2, oy, oz + 0.7, ox + 3.2, oy + 0.22, oz + 1.9, MAT.hidden), // mattress on pallets
    ...(furnished ? [solid(ox + 8, oy, oz + 1.25, ox + 10.4, oy + 0.9, oz + 2, MAT.hidden)] : []), // workbench
    solid(ox + 12.5, oy, oz + 1.1, ox + 13.8, oy + 0.8, oz + 2, MAT.hidden), // stash crate
    solid(ox + 3.55, oy, oz - 5.95, ox + 4.95, oy + 2.2, oz - 2.05, MAT.hidden), // rubble plug (cleared with a crowbar)
    { ...solid(sx - hs, oy + H.shaftTop - 0.08, sz - hs, sx + hs, oy + H.shaftTop, sz + hs, MAT.hidden), part: id('grate') }, // vent grate
  ];
  const grate: Inter = { id: id('grate'), kind: 'grate', x: sx, y: oy + H.shaftTop - 0.04, z: sz, r: 1.5, zh: '铁栅', en: 'Grate', data: { part: id('grate') } };
  const props: Prop[] = [
    { kind: 'arches', x: ox, y: oy, z: oz, yaw: 0, w: H.length, h: H.height, d: H.width, gap: [H.shaftX - hs - 0.05, H.shaftX + hs + 0.05] },
    { kind: 'mattress', x: ox + 2.2, y: oy + 0.22, z: oz + 1.3, yaw: 0 },
    { kind: 'crate', x: ox + 13.15, y: oy, z: oz + 1.55, yaw: 0, w: 1.3, h: 0.8, d: 0.9 },
    ...(furnished ? [
      { kind: 'workbench', x: ox + 9.2, y: oy + 0.9, z: oz + 1.62, yaw: 0 },
      { kind: 'carbattery', x: ox + 10.9, y: oy, z: oz + 1.6, yaw: 0 },
      { kind: 'inverter', x: ox + 11.4, y: oy, z: oz + 1.7, yaw: 0.3 },
      { kind: 'lamp', x: ox + 8.4, y: oy + 0.9, z: oz + 1.7, yaw: 0 },
    ] : [
      { kind: 'boxes', x: ox + 15.5, y: oy, z: oz + 1.3, yaw: 0.4 },
      { kind: 'boxes', x: ox + 6.5, y: oy, z: oz + 0.8, yaw: 1.1 },
    ]),
    { kind: 'rubble', x: ox + 4.25, y: oy, z: oz - 2.6, yaw: 0, w: 1.4, h: 2.2 },
    // The grate (its text the interactable it follows) under its heap of rubbish bags (M3-72, U-038).
    { kind: 'grate', x: sx, y: oy + H.shaftTop - 0.04, z: sz, yaw: 0, w: 2 * hs, text: id('grate') },
    { kind: 'cover', x: sx, y: oy + H.shaftTop, z: sz, yaw: 0, text: id('grate') + '-bags' },
    { kind: 'graffiti', x: ox + 15, y: oy + 1.6, z: oz - 1.98, yaw: 0, text: '老地方 · 耗子 静静 伟 · 2036' },
  ];
  return {
    cuts, solids, props,
    // An iron ladder up the shaft's south wall, its rails standing a metre over the street to climb out by.
    climbables: [{ kind: 'ladder', x: sx, z: sz - hs, y0: oy, y1: oy + H.shaftTop + 1, nx: 0, nz: 1 }],
    inter: [grate].concat(furnished ? [
      { id: id('stash'), kind: 'container', x: ox + 13.15, y: oy + 0.6, z: oz + 1.55, r: 0.6, zh: '藏匿箱', en: 'Stash', data: { type: 'stash' } },
      { id: id('mattress'), kind: 'mattress', x: ox + 2.2, y: oy + 0.25, z: oz + 1.3, r: 0.8, zh: '床垫', en: 'Sleep' },
      { id: id('bench'), kind: 'bench', x: ox + 9.2, y: oy + 0.95, z: oz + 1.62, r: 0.7, zh: '工作台', en: 'Workbench' },
    ] : [
      { id: id('stash'), kind: 'container', x: ox + 13.15, y: oy + 0.6, z: oz + 1.55, r: 0.6, zh: '他们的箱子', en: "Friends' crate", data: { type: 'crate' } },
      { id: id('mattress'), kind: 'mattress', x: ox + 2.2, y: oy + 0.25, z: oz + 1.3, r: 0.8, zh: '旧床垫', en: 'Old mattress' },
    ]),
    zones: [{ kind: 'under', box: { x0: ox - 1, y0: oy - 1, z0: oz - 8, x1: ox + H.length + 8, y1: oy + H.shaftTop - 0.5, z1: oz + 3 } }],
    at: {
      mattress: { x: ox + 2.2, y: oy + 0.22, z: oz + 1.3 },
      bench: { x: ox + 9.2, y: oy + 0.9, z: oz + 1.62 },
      stash: { x: ox + 13.15, y: oy + 0.8, z: oz + 1.55 },
      battery: { x: ox + 10.9, y: oy, z: oz + 1.6 },
      rubble: { x: ox + 4.25, y: oy + 1, z: oz - 2.2 },
      grate: { x: sx, y: oy + H.shaftTop, z: sz },
      spawn: { x: ox + 3.6, y: oy, z: oz + 0.2 },
      passage: { x: ox + H.length + 6, y: oy, z: oz },
    },
  };
}

/** Apply hideout cuts to rock and append its solids. */
export function placeHideout(rock: Solid[], h: HideoutParts): Solid[] {
  let s = rock;
  for (const c of h.cuts) s = carve(s, c);
  return s.concat(h.solids);
}
