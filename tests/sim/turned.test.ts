// M3-40 (U-017): turned solids. The same moves as on axis-aligned walls, with the whole scene turned 30 degrees:
// walking into a wall, hopping onto a block, vaulting, wall-running a gap and pulling up from a lip.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, aim, LMB } from './helpers';
import { solid, turn, raycast, type Solid } from '../../src/world/geom';
import { free } from '../../src/sim/physics';
import { B, type SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';

const TH = Math.PI / 6, C = Math.cos(TH), S = Math.sin(TH);
/** Scene (unturned) coordinates to the world and back. */
const out = (x: number, z: number) => [C * x - S * z, S * x + C * z];
const back = (x: number, z: number) => [C * x + S * z, -S * x + C * z];
const lz = (s: SimState) => back(s.player.pos.x, s.player.pos.z)[1];

function scene(solids: Solid[], spawn: { x: number; y: number; z: number }) {
  const [x, z] = out(spawn.x, spawn.z);
  return setup(turn(solids, TH, 0, 0), { x, y: spawn.y, z, yaw: -TH });
}

/** Walk (or sprint) along the scene's north and jump within `at` of the face at scene z = face. */
function approachAndJump(state: SimState, world: World, buttons = 0, at = 0.4, face = -3) {
  for (let i = 0; i < secs(5); i++) {
    const near = lz(state) - 0.25 - face <= at;
    run(state, world, 1, { my: 1, buttons: buttons | (near ? B.JUMP : 0), pressed: near ? B.JUMP : 0 });
    if (near) { if (state.player.mode === 'air') run(state, world, 12, { my: 1, buttons: buttons | B.JUMP }); return; }
  }
}

describe('turned solids (M3-40)', () => {
  it('rays hit a turned wall on its face, with its turned normal', () => {
    const [w] = turn([solid(-5, 0, -3.2, 5, 3, -3)], TH, 0, 0);
    const { world } = setup([w]);
    // The scene's north, (0, -1), is (S, -C) in the world; the wall's face looks back along (-S, C).
    const h = raycast(world.index, 0, 1, 0, S, 0, -C, 10)!;
    expect(h.t).toBeCloseTo(3, 3);
    expect(h.nx).toBeCloseTo(-S, 3);
    expect(h.nz).toBeCloseTo(C, 3);
    // Past the end of the turned wall, inside its world bounds, a ray goes by.
    expect(raycast(world.index, out(5.5, 0)[0], 1, out(5.5, 0)[1], S, 0, -C, 10)).toBeNull();
  });
  it('walking into a turned wall stops flush against it, never inside', () => {
    const { world, state } = scene([floor(), solid(-5, 0, -3.2, 5, 3, -3)], { x: 0, y: 0, z: 0 });
    let inside = 0;
    run(state, world, secs(3), { my: 1 }, s => { if (!free(world.index, s.player.pos.x, s.player.pos.y, s.player.pos.z, 1.7)) inside++; });
    expect(inside).toBe(0);
    expect(lz(state)).toBeLessThan(-3 + 0.45);
    expect(lz(state)).toBeGreaterThan(-3);
  });
  it('hops onto a turned 1.0 m block', () => {
    const { world, state } = scene([floor(), solid(-5, 0, -10, 5, 1.0, -3)], { x: 0, y: 0, z: 0 });
    run(state, world, 5);
    approachAndJump(state, world);
    run(state, world, secs(2), { my: 1 });
    expect(state.player.pos.y).toBeCloseTo(1.0, 2);
  });
  it('vaults a turned 1.0 m high, 0.6 m deep wall keeping going', () => {
    const { world, state } = scene([floor(), solid(-5, 0, -3.6, 5, 1.0, -3)], { x: 0, y: 0, z: 6 });
    run(state, world, 5);
    run(state, world, secs(1.2), { my: 1, buttons: B.SPRINT });
    approachAndJump(state, world, B.SPRINT, 0.5);
    let vaulted = 0;
    run(state, world, secs(1.5), { my: 1, buttons: B.SPRINT }, s => { if (s.player.mode === 'action') vaulted++; });
    expect(vaulted).toBeGreaterThan(0);
    expect(lz(state)).toBeLessThan(-3.6);
    expect(state.player.pos.y).toBeCloseTo(0, 2);
  });
  it('wall-runs a 6 m gap along a turned wall', () => {
    const { world, state } = scene([
      solid(-5, -1, 0, 5, 0, 40), solid(-5, -1, -40, 5, 0, -6), solid(-20, -12, -60, 20, -10, 60),
      solid(-1.2, -10, -40, -1.0, 4, 40),
    ], { x: -0.5, y: 0, z: 30 });
    for (let i = 0; i < secs(10) && lz(state) > 0.05; i++) run(state, world, 1, { my: 1, buttons: B.SPRINT });
    run(state, world, 1, { my: 1, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
    run(state, world, 20, { my: 1, buttons: B.SPRINT | B.JUMP });
    run(state, world, 6, { my: 1, buttons: B.SPRINT });
    run(state, world, 1, { my: 1, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
    let ran = 0;
    run(state, world, secs(2), { my: 1, buttons: B.SPRINT }, s => { if (s.player.mode === 'wallrun') ran++; });
    expect(ran / 60).toBeGreaterThan(0.6);
    expect(state.player.pos.y).toBeCloseTo(0, 2);
    expect(lz(state)).toBeLessThan(-6);
  });
  it('grabs the lip of a turned 2.0 m wall and pulls up onto it', () => {
    const { world, state } = scene([floor(), solid(-2, 0, -30, 2, 2.0, -3)], { x: 0, y: 0, z: -2.55 });
    run(state, world, 3);
    const [tx, tz] = out(0, -3);
    for (let i = 0; i < 40 && state.player.mode !== 'grip'; i++) { aim(state, tx, 1.9, tz); run(state, world, 1, { buttons: LMB }); }
    expect(state.player.mode).toBe('grip');
    run(state, world, secs(3), { buttons: LMB, my: 1 });
    expect(state.player.pos.y).toBeCloseTo(2.0, 2);
  });
  it('stands on a turned ramp at the height of its slope', () => {
    const [r] = turn([{ ...solid(-2, 0, -10, 2, 2, 0), ramp: 4, low: 0 }], TH, 0, 0);
    const { world, state } = setup([floor(), r], { x: out(0, -5)[0], y: 3, z: out(0, -5)[1], yaw: -TH });
    run(state, world, secs(1));
    expect(state.player.pos.y).toBeGreaterThan(0.85);
    expect(state.player.pos.y).toBeLessThan(1.4);
  });
});
