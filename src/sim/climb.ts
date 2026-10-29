// Pipes and ladders: attach, climb, step off at the top, drop or leap off.
import { B, DT, type InputFrame, type SimState } from './types';
import type { World, Climbable } from '../world/world';
import type { Player } from './player';
import { movement as M } from '../data/movement';
import { free, groundGap } from './physics';
import { startAction, letGo } from './parkour';
import { forward, spend } from './move';

const HW = M.width / 2;
const OFF = HW + 0.15;

const spot = (c: Climbable) => ({ x: c.x + c.nx * OFF, z: c.z + c.nz * OFF });

/** Nearest climbable he can take hold of from here (facing it, within reach), or -1. */
export function climbableNear(world: World, p: Player, reach: number): number {
  const f = forward(p.yaw);
  let best = -1, bd = reach;
  world.climbables.forEach((c, i) => {
    const s = spot(c);
    const d = Math.hypot(s.x - p.pos.x, s.z - p.pos.z);
    if (d > bd || p.pos.y < c.y0 - 0.6 || p.pos.y > c.y1 - 0.4) return;
    if (-(f.x * c.nx + f.z * c.nz) < 0.3) return;
    best = i; bd = d;
  });
  return best;
}

export function attach(world: World, p: Player, i: number): boolean {
  const c = world.climbables[i], s = spot(c);
  const y = Math.max(c.y0, p.pos.y);
  if (!free(world.index, s.x, y, s.z, M.height.stand)) return false;
  p.pos.x = s.x; p.pos.z = s.z; p.pos.y = y;
  p.vel.x = p.vel.y = p.vel.z = 0;
  p.mode = 'climb';
  p.posture = 'stand';
  p.wall = { nx: c.nx, nz: c.nz, t: 0, y: c.y1, id: i };
  return true;
}

export function stepClimb(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  const c = world.climbables[p.wall.id];
  p.wall.t += DT;
  if (c.kind === 'pipe') spend(p, M.stamina.hang * DT);
  if ((input.pressed & B.DROP) || p.stamina <= 0) { letGo(p, 0.4); return; }
  if (input.pressed & B.JUMP) {
    letGo(p, 3.0);
    p.vel.y = 2.0;
    return;
  }
  const up = c.kind === 'ladder' ? M.climb.ladder : M.climb.pipeUp;
  const down = c.kind === 'ladder' ? M.climb.ladder : M.climb.pipeDown;
  const v = input.my > 0 ? up * input.my : input.my < 0 ? down * input.my : 0;
  let y = p.pos.y + v * DT;
  // At the top: step off onto the ledge behind the climbable if there's room.
  const topFeet = c.y1 - 1.2;
  if (y >= topFeet) {
    y = topFeet;
    if (input.my > 0) {
      const b = { x: c.x - c.nx * (HW + 0.1), y: c.y1 + 1e-3, z: c.z - c.nz * (HW + 0.1) };
      if (free(world.index, b.x, b.y, b.z, M.height.crouch) && free(world.index, p.pos.x, c.y1 + 1e-3, p.pos.z, M.height.crouch)) {
        startAction(p, 'climbup', M.hang.climbTime * 0.8, b, 'ground', 'crouch', 0);
        return;
      }
    }
  }
  if (y < c.y0) y = c.y0;
  // Feet on the ground going down: let go.
  const gap = v < 0 ? groundGap(world.index, { x: p.pos.x, y, z: p.pos.z }, 0.05) : Infinity;
  if (gap !== Infinity) {
    p.pos.y = y - gap;
    p.mode = 'ground'; p.onGround = true; p.fallFrom = p.pos.y;
    return;
  }
  if (free(world.index, p.pos.x, y, p.pos.z, M.height.stand)) p.pos.y = y;
}
