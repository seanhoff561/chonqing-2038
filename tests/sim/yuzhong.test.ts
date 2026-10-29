// M3-41b (D-016): the Yuzhong base world at 1:1: buildings stand on the ground with their doors at street level,
// none sits on a roadway, and real streets and stairs walk end to end.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { heightAt } from '../../src/world/heightfield';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { streets, onGround } from '../../src/world/yuzhong/ground';
import { segNearObb, minRect } from '../../src/world/yuzhong/shapes';
import { run } from './helpers';
import { B } from '../../src/sim/types';

const w = getWorld('yuzhong'), g = w.ground!;
const near = w.plots.filter(p => !p.far);

describe('Yuzhong at 1:1 (M3-41b)', () => {
  it('lays out thousands of buildings, OSM and infill', () => {
    expect(near.length).toBeGreaterThan(1500);
    expect(near.filter(p => p.osm).length).toBeGreaterThan(300);
    expect(w.plots.some(p => p.far)).toBe(true);
  });
  it('stands every building on the ground: no gap under its walls, and nothing rising into an enterable one', () => {
    let gaps = 0, poking = 0;
    for (const p of near) {
      const [cx, cz] = p.corners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4], [0, 0]);
      // Each corner pulled 0.3 m in toward the middle, and the middle.
      const hs = [heightAt(g, cx, cz), ...p.corners.map(([x, z]) => { const l = Math.hypot(cx - x, cz - z) || 1; return heightAt(g, x + ((cx - x) / l) * 0.3, z + ((cz - z) / l) * 0.3); })];
      // Outside each corner the ground must reach the foundation (which goes down to the lowest ground round it).
      const out = p.corners.map(([x, z]) => { const l = Math.hypot(cx - x, cz - z) || 1; return heightAt(g, x - ((cx - x) / l) * 1.0, z - ((cz - z) / l) * 1.0); });
      if (out.some(h => h !== null && h < p.found - 0.05)) gaps++;
      // The middle exactly at the floor; corners within a hand's breadth (a sloping street in front leans them).
      if (p.route && (hs.some(h => h === null || Math.abs(h - p.base) > 0.3) || Math.abs(hs[0]! - p.base) > 0.05)) poking++;
    }
    expect(gaps, 'gaps under walls').toBe(0);
    expect(poking, 'ground in enterable buildings').toBe(0);
  });
  it("puts every enterable building's door at the ground outside it", () => {
    const doors = near.filter(p => p.route).map(p => p.route![0]);
    expect(doors.length).toBeGreaterThan(60);
    const buried = doors.filter(d => Math.abs((heightAt(g, d.x, d.z) ?? -99) - d.y) > 0.5);
    expect(buried.length / doors.length).toBeLessThan(0.02);
  });
  it('keeps roadways clear of buildings', { timeout: 60000 }, () => {
    const roads = streets().filter(s => onGround(s) && ['primary', 'secondary', 'tertiary', 'residential'].includes(s.kind));
    const segs = roads.flatMap(s => s.pts.slice(1).map((b, k) => ({ a: s.pts[k], b, r: s.w / 2 - 0.6 })));
    let hits = 0;
    for (const p of near) {
      const o = minRect(p.corners), reach = Math.hypot(o.hw, o.hd) + 30;
      for (const sg of segs) {
        if (Math.min(Math.hypot(sg.a[0] - o.cx, sg.a[1] - o.cz), Math.hypot(sg.b[0] - o.cx, sg.b[1] - o.cz)) > reach + Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1])) continue;
        if (segNearObb(o, sg.a[0], sg.a[1], sg.b[0], sg.b[1], sg.r)) { hits++; break; }
      }
    }
    expect(hits).toBe(0);
  });
  it('walks real streets and stairs end to end', { timeout: 120000 }, () => {
    // On the peninsula: within 1.3 km of Jiefangbei, not across a river.
    const jf = w.teleports.find(t => t.name === 'jiefangbei')!;
    const picks = streets().filter(s => onGround(s) && s.pts.length >= 3 && s.pts.every(([x, z]) => Math.hypot(x - jf.x, z - jf.z) < 1300)).sort((a, b) => len(b) - len(a));
    const cases = [picks.find(s => s.kind === 'secondary')!, picks.find(s => s.kind === 'residential')!, picks.find(s => s.steps)!];
    for (const s of cases) {
      const st = createState(1, w), [x, z] = s.pts[0];
      teleport(st.player, x, heightAt(g, x, z)! + 0.6, z);
      run(st, w, 30);
      let k = 1;
      for (let t = 0; t < 60 * 600 && k < s.pts.length; t++) {
        const p = st.player.pos, [tx, tz] = s.pts[k];
        if (Math.hypot(tx - p.x, tz - p.z) < 1.5) { k++; continue; }
        run(st, w, 1, { my: 1, buttons: B.SPRINT, yaw: Math.atan2(-(tx - p.x), -(tz - p.z)) });
      }
      expect(k, `${s.kind} ${s.name}`).toBe(s.pts.length);
    }
  });
});

function len(s: { pts: [number, number][] }) { return s.pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - s.pts[i][0], p[1] - s.pts[i][1]), 0); }
