import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { BEAM, STATIONS, TRAIN } from '../../src/world/sets/jiaochangkou';
import { teleport } from '../../src/sim/player';
import { run } from './helpers';

const w = getWorld('city');

describe('Jiaochangkou and the Line 2 beam (M3-07)', () => {
  it('walks the beam west from the terminus to the next station without falling off', () => {
    const s = createState(1, w);
    teleport(s.player, STATIONS[0].x0 - 2, BEAM.top + 0.05, BEAM.z);
    run(s, w, 10, { yaw: Math.PI / 2 });
    let lowest = Infinity, aboard = 0;
    for (let i = 0; i < 60 * 70 && s.player.pos.x > STATIONS[1].x1 - 2; i++) {
      run(s, w, 1, { my: 1, yaw: Math.PI / 2 });
      lowest = Math.min(lowest, s.player.pos.y);
      if (s.player.pos.x > TRAIN.x0 + 1 && s.player.pos.x < TRAIN.x0 + 2 * TRAIN.len && s.player.pos.y > BEAM.top + 0.3) aboard++;
    }
    // Through the stalled train on the way (M3-34): in at one end door, out of the other.
    expect(aboard).toBeGreaterThan(60);
    expect(s.player.pos.x).toBeLessThan(STATIONS[1].x1 - 2);
    expect(lowest).toBeGreaterThan(BEAM.top - 0.1);
    expect(s.dead).toBeFalsy();
  });
  it('climbs the terminus stairs from the junction plaza to the platform', () => {
    const s = createState(1, w), sx = STATIONS[0].x1 - 6 + 1.5;
    teleport(s.player, sx, 44.05, BEAM.z + BEAM.w / 2 + 36);
    run(s, w, 10, { yaw: 0 });
    for (let i = 0; i < 60 * 20 && s.player.pos.z > BEAM.z + 4; i++) run(s, w, 1, { my: 1, yaw: 0 });
    expect(s.player.pos.z).toBeLessThan(BEAM.z + 4);
    expect(s.player.pos.y).toBeCloseTo(BEAM.top, 1);
  });
  it('has a maintenance ladder up to each platform', () => {
    for (const st of STATIONS) expect(w.climbables.filter(c => c.kind === 'ladder' && c.x > st.x0 && c.x < st.x1 && Math.abs(c.z - BEAM.z) < 7 && c.y1 > BEAM.top).length).toBe(2);
  });
});
