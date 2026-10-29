// Parkour with the legs: ledge finding, hops, vaults, wall-runs, run-ups and scripted actions. Hands are in grip.ts.
import { B, DT, type InputFrame, type SimState, type Vec3 } from './types';
import type { World } from '../world/world';
import type { Player, Posture, Mode } from './player';
import { movement as M } from '../data/movement';
import { raycast } from '../world/geom';
import { free, moveHorizontal, moveVertical } from './physics';
import { forward, setPosture, noise, lim, sfx } from './move';

const HW = M.width / 2;

export interface Ledge { top: number; h: number; nx: number; nz: number; dist: number; fx: number; fz: number }

/** Nearest wall in front within `reach` of the body. Returns its normal and distance from the body's front. */
export function wallAhead(world: World, p: Player, dx: number, dz: number, reach: number, heights: number[]) {
  let best: { d: number; nx: number; nz: number } | null = null;
  for (const hh of heights) {
    const r = raycast(world.index, p.pos.x, p.pos.y + hh, p.pos.z, dx, 0, dz, HW + reach);
    if (!r || Math.abs(r.ny) > 0.3 || -(r.nx * dx + r.nz * dz) < 0.6) continue;
    if (!best || r.t < best.d) best = { d: r.t, nx: r.nx, nz: r.nz };
  }
  return best;
}

/** A ledge in front: wall within `reach`, its top found by a downward ray just past the face. */
export function findLedge(world: World, p: Player, reach: number, maxH: number): Ledge | null {
  const f = forward(p.yaw);
  const hs = [0.15, 0.45, 0.9, 1.4, 1.9, 2.3, 2.8, 3.3].filter(h => h < maxH + 0.05);
  const w = wallAhead(world, p, f.x, f.z, reach, hs);
  if (!w) return null;
  const fx = p.pos.x + f.x * w.d - w.nx * 0.3, fz = p.pos.z + f.z * w.d - w.nz * 0.3;
  const y0 = p.pos.y + maxH + 0.3;
  const down = raycast(world.index, fx, y0, fz, 0, -1, 0, maxH + 0.3);
  if (!down) return null;
  if (down.t < 1e-3 || down.ny < 0.7) return { top: Infinity, h: Infinity, nx: w.nx, nz: w.nz, dist: w.d, fx, fz };
  const top = y0 - down.t;
  return { top, h: top - p.pos.y, nx: w.nx, nz: w.nz, dist: w.d, fx, fz };
}

export function startAction(p: Player, kind: string, dur: number, b: Vec3, then: Mode, posture: Posture, speed: number) {
  p.act = { kind, t: 0, dur, a: { ...p.pos }, b, then, posture, speed };
  p.mode = 'action';
  p.vel.x = p.vel.y = p.vel.z = 0;
}

/** Landing point on top of a ledge, set back from the face. */
function onTop(l: Ledge, back: number): Vec3 {
  return { x: l.fx - l.nx * (back - 0.3), y: l.top + 1e-3, z: l.fz - l.nz * (back - 0.3) };
}

function tryMantle(world: World, p: Player, l: Ledge, dur: number): boolean {
  const b = onTop(l, HW + 0.05);
  if (!free(world.index, b.x, b.y, b.z, M.height.crouch)) return false;
  // Room to rise straight up in place first.
  if (!free(world.index, p.pos.x, Math.max(p.pos.y, l.top) + 1e-3, p.pos.z, M.height.crouch)) return false;
  startAction(p, 'mantle', dur, b, 'ground', 'crouch', 0);
  return true;
}

function tryVault(world: World, p: Player, l: Ledge): boolean {
  const f = forward(p.yaw);
  const faceX = l.fx + l.nx * 0.3, faceZ = l.fz + l.nz * 0.3;
  // Walk across the top until it drops away: that's the obstacle's depth.
  let depth = -1;
  for (let d = 0.05; d <= M.vault.maxDepth + 0.1; d += 0.05) {
    if (!raycast(world.index, faceX + f.x * d, l.top + 0.2, faceZ + f.z * d, 0, -1, 0, 0.5)) { depth = d; break; }
  }
  if (depth < 0 || depth > M.vault.maxDepth + 0.05) return false;
  const lx = faceX + f.x * (depth + HW + 0.1), lz = faceZ + f.z * (depth + HW + 0.1);
  const g = raycast(world.index, lx, l.top + 0.1, lz, 0, -1, 0, l.h + 0.6);
  if (!g || g.ny < 0.7) return false;
  const ly = l.top + 0.1 - g.t + 1e-3;
  const mx = faceX + f.x * depth / 2, mz = faceZ + f.z * depth / 2;
  if (!free(world.index, lx, ly, lz, M.height.stand) || !free(world.index, mx, l.top + 0.05, mz, M.height.crouch)) return false;
  const sp = Math.hypot(p.vel.x, p.vel.z) * M.vault.keep;
  startAction(p, 'vault', M.vault.time, { x: lx, y: ly, z: lz }, 'ground', p.posture, sp);
  return true;
}

/** Space on the ground: vault, mantle, wall climb or wall-run. Returns true if one started. */
export function groundParkour(state: SimState, world: World, input: InputFrame, maxMantle: number): boolean {
  const p = state.player;
  if (p.posture !== 'stand' || input.my <= 0) return false;
  const speed = Math.hypot(p.vel.x, p.vel.z);
  const l = findLedge(world, p, M.mantle.reach, maxMantle);
  if (l && l.h >= M.mantle.min) {
    if (l.h <= M.vault.maxH && speed >= M.vault.minSpeed && tryVault(world, p, l)) { noise(state, M.noise.vault, 'vault'); sfx(state, 'vault'); return true; }
    if (l.h <= maxMantle + 1e-3 && tryMantle(world, p, l, l.h < M.mantle.lowLimit ? M.mantle.lowTime : M.mantle.highTime)) { noise(state, M.noise.mantle, 'mantle'); sfx(state, 'hop'); return true; }
  }
  return false;
}

/** Nearest wall around the body within reach (8 directions, two heights). */
export function wallNear(world: World, p: Player, reach: number): { nx: number; nz: number; d: number } | null {
  let best: { nx: number; nz: number; d: number } | null = null;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, dx = Math.cos(a), dz = Math.sin(a);
    for (const hh of [0.5, 1.2]) {
      const r = raycast(world.index, p.pos.x, p.pos.y + hh, p.pos.z, dx, 0, dz, HW + reach);
      if (r && Math.abs(r.ny) < 0.3 && (!best || r.t < best.d)) best = { nx: r.nx, nz: r.nz, d: r.t };
    }
  }
  return best;
}

function lookFlat(p: Player, nx: number, nz: number) {
  let hx = -Math.sin(p.yaw), hz = -Math.cos(p.yaw);
  const l = Math.hypot(hx, hz);
  if (l < 1e-3) { hx = nx; hz = nz; } else { hx /= l; hz /= l; }
  return { hx, hz };
}

/** Kick off a wall toward where he looks, never into it. */
export function kickOff(state: SimState, nx: number, nz: number) {
  const p = state.player, K = M.wallKick;
  let { hx, hz } = lookFlat(p, nx, nz);
  const away = hx * nx + hz * nz;
  if (away < K.minAway) {
    hx += nx * (K.minAway - away); hz += nz * (K.minAway - away);
    const l = Math.hypot(hx, hz); hx /= l; hz /= l;
  }
  p.vel.x = hx * K.speed; p.vel.z = hz * K.speed;
  p.vel.y = K.up + Math.max(0, p.pitch) * K.pitchUp;
  p.mode = 'air';
  p.onGround = false;
  sfx(state, 'wallkick');
  noise(state, M.noise.vault, 'wallkick');
}

/**
 * The second Space in the air (U-004): looking up at a wall kicks up it; anything else kicks off in the
 * look direction, along the wall included (wall-runs were removed by U-007). Two wall moves per airtime.
 */
export function airWall(state: SimState, world: World): boolean {
  const p = state.player, K = M.wallKick;
  if (p.kicks >= K.max || !lim().wallMoves || p.posture !== 'stand') return false;
  const w = wallNear(world, p, K.reach);
  if (!w) return false;
  const { hx, hz } = lookFlat(p, w.nx, w.nz);
  const into = -(hx * w.nx + hz * w.nz);
  p.kicks++;
  if (into > 0.5 && p.pitch > K.upPitch) {
    p.mode = 'wallclimb';
    p.wall = { nx: w.nx, nz: w.nz, t: 0, y: p.pos.y, id: -1 };
    p.vel.x = -w.nx * 0.6; p.vel.z = -w.nz * 0.6; p.vel.y = K.upSpeed;
    sfx(state, 'wallkick');
    noise(state, M.noise.vault, 'wallkick');
    return true;
  }
  kickOff(state, w.nx, w.nz);
  return true;
}

/** In the air with Space held: hop onto a low ledge (lips higher up need the hands). */
export function airParkour(state: SimState, world: World, input: InputFrame): boolean {
  const p = state.player;
  if (p.posture !== 'stand' || input.my <= 0 || !(input.buttons & B.JUMP)) return false;
  const l = findLedge(world, p, 0.6, 1.1);
  if (!l || !isFinite(l.h) || l.h < 0.3 || l.h >= 1.0) return false;
  return tryMantle(world, p, l, M.mantle.lowTime);
}

export function stepWallClimb(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  const w = p.wall;
  w.t += DT;
  if ((input.pressed & B.JUMP) && airWall(state, world)) return;
  p.vel.y -= M.gravity * DT;
  moveHorizontal(world.index, p.pos, M.height.stand, p.vel.x * DT, p.vel.z * DT, 0.05);
  if (moveVertical(world.index, p.pos, M.height.stand, p.vel.y * DT) === -1) p.vel.y = Math.min(0, p.vel.y);
  if (w.t >= M.wallClimb.time) { p.mode = 'air'; p.vel.x = w.nx * 0.3; p.vel.z = w.nz * 0.3; }
}

/** Advance a scripted action: rise first, then move across (mantle, climb-up) or arc over (vault). */
export function stepAction(state: SimState, world: World) {
  const p = state.player;
  const a = p.act!;
  a.t += DT;
  const k = Math.min(1, a.t / a.dur);
  if (a.kind === 'vault') {
    p.pos.x = a.a.x + (a.b.x - a.a.x) * k;
    p.pos.z = a.a.z + (a.b.z - a.a.z) * k;
    p.pos.y = a.a.y + (a.b.y - a.a.y) * k + Math.sin(Math.PI * k) * 0.4;
  } else if (a.kind === 'mantle' || a.kind === 'climbup') {
    const ku = Math.min(1, k / 0.6), kf = Math.max(0, (k - 0.6) / 0.4);
    p.pos.y = a.a.y + (Math.max(a.b.y, a.a.y) - a.a.y) * ku;
    p.pos.x = a.a.x + (a.b.x - a.a.x) * kf;
    p.pos.z = a.a.z + (a.b.z - a.a.z) * kf;
  } else {
    p.pos.x = a.a.x + (a.b.x - a.a.x) * k;
    p.pos.y = a.a.y + (a.b.y - a.a.y) * k;
    p.pos.z = a.a.z + (a.b.z - a.a.z) * k;
  }
  if (k < 1) return;
  p.act = null;
  p.posture = a.posture;
  p.mode = a.then;
  p.onGround = a.then === 'ground';
  p.fallFrom = p.pos.y;
  if (a.speed > 0) { const f = forward(p.yaw); p.vel.x = f.x * a.speed; p.vel.z = f.z * a.speed; }
  if (p.posture === 'crouch' && a.kind !== 'unhide') setPosture(p, world, 'stand');
}

/** A short hold against a wall after jumping into it: time to choose a kick, a wall-run or a grab (U-005). */
export function startCling(state: SimState, nx: number, nz: number): boolean {
  const p = state.player;
  p.mode = 'cling';
  p.clung = true;
  p.wall = { nx, nz, t: 0, y: p.pos.y, id: -1 };
  // Keep all the speed along the wall (U-006); only the push into it stops.
  const into = p.vel.x * nx + p.vel.z * nz;
  if (into < 0) { p.vel.x -= into * nx; p.vel.z -= into * nz; }
  p.vel.y = Math.min(0, p.vel.y) * 0.2;
  p.jumpHeld = false;
  sfx(state, 'cling');
  return true;
}

export function stepCling(state: SimState, world: World, input: InputFrame) {
  const p = state.player, w = p.wall;
  w.t += DT;
  if ((input.pressed & B.JUMP) && airWall(state, world)) return;
  if ((input.pressed & B.DROP) || w.t >= M.cling.time) {
    p.mode = 'air';
    p.vel.y = -M.cling.after;
    return;
  }
  p.vel.y = -M.cling.slide;
  const blocked = moveHorizontal(world.index, p.pos, M.height.stand, p.vel.x * DT, p.vel.z * DT, 0.05);
  if (blocked & 1) p.vel.x = 0;
  if (blocked & 2) p.vel.z = 0;
  if (moveVertical(world.index, p.pos, M.height.stand, p.vel.y * DT) === 1) { p.mode = 'ground'; p.onGround = true; p.vel.y = 0; p.clung = false; return; }
  // Slid past the end of the wall.
  if (!raycast(world.index, p.pos.x, p.pos.y + 0.9, p.pos.z, -w.nx, 0, -w.nz, HW + 0.3)) p.mode = 'air';
}
