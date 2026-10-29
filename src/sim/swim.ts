// Water: wading, swimming at the surface, diving, breath, climbing out onto banks.
import { B, DT, type InputFrame, type SimState } from './types';
import type { World } from '../world/world';
import type { Player } from './player';
import { movement as M } from '../data/movement';
import { moveHorizontal, moveVertical } from './physics';
import { findLedge, startAction } from './parkour';
import { forward, spend } from './move';

const FLOAT = 1.45; // feet below the surface while swimming (head just out)

/** Water surface height at the player's position, or -Infinity. */
export function surfaceAt(world: World, p: Player): number {
  for (const w of world.water)
    if (p.pos.x >= w.x0 && p.pos.x <= w.x1 && p.pos.z >= w.z0 && p.pos.z <= w.z1 && p.pos.y < w.y1 && p.pos.y + 1.0 > w.y0) return w.y1;
  return -Infinity;
}

/** Called after ground/air movement: deep enough water starts a swim. */
export function checkWater(state: SimState, world: World): boolean {
  const p = state.player;
  const s = surfaceAt(world, p);
  if (s === -Infinity) return false;
  p.wetUntil = state.tick + M.swim.wetMinutes * 1.5 * 60;
  if (s - p.pos.y < M.swim.floatDepth) return false;
  p.mode = 'swim';
  p.posture = 'stand';
  p.onGround = false;
  p.vel.y = Math.max(p.vel.y, -2);
  p.fallFrom = p.pos.y;
  return true;
}

export function stepSwim(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  const s = surfaceAt(world, p);
  if (s === -Infinity) { p.mode = 'air'; return; }
  p.wetUntil = state.tick + M.swim.wetMinutes * 1.5 * 60;
  const f = forward(p.yaw);
  // Climb out onto a bank up to 0.6 m above the surface.
  if ((input.pressed & B.JUMP) && input.my > 0) {
    const l = findLedge(world, p, M.mantle.reach, s - p.pos.y + M.swim.climbOut);
    if (l && isFinite(l.h) && l.top - s <= M.swim.climbOut + 1e-3) {
      startAction(p, 'mantle', M.mantle.highTime, { x: l.fx - l.nx * (M.width / 2 + 0.05 - 0.3), y: l.top + 1e-3, z: l.fz - l.nz * (M.width / 2 + 0.05 - 0.3) }, 'ground', 'crouch', 0);
      spend(p, M.stamina.mantle);
      return;
    }
  }
  const sprint = (input.buttons & B.SPRINT) && !p.exhausted;
  const sp = sprint ? M.swim.sprint : M.swim.speed;
  if (sprint) spend(p, M.stamina.sprint * DT);
  let wx = f.x * input.my - f.z * input.mx, wz = f.z * input.my + f.x * input.mx;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) { wx /= wl; wz /= wl; }
  p.vel.x += (wx * sp - p.vel.x) * Math.min(1, 4 * DT);
  p.vel.z += (wz * sp - p.vel.z) * Math.min(1, 4 * DT);
  const target = s - FLOAT;
  if (input.buttons & B.CROUCH) p.vel.y = -M.swim.dive;
  else if (input.buttons & B.JUMP) p.vel.y = M.swim.dive;
  else p.vel.y = Math.max(-1.5, Math.min(1.0, (target - p.pos.y) * 3));
  if (p.pos.y > target && p.vel.y > 0) p.vel.y = Math.min(p.vel.y, (target - p.pos.y) / DT);
  const blocked = moveHorizontal(world.index, p.pos, M.height.stand, p.vel.x * DT, p.vel.z * DT, 0.3);
  if (blocked & 1) p.vel.x = 0;
  if (blocked & 2) p.vel.z = 0;
  if (moveVertical(world.index, p.pos, M.height.stand, p.vel.y * DT) !== 0) p.vel.y = 0;
  p.fallFrom = p.pos.y;
  // Breath while the eyes are under.
  if (p.pos.y + M.eye.stand < s) {
    p.breath = Math.max(0, p.breath - DT);
    if (p.breath <= 0) state.events.push({ t: 'hurt', dmg: M.swim.drownDps * DT, cause: 'drown' });
  } else p.breath = Math.min(M.swim.breath, p.breath + 5 * DT);
  // Shallow enough to stand: wade out.
  if (s - p.pos.y < M.swim.floatDepth - 0.1) { p.mode = 'air'; }
}
