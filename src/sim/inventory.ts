// Grid inventories: backpack, stash and containers. Items are rectangles that can rotate.
import { item, itemById } from '../data/items';
import type { SimState } from './types';

export interface Stack {
  uid: number; id: string; n: number; x: number; y: number; rot: boolean;
  /** game time it was made (food spoilage) */
  made?: number;
  /** charges or battery percent for devices */
  charge?: number;
}

export interface Grid { w: number; h: number; items: Stack[] }

export const grid = (w: number, h: number): Grid => ({ w, h, items: [] });

export function dims(s: { id: string; rot: boolean }): [number, number] {
  const d = item(s.id);
  return s.rot ? [d.h, d.w] : [d.w, d.h];
}

/** Can an item of this id sit at (x, y)? `ignore` skips one stack (the one being moved). */
export function fits(g: Grid, id: string, x: number, y: number, rot: boolean, ignore = -1): boolean {
  const [w, h] = dims({ id, rot });
  if (x < 0 || y < 0 || x + w > g.w || y + h > g.h) return false;
  for (const o of g.items) {
    if (o.uid === ignore) continue;
    const [ow, oh] = dims(o);
    if (x < o.x + ow && x + w > o.x && y < o.y + oh && y + h > o.y) return false;
  }
  return true;
}

export function findSpot(g: Grid, id: string): { x: number; y: number; rot: boolean } | null {
  for (const rot of [false, true])
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) if (fits(g, id, x, y, rot)) return { x, y, rot };
  return null;
}

export const newUid = (s: SimState) => ++s.nextUid;

/** Add n of an item, topping up existing stacks first. Returns how many didn't fit. */
export function addItem(s: SimState, g: Grid, id: string, n = 1, extra: Partial<Stack> = {}): number {
  const max = itemById.get(id)?.stack ?? 1;
  if (itemById.get(id)?.food && extra.made === undefined) extra = { ...extra, made: s.time };
  if (max > 1) for (const o of g.items) {
    if (o.id !== id || o.n >= max || n <= 0) continue;
    const k = Math.min(n, max - o.n);
    o.n += k; n -= k;
  }
  while (n > 0) {
    const spot = findSpot(g, id);
    if (!spot) return n;
    const k = Math.min(n, max);
    g.items.push({ uid: newUid(s), id, n: k, ...spot, ...extra });
    n -= k;
  }
  return 0;
}

export function takeStack(g: Grid, uid: number): Stack | null {
  const i = g.items.findIndex(o => o.uid === uid);
  return i < 0 ? null : g.items.splice(i, 1)[0];
}

/** Move a stack within or between grids. Fails (and changes nothing) if it doesn't fit. */
export function moveStack(from: Grid, to: Grid, uid: number, x: number, y: number, rot: boolean): boolean {
  const s = from.items.find(o => o.uid === uid);
  if (!s || !fits(to, s.id, x, y, rot, from === to ? uid : -1)) return false;
  if (from !== to) { takeStack(from, uid); to.items.push(s); }
  s.x = x; s.y = y; s.rot = rot;
  return true;
}

/** Remove n of an item id from a grid (largest stacks first). Returns how many were removed. */
export function consume(g: Grid, id: string, n = 1): number {
  let got = 0;
  for (const s of [...g.items].filter(o => o.id === id).sort((a, b) => b.n - a.n)) {
    const k = Math.min(n - got, s.n);
    s.n -= k; got += k;
    if (s.n <= 0) takeStack(g, s.uid);
    if (got >= n) break;
  }
  return got;
}

export const count = (g: Grid, id: string) => g.items.reduce((a, s) => a + (s.id === id ? s.n : 0), 0);
export const has = (g: Grid, id: string, n = 1) => count(g, id) >= n;
export const weight = (g: Grid) => g.items.reduce((a, s) => a + item(s.id).kg * s.n, 0);
