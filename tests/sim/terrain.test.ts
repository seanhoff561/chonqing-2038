// M3-02 on the real map (M3-41c, D-016): the Eighteen Stairs walk from their foot to the top at Jiaochangkou
// without a fall; the rivers hold water over their beds.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { heightAt } from '../../src/world/heightfield';
import { streets, onGround, WATER_Y } from '../../src/world/yuzhong/ground';
import { districtAt } from '../../src/world/yuzhong/lots';
import { run } from './helpers';
import { B } from '../../src/sim/types';

const w = getWorld('yuzhong'), g = w.ground!;

describe('terrain and the Eighteen Stairs', () => {
  it('walks up the longest flight of the Shibati stairs from its foot to its top without a fall', () => {
    const len = (p: [number, number][]) => p.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
    const flights = streets().filter(s => onGround(s) && s.steps && s.pts.every(([x, z]) => districtAt(x, z).district === 'shibati')).sort((a, b) => len(b.pts) - len(a.pts));
    const f = flights[0], pts = heightAt(g, ...f.pts[0])! < heightAt(g, ...f.pts[f.pts.length - 1])! ? f.pts : [...f.pts].reverse();
    const rise = heightAt(g, ...pts[pts.length - 1])! - heightAt(g, ...pts[0])!;
    expect(rise).toBeGreaterThan(8);
    const s = createState(1, w);
    teleport(s.player, pts[0][0], heightAt(g, ...pts[0])! + 0.6, pts[0][1]);
    run(s, w, 30);
    let k = 1, falls = 0;
    for (let t = 0; t < 60 * 300 && k < pts.length; t++) {
      const p = s.player.pos, [tx, tz] = pts[k];
      if (Math.hypot(tx - p.x, tz - p.z) < 1.2) { k++; continue; }
      run(s, w, 1, { my: 1, buttons: B.SPRINT, yaw: Math.atan2(-(tx - p.x), -(tz - p.z)) }, st => { if (st.events.some(e => e.t === 'land' && e.h > 1.5)) falls++; });
    }
    expect(k).toBe(pts.length);
    expect(s.player.pos.y).toBeCloseTo(heightAt(g, ...pts[pts.length - 1])!, 0);
    expect(falls).toBe(0);
  });
  it('the rivers hold water over their beds', () => {
    expect(w.water.length).toBeGreaterThan(0);
    expect(w.water.every(b => b.y1 === WATER_Y)).toBe(true);
    let wet = 0;
    for (let j = 0; j < g.h; j += 10) for (let i = 0; i < g.w; i += 10) if (g.y[j * g.w + i] < WATER_Y - 1) wet++;
    expect(wet).toBeGreaterThan(100);
  });
});
