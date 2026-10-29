import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { GATE } from '../../src/data/tunnels';
import { AIRRAID } from '../../src/world/city/tunnels';
import { run, aim } from './helpers';
import { B, type SimState } from '../../src/sim/types';
import type { World } from '../../src/world/world';

const w = getWorld('city');
/** The hideout's place on the side tunnel (its chamber arrives in M3-09). */
const HIDEOUT = { x: 465.6, y: 32.05, z: 420 };

function walk(s: SimState, world: World, pts: [number, number][]): boolean {
  for (const [x, z] of pts) {
    let ok = false;
    for (let i = 0; i < 60 * 60 && !ok; i++) {
      const p = s.player, dx = x - p.pos.x, dz = z - p.pos.z;
      if (Math.hypot(dx, dz) < 0.4) ok = true;
      else run(s, world, 1, { my: 1, yaw: Math.atan2(-dx, -dz) });
    }
    if (!ok) return false;
  }
  return true;
}

describe('Grand Tunnel network (M3-08)', () => {
  it('walks from the hideout to the Shibati gate, opens it and steps out onto the terrace', () => {
    const s = createState(1, w);
    teleport(s.player, HIDEOUT.x, HIDEOUT.y, HIDEOUT.z);
    run(s, w, 10);
    expect(walk(s, w, [[GATE.x, GATE.z - 1.5]])).toBe(true);
    expect(walk(s, w, [[GATE.x, GATE.z + 2]])).toBe(false);
    aim(s, GATE.x, GATE.y + 1.2, GATE.z - 0.15);
    run(s, w, 1, { pressed: B.INTERACT });
    expect(s.wstate.open['shibati-gate']).toBe(true);
    expect(walk(s, w, [[GATE.x, GATE.z + 3]])).toBe(true);
    expect(s.player.pos.y).toBeCloseTo(32, 0);
  });
  it('walks from the hideout along the Grand Tunnel and up the stairs to the Jiaochangkou plaza', () => {
    const s = createState(1, w);
    teleport(s.player, HIDEOUT.x, HIDEOUT.y, HIDEOUT.z);
    run(s, w, 10);
    expect(walk(s, w, [[465.6, 345], [505, 345], [505, 370], [483, 370]])).toBe(true);
    expect(s.player.pos.y).toBeCloseTo(44, 0);
  });
  it('the hotpot cool room off the east end is a shelter site with containers and a table', () => {
    const s = createState(1, w);
    teleport(s.player, 463, 32.05, 345);
    run(s, w, 10);
    expect(walk(s, w, [[556, 345], [563, 345]])).toBe(true);
    const site = w.sites.find(x => x.id === 'coolroom')!;
    expect(site.containers.length).toBe(3);
    expect(w.zones.filter(z => z.kind === 'under').length).toBeGreaterThanOrEqual(4);
  });
});

describe('the air-raid shelter site (M3-09, U-013)', () => {
  it('sits off the side tunnel: a rotten mattress to claim, a rubble-plugged passage and a vent grate to the plaza', () => {
    const site = w.sites.find(x => x.id === 'airraid')!;
    expect(site.bed).toBe('airraid-mattress');
    expect(w.inter.find(i => i.id === 'airraid-mattress')?.kind).toBe('mattress');
    const grate = w.props.find(p => p.kind === 'grate')!;
    expect(grate.y).toBeCloseTo(44, 1);
    expect(w.props.some(p => p.kind === 'rubble')).toBe(true);
  });
  it('walks from the chamber to the street through the gate', () => {
    const s = createState(1, w);
    teleport(s.player, AIRRAID.x + 3.6, AIRRAID.y + 0.05, AIRRAID.z + 0.2);
    run(s, w, 10);
    expect(walk(s, w, [[AIRRAID.x + 22, AIRRAID.z], [GATE.x, AIRRAID.z], [GATE.x, GATE.z - 1.5]])).toBe(true);
    aim(s, GATE.x, GATE.y + 1.2, GATE.z - 0.15);
    run(s, w, 1, { pressed: B.INTERACT });
    expect(walk(s, w, [[GATE.x, GATE.z + 3]])).toBe(true);
  });
});
