// Parkour: ledge finding, mantles, vaults, ledge hangs, wall-runs and wall climbs, and scripted actions.
import { B, DT, type InputFrame, type SimState, type Vec3 } from './types';
import type { World } from '../world/world';
import type { Player, Posture, Mode } from './player';
import { movement as M } from '../data/movement';
import { raycast } from '../world/geom';
import { free, moveHorizontal, moveVertical } from './physics';
import { forward, setPosture, spend, noise } from './move';

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
  spend(p, M.stamina.mantle);
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
  spend(p, M.stamina.mantle);
  return true;
}

/** Space on the ground: vault, mantle, wall climb or wall-run. Returns true if one started. */
export function groundParkour(state: SimState, world: World, input: InputFrame, maxMantle: number): boolean {
  const p = state.player;
  if (p.posture !== 'stand' || input.my <= 0) return false;
  const speed = Math.hypot(p.vel.x, p.vel.z);
  const l = findLedge(world, p, M.mantle.reach, maxMantle);
  if (l && l.h >= M.mantle.min) {
    if (l.h <= M.vault.maxH && speed >= M.vault.minSpeed && tryVault(world, p, l)) { noise(state, M.noise.vault, 'vault'); return true; }
    if (l.h <= maxMantle + 1e-3 && tryMantle(world, p, l, l.h < M.mantle.lowLimit ? M.mantle.lowTime : M.mantle.highTime)) { noise(state, M.noise.mantle, 'mantle'); return true; }
  }
  if (speed < M.wallRun.minSpeed || !(input.buttons & B.SPRINT) || p.exhausted) return false;
  const f = forward(p.yaw);
  const wc = wallAhead(world, p, f.x, f.z, M.wallClimb.dist, [0.5, 1.2]);
  if (wc && (!l || l.h > maxMantle)) {
    const along = -(p.vel.x * wc.nx + p.vel.z * wc.nz) / speed;
    if (along >= Math.cos((M.wallClimb.maxAngle * Math.PI) / 180)) {
      p.mode = 'wallclimb';
      p.wall = { nx: wc.nx, nz: wc.nz, t: 0, y: p.pos.y, id: -1 };
      p.vel.x = -wc.nx * 1.0; p.vel.z = -wc.nz * 1.0; p.vel.y = M.wallClimb.upSpeed;
      p.onGround = false;
      spend(p, M.stamina.wallRun);
      return true;
    }
  }
  return startWallRun(world, p);
}

function startWallRun(world: World, p: Player): boolean {
  const speed = Math.hypot(p.vel.x, p.vel.z);
  const vx = p.vel.x / speed, vz = p.vel.z / speed;
  for (const side of [1, -1]) {
    const dx = -vz * side, dz = vx * side; // right, then left of travel
    const r = raycast(world.index, p.pos.x, p.pos.y + 1.0, p.pos.z, dx, 0, dz, HW + M.wallRun.wallDist);
    if (!r || Math.abs(r.ny) > 0.3) continue;
    if (Math.abs(vx * r.nx + vz * r.nz) > Math.sin((M.wallRun.maxAngle * Math.PI) / 180)) continue;
    // Run along the wall's tangent in the direction of travel.
    let tx = -r.nz, tz = r.nx;
    if (tx * vx + tz * vz < 0) { tx = -tx; tz = -tz; }
    p.mode = 'wallrun';
    p.wall = { nx: r.nx, nz: r.nz, t: 0, y: p.pos.y, id: -1 };
    p.vel.x = tx * M.wallRun.speed; p.vel.z = tz * M.wallRun.speed; p.vel.y = M.wallRun.upSpeed;
    p.onGround = false;
    spend(p, M.stamina.wallRun);
    return true;
  }
  return false;
}

/** In the air: low ledges mantle (Space), reachable ones are grabbed. */
export function airParkour(state: SimState, world: World, input: InputFrame): boolean {
  const p = state.player;
  if (p.posture !== 'stand' || input.my <= 0 || p.wall.t < 0) return false;
  const l = findLedge(world, p, M.hang.wallGap, M.hang.reachHigh + 0.1);
  if (!l || !isFinite(l.h)) return false;
  if (l.h >= 0.3 && l.h < M.hang.reachLow && (input.buttons & B.JUMP)) return tryMantle(world, p, l, M.mantle.lowTime);
  if (l.h >= M.hang.reachLow && l.h <= M.hang.reachHigh) return grab(world, p, l);
  return false;
}

function grab(world: World, p: Player, l: Ledge): boolean {
  const x = l.fx + l.nx * (0.3 + HW + 0.02), z = l.fz + l.nz * (0.3 + HW + 0.02), y = l.top - M.hang.hangDrop;
  if (!free(world.index, x, y, z, M.height.stand)) return false;
  p.pos.x = x; p.pos.y = y; p.pos.z = z;
  p.vel.x = p.vel.y = p.vel.z = 0;
  p.mode = 'hang';
  p.wall = { nx: l.nx, nz: l.nz, t: 0, y: l.top, id: -1 };
  return true;
}

export function stepHang(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  const w = p.wall;
  w.t += DT;
  spend(p, M.stamina.hang * DT);
  if ((input.pressed & B.DROP) || p.stamina <= 0) { letGo(p, 0.6); return; }
  if (input.pressed & B.JUMP) {
    const l: Ledge = { top: w.y, h: 0, nx: w.nx, nz: w.nz, dist: 0, fx: p.pos.x - w.nx * (HW + 0.32), fz: p.pos.z - w.nz * (HW + 0.32) };
    const b = onTop(l, HW + 0.05);
    if (free(world.index, b.x, b.y, b.z, M.height.crouch) && free(world.index, p.pos.x, w.y + 1e-3, p.pos.z, M.height.crouch)) {
      startAction(p, 'climbup', M.hang.climbTime, b, 'ground', 'crouch', 0);
    }
    return;
  }
  if (input.mx !== 0) {
    // Shimmy along the wall's tangent; facing the wall, right is (nz, -nx).
    const s = Math.sign(input.mx) * M.hang.shimmy * DT;
    const nx = p.pos.x + w.nz * s, nz = p.pos.z - w.nx * s;
    const probe = raycast(world.index, nx - w.nx * (HW + 0.3), w.y + 0.3, nz - w.nz * (HW + 0.3), 0, -1, 0, 0.5);
    if (probe && Math.abs(0.3 - probe.t) < 0.12 && free(world.index, nx, p.pos.y, nz, M.height.stand)) { p.pos.x = nx; p.pos.z = nz; }
  }
}

/** Drop from a hang or climb, pushed slightly off the wall; no regrab for a moment. */
export function letGo(p: Player, push: number) {
  p.mode = 'air';
  p.vel.x = p.wall.nx * push; p.vel.z = p.wall.nz * push; p.vel.y = 0;
  p.wall.t = -M.hang.regrab;
  p.fallFrom = p.pos.y;
}

export function stepWallRun(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  const w = p.wall;
  w.t += DT;
  if (input.pressed & B.JUMP) {
    p.vel.x = p.vel.x * 0.6 + w.nx * M.wallRun.leapSpeed;
    p.vel.z = p.vel.z * 0.6 + w.nz * M.wallRun.leapSpeed;
    p.vel.y = M.wallRun.leapUp;
    p.mode = 'air'; p.wall.t = -0.2;
    return;
  }
  p.vel.y -= M.gravity * M.wallRun.gravityScale * DT;
  if (Math.floor(w.t / M.wallRun.stepEvery) !== Math.floor((w.t - DT) / M.wallRun.stepEvery)) noise(state, M.noise.sprint, 'step');
  const blocked = moveHorizontal(world.index, p.pos, M.height.stand, p.vel.x * DT, p.vel.z * DT, 0.05);
  const hit = moveVertical(world.index, p.pos, M.height.stand, p.vel.y * DT);
  if (hit === 1) { p.mode = 'ground'; p.onGround = true; p.vel.y = 0; return; }
  if (hit === -1) p.vel.y = Math.min(0, p.vel.y);
  const still = raycast(world.index, p.pos.x, p.pos.y + 1.0, p.pos.z, -w.nx, 0, -w.nz, HW + M.wallRun.wallDist + 0.1);
  if (blocked || w.t >= M.wallRun.maxTime || !still) { p.mode = 'air'; p.wall.t = -0.2; }
}

export function stepWallClimb(state: SimState, world: World, input: InputFrame) {
  const p = state.player;
  const w = p.wall;
  w.t += DT;
  p.vel.y -= M.gravity * DT;
  moveHorizontal(world.index, p.pos, M.height.stand, p.vel.x * DT, p.vel.z * DT, 0.05);
  if (moveVertical(world.index, p.pos, M.height.stand, p.vel.y * DT) === -1) p.vel.y = Math.min(0, p.vel.y);
  if (airParkour(state, world, { ...input, my: 1 })) return;
  if (w.t >= M.wallClimb.time) { p.mode = 'air'; p.vel.x = w.nx * 0.5; p.vel.z = w.nz * 0.5; }
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
