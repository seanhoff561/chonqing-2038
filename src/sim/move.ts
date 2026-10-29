// Player movement. Each tick: look, posture, then the current mode's update.
import { B, DT, type InputFrame, type SimState, type FallOutcome } from './types';
import { rand } from './rng';
import type { World } from '../world/world';
import type { Player, Posture } from './player';
import { movement as M } from '../data/movement';
import { free, moveHorizontal, moveVertical, groundGap } from './physics';
import { groundParkour, airParkour, stepAction, stepHang, stepWallRun, stepWallClimb } from './parkour';
import { climbableNear, attach, stepClimb } from './climb';
import { hideNear, enterHide, stepHidden } from './hide';
import { checkWater, stepSwim } from './swim';
import { limits, type Limits } from './body';

let L: Limits;
/** This tick's body limits (injuries, needs, load). */
export const lim = () => L;

export const heightOf = (p: Posture) => M.height[p];

/** Spend stamina; hitting 0 leaves him exhausted until it recovers to the threshold. */
export function spend(p: Player, amt: number) {
  p.stamina = Math.max(0, p.stamina - amt);
  p.staminaIdle = 0;
  if (p.stamina <= 0) p.exhausted = true;
}

function regen(p: Player) {
  const S = M.stamina;
  p.staminaIdle += DT;
  if (p.staminaIdle >= S.regenDelay) p.stamina = Math.min(S.max, p.stamina + S.regen * L.regenScale * DT);
  if (p.exhausted && p.stamina >= S.recover) p.exhausted = false;
}

/** Emit a noise event at the player's feet; footsteps shrink in rain. */
export function noise(state: SimState, r: number, kind: string) {
  const p = state.player;
  if (kind === 'step') r *= 1 - (1 - M.noise.rainScale) * Math.min(1, state.flags.rain);
  state.events.push({ t: 'noise', x: p.pos.x, y: p.pos.y, z: p.pos.z, r, kind });
}

/** Footsteps by gait, one per stride travelled on the ground. */
function footsteps(state: SimState, dist: number) {
  const p = state.player, N = M.noise;
  const sp = Math.hypot(p.vel.x, p.vel.z);
  const gait = p.posture === 'crawl' ? 'crawl' : p.posture === 'crouch' ? 'crouch' : sp > 5 ? 'sprint' : 'jog';
  p.stepAcc += dist;
  if (p.stepAcc >= N.stride[gait]) { p.stepAcc = 0; noise(state, N[gait], 'step'); }
}

export function forward(yaw: number) { return { x: -Math.sin(yaw), z: -Math.cos(yaw) }; }

export function stepPlayer(state: SimState, world: World, input: InputFrame): void {
  const p = state.player;
  if (p.mode === 'dead') return;
  L = limits(state);
  p.yaw = input.yaw;
  p.pitch = Math.max(-1.5, Math.min(1.5, input.pitch));
  if (state.flags.noclip) { noclip(p, input); return; }
  if (p.mode === 'noclip') p.mode = 'air';
  p.crouchAge += DT;
  regen(p);
  if ((input.pressed & B.CROUCH) && !p.onGround) p.crouchAge = 0;
  switch (p.mode) {
    case 'action': stepAction(state, world); return;
    case 'hang': stepHang(state, world, input); return;
    case 'wallrun': stepWallRun(state, world, input); return;
    case 'wallclimb': stepWallClimb(state, world, input); return;
    case 'climb': stepClimb(state, world, input); return;
    case 'hidden': stepHidden(state, world, input); return;
    case 'swim': stepSwim(state, world, input); return;
  }
  if ((input.pressed & B.INTERACT) && p.onGround) {
    const h = hideNear(world, p);
    if (h >= 0 && enterHide(state, world, h)) return;
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
  let sp = M.speed.jog;
  if (p.posture === 'crawl') sp = M.speed.crawl;
  else if (p.posture === 'crouch') sp = M.speed.crouch;
  else if ((input.buttons & B.SPRINT) && input.my > 0 && !p.exhausted && L.sprint) sp = M.speed.sprint * L.sprintScale;
  return Math.min(sp, L.speedCap);
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
  if (sp > M.speed.jog && p.onGround && Math.hypot(p.vel.x, p.vel.z) > 4) spend(p, M.stamina.sprint * DT);
  const accel = (p.onGround ? (p.slide >= 0 ? 1000 : M.groundAccel) : M.airAccel) * DT;
  const dvx = wx * sp - p.vel.x, dvz = wz * sp - p.vel.z;
  const dl = Math.hypot(dvx, dvz);
  if (p.onGround || wl > 0.01) {
    const k = dl > accel ? accel / dl : 1;
    p.vel.x += dvx * k; p.vel.z += dvz * k;
  }
  // Jump.
  let jumped = false;
  if (p.onGround && (input.pressed & B.JUMP) && groundParkour(state, world, input, L.maxMantle)) return;
  if ((p.onGround || p.coyote > 0) && (input.pressed & B.JUMP) && p.posture === 'stand' && L.jumpScale > 0) {
    p.vel.y = M.jumpSpeed * Math.sqrt(L.jumpScale);
    spend(p, M.stamina.jump);
    p.onGround = false;
    p.coyote = 0;
    jumped = true;
  }
  if (!p.onGround) p.vel.y = Math.max(-M.maxFall, p.vel.y - M.gravity * DT);
  const wasGround = p.onGround;
  const x0 = p.pos.x, z0 = p.pos.z;
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
  if (p.onGround) {
    p.fallFrom = p.pos.y; p.coyote = jumped ? 0 : M.coyote;
    if (p.slide >= 0) { if (p.slide < DT * 1.5) noise(state, M.noise.slide, 'slide'); }
    else footsteps(state, Math.hypot(p.pos.x - x0, p.pos.z - z0));
  }
  else {
    p.coyote = Math.max(0, p.coyote - DT);
    if (p.pos.y > p.fallFrom) p.fallFrom = p.pos.y;
  }
  p.mode = p.onGround ? 'ground' : 'air';
  if (world.water.length && checkWater(state, world)) return;
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
  const p = state.player;
  const h = p.fallFrom - p.pos.y;
  const roll = p.crouchAge <= M.falls.rollWindow;
  const outcome = fallOutcome(h, roll, () => rand(state.rng));
  state.events.push({ t: 'land', h, roll, outcome });
  if (h > M.noise.landMinH) noise(state, M.noise.land, 'land');
  if (roll && h > 1) { p.posture = 'crouch'; p.vel.x *= 0.6; p.vel.z *= 0.6; }
  p.fallFrom = p.pos.y;
}

/** DESIGN section 3: what a fall of h metres does, with or without a roll. */
export function fallOutcome(h: number, roll: boolean, rnd: () => number): FallOutcome {
  const F = M.falls;
  const o: FallOutcome = { damage: 0, sprain: false, fracture: false, arm: false, lethal: false };
  if (h > F.lethal) { o.lethal = true; o.damage = 999; return o; }
  if (roll && h <= F.rollMax) {
    if (h > F.rollSafe) { o.damage = (h - F.rollSafe) * F.dmgPerM; o.sprain = rnd() < F.sprainChance; }
    return o;
  }
  if (h <= F.safe) return o;
  if (h <= F.fractureFrom) { o.damage = (h - F.safe) * F.dmgPerM; o.sprain = rnd() < F.sprainChance; return o; }
  o.damage = (h - F.safe) * F.dmgPerMHigh;
  o.fracture = true;
  o.arm = rnd() < F.armChance;
  return o;
}
