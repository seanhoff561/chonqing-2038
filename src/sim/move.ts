// Player movement. Each tick: look, posture, then the current mode's update.
import { B, DT, type InputFrame, type SimState } from './types';
import type { World } from '../world/world';
import type { Player, Posture } from './player';
import { movement as M } from '../data/movement';
import { free, moveHorizontal, moveVertical, groundGap } from './physics';
import { groundParkour, airParkour, stepAction, stepHang, stepWallRun, stepWallClimb } from './parkour';
import { climbableNear, attach, stepClimb } from './climb';

export const heightOf = (p: Posture) => M.height[p];

export function forward(yaw: number) { return { x: -Math.sin(yaw), z: -Math.cos(yaw) }; }

export function stepPlayer(state: SimState, world: World, input: InputFrame): void {
  const p = state.player;
  if (p.mode === 'dead') return;
  p.yaw = input.yaw;
  p.pitch = Math.max(-1.5, Math.min(1.5, input.pitch));
  if (state.flags.noclip) { noclip(p, input); return; }
  if (p.mode === 'noclip') p.mode = 'air';
  switch (p.mode) {
    case 'action': stepAction(state, world); return;
    case 'hang': stepHang(state, world, input); return;
    case 'wallrun': stepWallRun(state, world, input); return;
    case 'wallclimb': stepWallClimb(state, world, input); return;
    case 'climb': stepClimb(state, world, input); return;
  }
  if ((input.pressed & B.INTERACT) && p.posture !== 'crawl') {
    const c = climbableNear(world, p, M.climb.attachDist);
    if (c >= 0 && attach(world, p, c)) return;
  }
  updatePosture(p, world, input);
  groundAir(state, world, input);
}

function noclip(p: Player, input: InputFrame) {
  p.mode = 'noclip';
  const f = forward(p.yaw), sp = input.buttons & B.SPRINT ? 40 : 12;
  const up = (input.buttons & B.JUMP ? 1 : 0) - (input.buttons & B.CROUCH ? 1 : 0);
  p.pos.x += (f.x * input.my + -f.z * input.mx) * sp * DT;
  p.pos.z += (f.z * input.my + f.x * input.mx) * sp * DT;
  p.pos.y += up * sp * DT;
  p.vel.x = p.vel.y = p.vel.z = 0;
  p.fallFrom = p.pos.y;
}

/** Change posture toward the request; getting up needs headroom. */
export function setPosture(p: Player, world: World, want: Posture): boolean {
  if (want === p.posture) return true;
  if (heightOf(want) > heightOf(p.posture) && !free(world.index, p.pos.x, p.pos.y + 1e-3, p.pos.z, heightOf(want))) return false;
  p.posture = want;
  return true;
}

function updatePosture(p: Player, world: World, input: InputFrame) {
  if (p.mode !== 'ground' && p.mode !== 'air') return;
  if (input.pressed & B.CRAWL) setPosture(p, world, p.posture === 'crawl' ? 'crouch' : 'crawl');
  if ((input.pressed & B.CROUCH) && p.mode === 'ground') {
    if (p.posture === 'stand' && Math.hypot(p.vel.x, p.vel.z) >= M.slide.minSpeed) { p.slide = 0; p.posture = 'crawl'; return; }
    if (p.slide >= 0) return;
    if (p.posture === 'stand') setPosture(p, world, 'crouch');
    else if (!setPosture(p, world, 'stand')) setPosture(p, world, 'crouch');
  }
  // Sprinting from a crouch stands him up when there's room.
  if ((input.buttons & B.SPRINT) && input.my > 0 && p.posture === 'crouch' && p.slide < 0) setPosture(p, world, 'stand');
}

function targetSpeed(p: Player, input: InputFrame): number {
  if (p.posture === 'crawl') return M.speed.crawl;
  if (p.posture === 'crouch') return M.speed.crouch;
  if ((input.buttons & B.SPRINT) && input.my > 0) return M.speed.sprint;
  return M.speed.jog;
}

function groundAir(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  const idx = world.index;
  const h = heightOf(p.posture);
  // Wish velocity on the ground plane.
  const f = forward(p.yaw);
  let wx = f.x * input.my - f.z * input.mx, wz = f.z * input.my + f.x * input.mx;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) { wx /= wl; wz /= wl; }
  let sp = targetSpeed(p, input);
  if (p.slide >= 0) {
    // A slide keeps its heading and bleeds speed; it ends crouched (or crawling under something low).
    const v = Math.hypot(p.vel.x, p.vel.z) || 1;
    sp = M.slide.start + (M.slide.end - M.slide.start) * Math.min(1, p.slide / M.slide.time);
    wx = p.vel.x / v; wz = p.vel.z / v;
    p.slide += DT;
    if (p.slide >= M.slide.time || v < 0.5) {
      p.slide = -1;
      if (!setPosture(p, world, 'crouch')) p.posture = 'crawl';
    }
  }
  const accel = (p.onGround ? (p.slide >= 0 ? 1000 : M.groundAccel) : M.airAccel) * DT;
  const dvx = wx * sp - p.vel.x, dvz = wz * sp - p.vel.z;
  const dl = Math.hypot(dvx, dvz);
  if (p.onGround || wl > 0.01) {
    const k = dl > accel ? accel / dl : 1;
    p.vel.x += dvx * k; p.vel.z += dvz * k;
  }
  // Jump.
  let jumped = false;
  if (p.onGround && (input.pressed & B.JUMP) && groundParkour(state, world, input, M.mantle.max)) return;
  if ((p.onGround || p.coyote > 0) && (input.pressed & B.JUMP) && p.posture === 'stand') {
    p.vel.y = M.jumpSpeed;
    p.onGround = false;
    p.coyote = 0;
    jumped = true;
  }
  if (!p.onGround) p.vel.y = Math.max(-M.maxFall, p.vel.y - M.gravity * DT);
  const wasGround = p.onGround;
  const blocked = moveHorizontal(idx, p.pos, h, p.vel.x * DT, p.vel.z * DT, p.onGround ? M.stepHeight : 0.05);
  if (blocked & 1) p.vel.x = 0;
  if (blocked & 2) p.vel.z = 0;
  const vy = p.onGround ? -0.05 : p.vel.y * DT;
  const hit = moveVertical(idx, p.pos, h, vy);
  if (hit === 1) {
    if (!wasGround) land(state);
    p.onGround = true;
    p.vel.y = 0;
  } else {
    if (hit === -1 && p.vel.y > 0) p.vel.y = 0;
    p.onGround = false;
    // Stick to stairs and ramps going down.
    if (wasGround && !jumped) {
      const gap = groundGap(idx, p.pos, M.snapDown);
      if (gap !== Infinity) { p.pos.y -= gap; p.onGround = true; p.vel.y = 0; }
    }
  }
  if (p.onGround) { p.fallFrom = p.pos.y; p.coyote = jumped ? 0 : M.coyote; }
  else {
    p.coyote = Math.max(0, p.coyote - DT);
    if (p.pos.y > p.fallFrom) p.fallFrom = p.pos.y;
  }
  p.mode = p.onGround ? 'ground' : 'air';
  if (!p.onGround) {
    if (p.wall.t < 0) p.wall.t = Math.min(0, p.wall.t + DT);
    else if (!airParkour(state, world, input) && input.my > 0) {
      // Jumping into a pipe or ladder grabs it.
      const c = climbableNear(world, p, 0.45);
      if (c >= 0) attach(world, p, c);
    }
  }
}

function land(state: SimState) {
  state.player.fallFrom = state.player.pos.y;
}
