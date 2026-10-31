// M3-18: the district teleports. The list covers Shibati's stair top and bottom, Jiaochangkou, the beam of Line 2,
// the friends' hideout and the Grand Tunnel's junctions; each sets him down standing where it says.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { heightAt } from '../../src/world/heightfield';
import { run, secs } from './helpers';

const w = getWorld('yuzhong'), tp = (n: string) => w.teleports.find(t => t.name === n)!;
const NAMES = ['Shibati top', 'Shibati bottom', 'jiaochangkou', 'Line 2 beam', "Friends' hideout (vent grate)", 'Tunnel junction (hideout)', 'Tunnel junction (metro)'];

describe('district teleports (M3-18)', () => {
  it('covers the places to test from', () => {
    for (const n of NAMES) expect(tp(n), n).toBeTruthy();
  });
  it('sets him down standing at each', () => {
    for (const n of NAMES) {
      const t = tp(n), s = createState(1, w);
      Object.assign(s.flags, { god: true });
      teleport(s.player, t.x, t.y + 0.05, t.z);
      run(s, w, secs(2));
      expect(s.player.mode, n).toBe('ground');
      expect(Math.hypot(s.player.pos.x - t.x, s.player.pos.z - t.z), n).toBeLessThan(0.5);
    }
  });
  it('puts the stair top above its bottom, the beam over the street and the junctions underground', () => {
    const top = tp('Shibati top'), foot = tp('Shibati bottom'), beam = tp('Line 2 beam');
    expect(top.y - foot.y).toBeGreaterThan(10);
    expect(beam.y - heightAt(w.ground!, beam.x, beam.z)!).toBeGreaterThan(5);
    for (const n of ['Tunnel junction (hideout)', 'Tunnel junction (metro)']) expect(tp(n).y, n).toBeLessThan(heightAt(w.ground!, tp(n).x, tp(n).z)! - 5);
  });
});
