// M3-41c (D-016): the Grand Tunnel on the real map: from the friends' chamber along the side tunnel and the
// Grand Tunnel to its rusted gate and up the stairway to the Shibati street; out the far stairway to the street
// below Jiaochangkou; deep enough everywhere for the ground over it; the cool room a shelter site.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { heightAt } from '../../src/world/heightfield';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { tunnelFrame } from '../../src/world/yuzhong/tunnels';
import { run, aim, settle } from './helpers';
import { B, type SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';

const w = getWorld('yuzhong'), g = w.ground!, F = tunnelFrame();
const tp = (n: string) => w.teleports.find(t => t.name === n)!;
const hide = tp("Friends' hideout (vent grate)"), floor = hide.y - 0.05, top = tp('Grand Tunnel entrance').y - 0.05, inRun = (top - floor) / Math.tan(0.61);

function walk(s: SimState, world: World, pts: [number, number][]): boolean {
  for (const [x, z] of pts) {
    let ok = false;
    for (let i = 0; i < 60 * 90 && !ok; i++) {
      const p = s.player, dx = x - p.pos.x, dz = z - p.pos.z;
      if (Math.hypot(dx, dz) < 0.5) ok = true;
      else run(s, world, 1, { my: 1, yaw: Math.atan2(-dx, -dz) });
    }
    if (!ok) return false;
  }
  return true;
}
const uv = (...p: [number, number][]) => p.map(([u, v]) => F.W(u, v));
// The chamber in the frame, from where a run starts in it (hideoutParts' spawn, 3.6 m along and 0.2 m across).
const c = Math.cos(F.yaw), sn = Math.sin(F.yaw), dx = hide.x - F.px, dz = hide.z - F.pz, CU = c * dx + sn * dz - 3.6, CV = -sn * dx + c * dz - 0.2, SU = CU + 26;

describe('the Grand Tunnel under Shibati (M3-41c)', () => {
  it('walks from the chamber to the rusted gate, opens it and climbs the stairway to the Shibati street', async () => {
    await settle();
    const s = createState(1, w);
    teleport(s.player, hide.x, hide.y, hide.z);
    run(s, w, 10);
    expect(walk(s, w, uv([CU + 21, CV], [SU, CV], [SU, 0], [inRun + 0.6, 0]))).toBe(true);
    expect(walk(s, w, uv([inRun - 1.5, 0]))).toBe(false);
    const gate = w.inter.find(i => i.id === 'shibati-gate')!;
    aim(s, gate.x, gate.y, gate.z);
    run(s, w, 1, { pressed: B.INTERACT });
    expect(s.wstate.open['shibati-gate']).toBe(true);
    expect(walk(s, w, uv([inRun - 2, 0], [-1.5, 0]))).toBe(true);
    expect(s.player.pos.y).toBeCloseTo(top, 0);
  });
  it('walks from the chamber along the Grand Tunnel and up the far stairway to the street', async () => {
    await settle();
    const s = createState(1, w);
    teleport(s.player, hide.x, hide.y, hide.z);
    run(s, w, 10);
    const exit = tp('Grand Tunnel exit');
    expect(walk(s, w, [...uv([CU + 21, CV], [SU, CV], [SU, 0], [203.5, 0], [203.5, -4]), [exit.x, exit.z]])).toBe(true);
    expect(s.player.pos.y).toBeCloseTo(exit.y - 0.05, 0);
    expect(Math.abs(s.player.pos.y - heightAt(g, ...F.W(203.5, -40))!)).toBeLessThan(6);
  });
  it('runs deep enough that the ground over it clears every bore', () => {
    for (let u = inRun + 0.5; u < 222; u += 1) for (const v of [-2, 0, 2]) {
      const y = heightAt(g, ...F.W(u, v));
      if (y !== null) expect(y - g.thick, `u ${u} v ${v}`).toBeGreaterThan(floor + 1.9);
    }
  });
  it("has the friends' chamber under a grate in an alley, and the cool room as a shelter site", () => {
    const site = w.sites.find(x => x.id === 'airraid')!;
    expect(site.bed).toBe('airraid-mattress');
    expect(w.inter.find(i => i.id === 'airraid-mattress')?.kind).toBe('mattress');
    // Flush with the alley's levelled paving round it (3 m off: the lane is 3.4 m wide since M3-72).
    const grate = w.props.find(p => p.kind === 'grate' && p.text === 'airraid-grate')!, ground = heightAt(g, grate.x + 3, grate.z)!;
    expect(grate.y - floor).toBeGreaterThan(8);
    expect(Math.abs(ground - grate.y)).toBeLessThan(0.1);
    const cool = w.sites.find(x => x.id === 'coolroom')!;
    expect(cool.containers.length).toBe(3);
    expect(w.zones.filter(z => z.kind === 'under').length).toBeGreaterThan(40);
  });
});
