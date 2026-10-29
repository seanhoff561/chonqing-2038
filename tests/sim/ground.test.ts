// M3-41a (D-016): heightfield ground: walking slopes, landing on it, rays with slope normals, tunnels under its
// shell, holes through it, and parkour on it beside solids.
import { describe, it, expect } from 'vitest';
import { run, secs } from './helpers';
import { solid, raycast, type Solid } from '../../src/world/geom';
import { heightfield, heightAt, GROUND_ID, type Heightfield } from '../../src/world/heightfield';
import { makeWorld } from '../../src/world/world';
import { createState } from '../../src/sim/sim';
import { free } from '../../src/sim/physics';
import { B } from '../../src/sim/types';

/** 80 m square, 2 m cells: flat at 0 south of z = 0, rising 30% toward -z (north). */
function slope(f = (_x: number, z: number) => Math.max(0, -z) * 0.3): Heightfield {
  const g = heightfield(-40, -40, 2, 41, 41, 4);
  for (let j = 0; j < 41; j++) for (let i = 0; i < 41; i++) g.y[j * 41 + i] = f(-40 + i * 2, -40 + j * 2);
  return g;
}
function scene(ground: Heightfield, spawn: { x: number; y: number; z: number }, solids: Solid[] = []) {
  const world = makeWorld({ name: 'test', solids, ground, spawn: { ...spawn, yaw: 0 } });
  return { world, state: createState(1, world) };
}

describe('heightfield ground (M3-41a)', () => {
  it('walks up a 30% slope and back down, feet on the surface', () => {
    const g = slope(), { world, state } = scene(g, { x: 0, y: 0.05, z: 20 });
    run(state, world, secs(12), { my: 1 });
    const p = state.player.pos;
    // A box on a slope rests on its uphill edge: within half its width times the grade of the surface.
    expect(p.z).toBeLessThan(-12);
    expect(Math.abs(p.y - heightAt(g, p.x, p.z)!)).toBeLessThan(0.12);
    expect(state.player.mode).toBe('ground');
    run(state, world, secs(14), { my: -1 });
    expect(state.player.pos.y).toBeLessThan(0.3);
  });
  it('lands on the ground at its height', () => {
    const g = slope(), { world, state } = scene(g, { x: 3, y: 12, z: -20 });
    run(state, world, secs(2));
    expect(Math.abs(state.player.pos.y - heightAt(g, 3, -20)!)).toBeLessThan(0.12);
  });
  it('rays hit the surface with the slope normal', () => {
    const g = slope(), { world } = scene(g, { x: 0, y: 0, z: 0 });
    const h = raycast(world.index, 0, 20, -10, 0, -1, 0, 40)!;
    expect(h.id).toBe(GROUND_ID);
    expect(20 - h.t).toBeCloseTo(3, 2);
    expect(h.nz).toBeCloseTo(0.3 / Math.hypot(1, 0.3), 2);
    // A level ray uphill meets the slope where it reaches its height.
    const f = raycast(world.index, 0, 1.5, 10, 0, 0, -1, 40)!;
    expect(10 - f.t).toBeCloseTo(-5, 1);
  });
  it('a tunnel under the shell is clear', () => {
    const g = slope(() => 10), { world, state } = scene(g, { x: 0, y: 0.05, z: 10 }, [solid(-3, -1, -30, 3, 0, 30)]);
    expect(free(world.index, 0, 0.05, 0, 1.7)).toBe(true);
    run(state, world, secs(6), { my: 1 });
    expect(state.player.pos.z).toBeLessThan(-6);
    expect(state.player.pos.y).toBeCloseTo(0, 2);
    // Looking up from the tunnel, a ray stops at the shell's underside.
    const up = raycast(world.index, 0, 1.6, 0, 0, 1, 0, 20)!;
    expect(1.6 + up.t).toBeCloseTo(6, 1);
    expect(up.ny).toBe(-1);
  });
  it('a hole lets him drop through to the tunnel', () => {
    const g = slope(() => 10);
    for (const [i, j] of [[19, 19], [20, 19], [19, 20], [20, 20]]) g.hole[j * 40 + i] = 1;
    const { world, state } = scene(g, { x: 0, y: 10.05, z: 0 }, [solid(-3, -1, -30, 3, 0, 30)]);
    run(state, world, secs(3));
    expect(state.player.pos.y).toBeCloseTo(0, 1);
  });
  it('jumps on the slope and mantles a block standing on it', () => {
    const g = slope(), top = heightAt(g, 0, -12)!;
    const { world, state } = scene(g, { x: 0, y: 0.05, z: 4 }, [solid(-3, top - 2, -16, 3, top + 1.0, -12)]);
    for (let i = 0; i < secs(10) && state.player.pos.z > -11.1; i++) run(state, world, 1, { my: 1 });
    run(state, world, 1, { my: 1, pressed: B.JUMP, buttons: B.JUMP });
    let acted = false;
    for (let i = 0; i < secs(2) && !(acted && state.player.mode === 'ground'); i++) run(state, world, 1, { my: 1, buttons: B.JUMP }, s => { if (s.player.mode === 'action') acted = true; });
    expect(acted).toBe(true);
    expect(state.player.pos.y).toBeCloseTo(top + 1.0, 1);
  });
});
