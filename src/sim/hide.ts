// Curling up inside boxes, crates, dumpsters and cabinets.
import { B, type InputFrame, type SimState } from './types';
import type { World } from '../world/world';
import type { Player } from './player';
import { movement as M } from '../data/movement';
import { free } from './physics';
import { startAction } from './parkour';
import { forward } from './move';

/** Nearest hiding spot in reach that he's facing, or -1. */
export function hideNear(world: World, p: Player): number {
  const f = forward(p.yaw);
  let best = -1, bd = M.hide.reach;
  world.hides.forEach((h, i) => {
    const cx = (h.inner.x0 + h.inner.x1) / 2, cz = (h.inner.z0 + h.inner.z1) / 2;
    const dx = cx - p.pos.x, dz = cz - p.pos.z, d = Math.hypot(dx, dz);
    if (d > bd || Math.abs(h.inner.y0 - p.pos.y) > 0.8) return;
    if (d > 0.01 && (dx * f.x + dz * f.z) / d < 0.5) return;
    best = i; bd = d;
  });
  return best;
}

export const fits = (world: World, i: number) => {
  const b = world.hides[i].inner;
  return Math.min(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0) >= M.hide.minInner - 1e-6;
};

export function enterHide(state: SimState, world: World, i: number): boolean {
  const p = state.player;
  if (!fits(world, i)) {
    state.events.push({ t: 'msg', text: 'too small' });
    return false;
  }
  const b = world.hides[i].inner;
  p.hideExit = { ...p.pos };
  p.hideId = i;
  startAction(p, 'hide', M.hide.enterTime, { x: (b.x0 + b.x1) / 2, y: b.y0, z: (b.z0 + b.z1) / 2 }, 'hidden', 'hidden', 0);
  return true;
}

export function stepHidden(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  if (!(input.pressed & B.INTERACT) || !p.hideExit) return;
  const e = p.hideExit;
  if (!free(world.index, e.x, e.y, e.z, M.height.crouch)) return;
  p.hideId = -1;
  p.hideExit = null;
  startAction(p, 'unhide', M.hide.exitTime, e, 'ground', 'crouch', 0);
}
