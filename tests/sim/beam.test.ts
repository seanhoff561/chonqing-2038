// M3-07 on the real map (M3-41c, D-016): Line 2's elevated beams along the Jialing bank from the Linjiangmen
// portal to the map's edge, walkable on top through the stalled train, with maintenance ladders up to them; the
// metro's street entrances stand at the real stations (the underground stations open in M3-43).
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { buildGround } from '../../src/world/yuzhong/ground';
import { buildLine2, BEAM, TRAIN } from '../../src/world/yuzhong/line2';
import { run } from './helpers';

const w = getWorld('yuzhong'), line = buildLine2(buildGround());

describe('Line 2 on the real map (M3-07, M3-41c)', () => {
  it('walks the beam from the portal 240 m west, through the stalled train, without falling off', { timeout: 60000 }, () => {
    const b = line.beams[0], s = createState(1, w);
    teleport(s.player, b.pts[1][0], b.top[1] + 0.05, b.pts[1][1]);
    run(s, w, 10);
    let k = 2, lowest = Infinity, aboard = 0;
    for (let t = 0; t < 60 * 120 && k <= 40; t++) {
      const p = s.player, [tx, tz] = b.pts[k];
      if (Math.hypot(tx - p.pos.x, tz - p.pos.z) < 0.6) { k++; continue; }
      run(s, w, 1, { my: 1, yaw: Math.atan2(-(tx - p.pos.x), -(tz - p.pos.z)) });
      lowest = Math.min(lowest, p.pos.y - Math.min(b.top[k - 1], b.top[k]));
      if (Math.hypot(p.pos.x - line.train.x, p.pos.z - line.train.z) < TRAIN.len && p.pos.y > line.train.top + 0.3) aboard++;
    }
    expect(k).toBe(41);
    expect(aboard, 'walked through the train').toBeGreaterThan(60);
    expect(lowest).toBeGreaterThan(-0.1);
    expect(s.dead).toBeFalsy();
  });
  it('stands the beam on piers about 9 m over the ground, with ladders up to it', () => {
    const b = line.beams[0];
    expect(b.pts.length).toBeGreaterThan(40);
    // Up to the beam's top where each ladder stands (the beam has a grade under the train).
    const beamTop = (x: number, z: number) => b.top[b.pts.reduce((m, q, i) => (Math.hypot(q[0] - x, q[1] - z) < Math.hypot(b.pts[m][0] - x, b.pts[m][1] - z) ? i : m), 0)];
    expect(w.climbables.filter(c => c.kind === 'ladder' && Math.hypot(c.x - line.train.x, c.z - line.train.z) < 30 && c.y1 > beamTop(c.x, c.z) - 0.3).length).toBeGreaterThanOrEqual(2);
    expect(line.climbables.length).toBeGreaterThanOrEqual(4);
    expect(BEAM.w).toBeLessThan(1);
  });
  it('puts the metro entrances at the real stations', () => {
    for (const n of ['较场口', '临江门', '小什字', '朝天门']) expect(w.teleports.some(t => t.name === `Metro ${n}`), n).toBe(true);
  });
});
