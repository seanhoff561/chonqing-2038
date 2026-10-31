// What the hive knows (M4-04 on): the places it has seen or heard him, newest last, the last 50 kept.
import type { SimState } from './types';

export function remember(s: SimState, at: { x: number; y: number; z: number }) {
  s.hive.seen.push({ x: at.x, y: at.y, z: at.z, t: s.time });
  if (s.hive.seen.length > 50) s.hive.seen.shift();
}
