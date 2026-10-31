// M3-20: Shibati's Yangtze riverfront. The lower city meets the riverfront road; on its river side the machines'
// prefab wall, a panel down here and there; past it the riverside and flights of steps down into the Yangtze. He
// walks down the steps into the water and swims, and climbs back out; he gets through the wall where a panel is down.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { raycast } from '../../src/world/geom';
import { WATER_Y } from '../../src/world/yuzhong/ground';
import { run, secs } from './helpers';
import type { Feature } from '../../src/world/world';

const w = getWorld('yuzhong'), of = (k: string) => w.features.filter(f => f.kind === k);
const steps = of('river:steps'), wall = of('river:wall'), breaches = of('river:breach');

/** Stand d metres back from a feature against its heading, on what's there, facing along it. */
function stand(f: Feature, d: number) {
  const s = createState(1, w), x = f.x - f.nx! * d, z = f.z - f.nz! * d, down = raycast(w.index, x, f.y + 10, z, 0, -1, 0, 20)!;
  s.flags.clear = true;
  teleport(s.player, x, f.y + 10.05 - down.t, z);
  s.player.yaw = Math.atan2(f.nx!, f.nz!) + Math.PI;
  run(s, w, 10);
  return s;
}

describe("Shibati's Yangtze riverfront (M3-20)", () => {
  it('walls the river off along the riverfront road, with a panel down here and there', () => {
    expect(wall.length).toBeGreaterThan(100);
    expect(breaches.length).toBeGreaterThanOrEqual(3);
    // Each panel stands across the way from the road to the water.
    const stood = wall.filter(f => { const h = raycast(w.index, f.x - f.nx! * 1.5, f.y + 1.5, f.z - f.nz! * 1.5, f.nx!, 0, f.nz!, 2); return h && h.t < 1.7; });
    expect(stood.length).toBe(wall.length);
    // Its road side carries the machines' notices.
    expect(w.props.some(p => p.kind === 'redbanner' && p.text === '9' && wall.some(f => Math.hypot(f.x - p.x, f.z - p.z) < 1))).toBe(true);
  });
  it('has steps down the bank into the water', () => {
    expect(steps.length).toBeGreaterThanOrEqual(4);
    for (const f of steps) expect(f.y).toBeGreaterThan(WATER_Y + 3);
  });
  it('walks down the steps into the Yangtze and swims, then climbs back out', () => {
    for (const f of steps) {
      const s = stand(f, 3);
      let swam = false;
      for (let i = 0; i < secs(25) && !swam; i++) { run(s, w, 1, { my: 1 }); swam = s.player.mode === 'swim'; }
      expect(swam, `${f.x},${f.z}`).toBe(true);
      // Out a little further, then back to the steps and up them.
      run(s, w, secs(3), { my: 1 });
      s.player.yaw += Math.PI;
      let out = false;
      for (let i = 0; i < secs(40) && !out; i++) { run(s, w, 1, { my: 1 }); out = s.player.mode === 'ground' && s.player.pos.y > WATER_Y + 2; }
      expect(out, `${f.x},${f.z}`).toBe(true);
    }
  });
  it('gets through the wall where a panel is down', () => {
    const through = breaches.filter(f => {
      const s = stand(f, 2.5);
      run(s, w, secs(4), { my: 1 });
      return (s.player.pos.x - f.x) * f.nx! + (s.player.pos.z - f.z) * f.nz! > 1;
    });
    expect(through.length).toBeGreaterThanOrEqual(Math.min(3, breaches.length));
  });
});
