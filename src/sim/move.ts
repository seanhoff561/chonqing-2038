// Player movement. Each tick: look, posture, then the current mode's update.
import { B, DT, type InputFrame, type SimState, type FallOutcome, type Vec3 } from './types';
import { rand } from './rng';
import type { World } from '../world/world';
import type { Player, Posture } from './player';
import { movement as M } from '../data/movement';
import { free, moveHorizontal, moveVertical, groundGap, surface, boxAt } from './physics';
import { groundAt, type SolidIndex } from '../world/geom';
import { groundParkour, airParkour, airWall, stepAction, stepWallRun, stepWallClimb, stepCling } from './parkour';
import { stepHands, stepGrip } from './grip';
import { startCling } from './parkour';
import { hideNear, enterHide, stepHidden } from './hide';
import { checkWater, stepSwim } from './swim';
import { limits, type Limits } from './body';

let L: Limits;
let look = { dYaw: 0, dPitch: 0 };
/** How far the mouse moved the view this tick. */
export const lookDelta = () => look;
/** This tick's body limits (injuries, needs, load). */
export const lim = () => L;

export const heightOf = (p: Posture) => M.height[p];

/** Emit a noise event at the player's feet; footsteps shrink in rain. */
export function noise(state: SimState, r: number, kind: string) {
  const p = state.player;
  if (kind === 'step') r *= 1 - (1 - M.noise.rainScale) * Math.min(1, state.flags.rain);
  state.events.push({ t: 'noise', x: p.pos.x, y: p.pos.y, z: p.pos.z, r, kind });
}

/** A movement sound cue (U-004): every action has its own fixed sound. */
export function sfx(state: SimState, id: string) {
  state.events.push({ t: 'sfx', id });
}

/** Footsteps by gait, one per stride travelled on the ground. */
function footsteps(state: SimState, dist: number) {
  const p = state.player, N = M.noise;
  const sp = Math.hypot(p.vel.x, p.vel.z);
  const gait = p.posture === 'crawl' ? 'crawl' : p.posture === 'crouch' ? 'crouch' : sp > 5 ? 'sprint' : 'jog';
  p.stepAcc += dist;
  if (p.stepAcc >= N.stride[gait]) { p.stepAcc = 0; noise(state, N[gait], 'step'); sfx(state, `step-${gait}`); }
}

export function forward(yaw: number) { return { x: -Math.sin(yaw), z: -Math.cos(yaw) }; }

export function stepPlayer(state: SimState, world: World, input: InputFrame): void {
  const p = state.player;
  if (p.mode === 'dead') return;
  L = limits(state);
  let dYaw = input.yaw - p.yaw;
  dYaw -= Math.round(dYaw / (2 * Math.PI)) * 2 * Math.PI;
  look = { dYaw, dPitch: input.pitch - p.pitch };
  p.yaw = input.yaw;
  p.pitch = Math.max(-1.5, Math.min(1.5, input.pitch));
  if (state.flags.noclip) { noclip(p, input); return; }
  if (p.mode === 'noclip') p.mode = 'air';
  p.crouchAge += DT;
  if ((input.pressed & B.CROUCH) && !p.onGround) p.crouchAge = 0;
  stepHands(state, world, input);
  switch (p.mode) {
    case 'action': stepAction(state, world); return;
    case 'grip': stepGrip(state, world, input); return;
    case 'cling': stepCling(state, world, input); return;
    case 'wallrun': stepWallRun(state, world, input); return;
    case 'wallclimb': stepWallClimb(state, world, input); return;
    case 'hidden': stepHidden(state, world, input); return;
    case 'swim': stepSwim(state, world, input); return;
  }
  if ((input.pressed & B.INTERACT) && p.onGround) {
    const h = hideNear(world, p);
    if (h >= 0 && enterHide(state, world, h)) return;
  }
  updatePosture(state, world, input);
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

/** Ctrl (or C) is hold-to-crouch (U-001); pressed at a sprint it slides, released mid-slide he gets up. Z toggles a crawl. */
function updatePosture(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  if (p.mode !== 'ground' && p.mode !== 'air') return;
  const held = (input.buttons & B.CROUCH) !== 0;
  if (input.pressed & B.CRAWL) {
    if (p.posture === 'crawl') { if (!setPosture(p, world, held ? 'crouch' : 'stand')) setPosture(p, world, 'crouch'); }
    else { p.slide = -1; setPosture(p, world, 'crawl'); }
    return;
  }
  if (p.slide >= 0) {
    if (!held) { endSlide(p, world); p.vel.x *= 0.8; p.vel.z *= 0.8; }
    return;
  }
  const v = Math.hypot(p.vel.x, p.vel.z);
  const downhill = v > 0.1 && grade(world.index, p.pos, p.vel.x / v, p.vel.z / v) >= M.slide.downhill;
  if ((input.pressed & B.CROUCH) && p.mode === 'ground' && p.posture === 'stand' && v >= (downhill ? M.slide.downhillMin : M.slide.minSpeed)) {
    p.slide = 0; p.posture = 'crawl';
    // Dropping into a slide from a sprint kicks the speed up a little.
    const k = Math.max(v, Math.min(M.slide.start, v + 2)) / v;
    p.vel.x *= k; p.vel.z *= k;
    sfx(state, 'slide');
    return;
  }
  if (p.posture === 'crawl' && !(input.pressed & B.CROUCH)) return;
  if (held) setPosture(p, world, 'crouch');
  else if (!setPosture(p, world, 'stand')) setPosture(p, world, 'crouch');
}

export function endSlide(p: Player, world: World, crouching = false) {
  p.slide = -1;
  if (!setPosture(p, world, crouching ? 'crouch' : 'stand') && !setPosture(p, world, 'crouch')) p.posture = 'crawl';
}

function targetSpeed(p: Player, input: InputFrame): number {
  let sp = M.speed.jog;
  if (p.posture === 'crawl') sp = M.speed.crawl;
  else if (p.posture === 'crouch') sp = M.speed.crouch;
  else if ((input.buttons & B.SPRINT) && input.my > 0 && L.sprint) sp = M.speed.sprint * L.sprintScale;
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
    // A slide keeps its heading: friction bleeds it on the flat, the grade feeds it downhill and eats it
    // uphill (U-020); it ends crouched (or crawling under something low) once it's down to a walk.
    const v = Math.hypot(p.vel.x, p.vel.z) || 1;
    wx = p.vel.x / v; wz = p.vel.z / v;
    const g = grade(idx, p.pos, wx, wz), c = Math.sqrt(1 - g * g);
    sp = Math.min(M.slide.max, v + (M.gravity * g - M.slide.friction * c) * DT);
    p.slide += DT;
    if (sp < M.slide.end) endSlide(p, world, (input.buttons & B.CROUCH) !== 0);
  }
  // In the air he can steer and slow but not speed up past his take-off speed (or a jog).
  if (!p.onGround) sp = Math.min(sp, Math.max(M.speed.jog, Math.hypot(p.vel.x, p.vel.z)));
  const accel = (p.onGround ? (p.slide >= 0 ? 1000 : M.groundAccel) : M.airAccel) * DT;
  const dvx = wx * sp - p.vel.x, dvz = wz * sp - p.vel.z;
  const dl = Math.hypot(dvx, dvz);
  if (p.onGround || wl > 0.01) {
    const k = dl > accel ? accel / dl : 1;
    p.vel.x += dvx * k; p.vel.z += dvz * k;
  }
  // Jump.
  let jumped = false;
  if (p.onGround && (input.pressed & B.JUMP) && groundParkour(state, world, input, Math.min(M.mantle.hop, L.maxMantle))) return;
  if ((p.onGround || p.coyote > 0) && (input.pressed & B.JUMP) && p.posture === 'stand' && L.jumpScale > 0) {
    p.vel.y = M.jumpSpeed * Math.sqrt(L.jumpScale);
    if (Math.hypot(p.vel.x, p.vel.z) > M.speed.jog) { p.vel.x *= M.jumpCarry; p.vel.z *= M.jumpCarry; }
    p.onGround = false;
    p.jumpHeld = true;
    sfx(state, 'jump');
    p.coyote = 0;
    jumped = true;
  }
  if (!p.onGround) p.vel.y = Math.max(-M.maxFall, p.vel.y - M.gravity * DT);
  // Letting go of Space early cuts a jump short (U-005).
  if (p.jumpHeld && !jumped) {
    if (!(input.buttons & B.JUMP) && p.vel.y > 0) { p.vel.y *= M.jumpCut; p.jumpHeld = false; }
    else if (p.vel.y <= 0) p.jumpHeld = false;
  }
  const into = { x: p.vel.x, z: p.vel.z };
  const wasGround = p.onGround;
  const x0 = p.pos.x, z0 = p.pos.z;
  const blocked = moveHorizontal(idx, p.pos, h, p.vel.x * DT, p.vel.z * DT, p.onGround ? M.stepHeight : 0.05);
  if (blocked & 1) p.vel.x = 0;
  if (blocked & 2) p.vel.z = 0;
  // Jumping into a wall clings for a moment (U-005).
  if (blocked && !p.onGround && !p.clung && p.posture === 'stand' && !jumped) {
    const nx = blocked & 1 ? -Math.sign(into.x) : 0, nz = blocked & 1 ? 0 : -Math.sign(into.z);
    if (Math.abs(nx ? into.x : into.z) > M.cling.minInto && startCling(state, nx, nz)) return;
  }
  const vy = p.onGround ? -0.05 : p.vel.y * DT, yBefore = p.pos.y;
  const hit = moveVertical(idx, p.pos, h, vy);
  if (hit === 1) {
    if (!slideOffSteep(p, idx, h, yBefore)) {
      if (!wasGround) land(state);
      p.onGround = true;
      p.vel.y = 0;
    }
  } else {
    if (hit === -1 && p.vel.y > 0) p.vel.y = 0;
    p.onGround = false;
    // Stick to stairs and ramps going down.
    if (wasGround && !jumped) {
      const gap = groundGap(idx, p.pos, M.snapDown);
      if (gap !== Infinity) { p.pos.y -= gap; if (!slideOffSteep(p, idx, h, yBefore)) { p.onGround = true; p.vel.y = 0; } }
    }
  }
  if (p.onGround) {
    p.fallFrom = p.pos.y; p.coyote = jumped ? 0 : M.coyote; p.kicks = 0; p.clung = false;
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
    else if (!airParkour(state, world, input) && (input.pressed & B.JUMP) && !jumped) airWall(state, world);
  }
}

/** Sine of the ground's grade under him along (dx, dz): positive going downhill. */
function grade(idx: SolidIndex, pos: Vec3, dx: number, dz: number): number {
  const a = groundAt(idx, pos.x - dx * 0.4, pos.z - dz * 0.4, pos.y + 0.5), b = groundAt(idx, pos.x + dx * 0.4, pos.z + dz * 0.4, pos.y + 0.5);
  if (!isFinite(a) || !isFinite(b)) return 0;
  return (a - b) / Math.hypot(0.8, a - b);
}

/** Feet on ground steeper than he can stand on (U-020): he's not standing, he slides off it, gathering speed
 *  downhill; half of the drop counts toward the fall he lands from. Returns whether he's sliding. */
function slideOffSteep(p: Player, idx: SolidIndex, h: number, yBefore: number): boolean {
  const s = surface(idx, boxAt(p.pos.x, p.pos.y, p.pos.z, h), p.pos.y);
  if (s.ny >= M.steep) return false;
  // Keep only the motion along the slope, then let gravity pull him down it.
  const hz = Math.sqrt(1 - s.ny * s.ny), nx = s.dx * hz, nz = s.dz * hz, into = p.vel.x * nx + p.vel.y * s.ny + p.vel.z * nz;
  if (into < 0) { p.vel.x -= into * nx; p.vel.y -= into * s.ny; p.vel.z -= into * nz; }
  p.vel.x += M.gravity * s.ny * nx * DT; p.vel.y += M.gravity * (s.ny * s.ny - 1) * DT; p.vel.z += M.gravity * s.ny * nz * DT;
  p.onGround = false;
  if (p.pos.y < yBefore) p.fallFrom -= (yBefore - p.pos.y) * 0.5;
  return true;
}

function land(state: SimState) {
  const p = state.player;
  const h = p.fallFrom - p.pos.y;
  const roll = p.crouchAge <= M.falls.rollWindow;
  const outcome = fallOutcome(h, roll, () => rand(state.rng));
  state.events.push({ t: 'land', h, roll, outcome });
  if (h > M.noise.landMinH) noise(state, M.noise.land, 'land');
  if (h > 0.4) sfx(state, roll && h > 1 ? 'roll' : h > M.noise.landMinH ? 'land-hard' : 'land');
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
