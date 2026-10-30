import { createState, step } from '../../src/sim/sim';
import { emptyInput, type InputFrame, type SimState } from '../../src/sim/types';
import { makeWorld, type WorldParts, type World } from '../../src/world/world';
import { solid, type Solid } from '../../src/world/geom';
import { B } from '../../src/sim/types';

export const floor = (y = 0, size = 200): Solid => solid(-size, y - 1, -size, size, y, size);

export function setup(solids: Solid[], spawn = { x: 0, y: 0, z: 0, yaw: 0 }, extra: Partial<WorldParts> = {}) {
  const world = makeWorld({ name: 'test', solids, spawn, ...extra });
  const state = createState(1, world);
  return { world, state };
}

/** Run n ticks with an input built per tick. `pressed` bits fire only on the first tick of the run. */
export function run(state: SimState, world: World, n: number, inp: Partial<InputFrame> = {}, each?: (s: SimState, i: number) => void) {
  for (let i = 0; i < n; i++) {
    const f = { ...emptyInput(), yaw: state.player.yaw, pitch: state.player.pitch, ...inp };
    if (i > 0) f.pressed = 0;
    step(state, world, f);
    each?.(state, i);
  }
}

export const hspeed = (s: SimState) => Math.hypot(s.player.vel.x, s.player.vel.z);
export const secs = (t: number) => Math.round(t * 60);

/** Walk (or sprint) north and press jump once the body is within `at` m of the face at z = face. */
export function approachAndJump(state: SimState, world: World, buttons = 0, at = 0.4, face = -3) {
  for (let i = 0; i < secs(5); i++) {
    const near = state.player.pos.z - 0.25 - face <= at;
    run(state, world, 1, { my: 1, buttons: buttons | (near ? B.JUMP : 0), pressed: near ? B.JUMP : 0 });
    if (near) { if (state.player.mode === 'air') run(state, world, 12, { my: 1, buttons: buttons | B.JUMP }); return; }
  }
}

/** Sprint north and jump once the feet pass z. */
export function sprintJumpAt(state: SimState, world: World, z: number) {
  for (let i = 0; i < secs(10); i++) {
    const at = state.player.pos.z <= z;
    run(state, world, 1, { my: 1, buttons: B.SPRINT | (at ? B.JUMP : 0), pressed: at ? B.JUMP : 0 });
    if (at) { run(state, world, 20, { my: 1, buttons: B.SPRINT | B.JUMP }); return; }
  }
}

/** Near platform z in [0, 40], gap toward -z, far platform beyond, pit 10 m down. Sprint and jump at the edge. */
export function gapJump(gap: number, after = 1.5) {
  const { world, state } = setup([
    solid(-5, -1, 0, 5, 0, 40), solid(-5, -1, -40, 5, 0, -gap), solid(-20, -12, -60, 20, -10, 60),
  ], { x: 0, y: 0, z: 30, yaw: 0 });
  sprintJumpAt(state, world, 0.05);
  run(state, world, secs(after), { my: 1, buttons: B.SPRINT });
  return { world, state };
}

/** Point his view at a world point (sets yaw and pitch for the following ticks). */
export function aim(state: SimState, x: number, y: number, z: number) {
  const p = state.player;
  const ey = p.pos.y + ({ stand: 1.62, crouch: 0.98, crawl: 0.38, hidden: 0.55 } as const)[p.posture];
  const dx = x - p.pos.x, dy = y - ey, dz = z - p.pos.z;
  p.yaw = Math.atan2(-dx, -dz);
  p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
}

export const LMB = B.USE, RMB = B.AIM;

/** Await at the start of a long test (one that runs the sim for many seconds): it lets the test runner's last
 *  message to this worker come back first. A test that holds the worker longer than a minute while one is still
 *  out fails the run with "Timeout calling onTaskUpdate" (vitest's 60 s limit), as on the slower CI machines. */
export const settle = () => new Promise<void>(r => setTimeout(r, 250));
