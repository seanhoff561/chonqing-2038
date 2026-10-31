// M4-01: the machines on their beats. Units are plain data; while Unaware where a unit is is a pure function of the
// game time and its run's phase (at most 8% of its loop); beats pause where they say and keep their hours; they run
// under the ground too, and off the clear streets into alleys and buildings.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose, loopOf } from '../../src/sim/units';
import { heightAt } from '../../src/world/heightfield';
import { DWELL, PHASE } from '../../src/data/units';
import { SCALE } from '../../src/sim/clock';
import { run, secs } from './helpers';

const w = getWorld('yuzhong'), P = w.patrols;

describe('units and their beats (M4-01)', () => {
  it('keeps units as plain data, each started within 8% of its loop', () => {
    const s = createState(5, w);
    expect(s.units.filter(u => !u.convoy).length).toBe(P.length);
    expect(JSON.parse(JSON.stringify(s.units))).toEqual(s.units);
    for (const u of s.units.filter(q => !q.convoy)) {
      expect(u.state).toBe('unaware');
      expect(u.phase).toBeGreaterThanOrEqual(0);
      expect(u.phase).toBeLessThanOrEqual(PHASE * loopOf(w, u) + 1e-6);
    }
    // Another run, other phases; the same run, the same.
    expect(createState(6, w).units.some((u, i) => u.phase !== s.units[i].phase)).toBe(true);
    expect(createState(5, w).units).toEqual(s.units);
  });
  it('puts each unit in the same place at the same time however that time was reached', () => {
    const a = createState(9, w), b = createState(9, w);
    a.flags.god = true;
    run(a, w, secs(20));
    // b jumps straight there (as a sleep does).
    b.time = a.time;
    for (const [i, u] of a.units.entries()) expect(unitPose(w, u, a.time)).toEqual(unitPose(w, b.units[i], b.time));
    // And moving: 20 s later a walking unit is somewhere else.
    const walker = a.units.find(u => !u.convoy && u.kind === 'quadruped' && unitPose(w, u, 12 * 3600).active)!;
    const p0 = unitPose(w, walker, 12 * 3600), p1 = unitPose(w, walker, 12 * 3600 + 20 * SCALE);
    expect(Math.hypot(p1.x - p0.x, p1.z - p0.z) + Math.abs(p1.y - p0.y)).toBeGreaterThan(0);
  });
  it('pauses where the beat says and keeps its hours', () => {
    const s = createState(3, w);
    // A pause of 8 s or more somewhere: sampled across it, the unit stands still.
    const u = s.units.find(q => !q.convoy && P[q.patrol].dwell.some(d => d >= DWELL.alley))!;
    const p = P[u.patrol], k = p.dwell.findIndex(d => d >= DWELL.alley);
    let t = 12 * 3600, still = 0;
    for (let i = 0; i < 20000 && still < 8; i++, t += 0.25 * SCALE) {
      const q = unitPose(w, u, t);
      still = Math.hypot(q.x - p.pts[k].x, q.y - p.pts[k].y, q.z - p.pts[k].z) < 1e-6 ? still + 0.25 : 0;
    }
    expect(still).toBeGreaterThanOrEqual(DWELL.alley - 0.5);
    // A night drone is parked by day and out at night.
    const d = s.units.find(q => !q.convoy && q.kind === 'drone' && P[q.patrol].hours[0] >= 19)!;
    expect(unitPose(w, d, 12 * 3600).active).toBe(false);
    expect(unitPose(w, d, 23 * 3600).active).toBe(true);
  });
  it('runs beats under the ground', () => {
    const under = P.filter(p => p.kind === 'under');
    expect(under.length).toBeGreaterThanOrEqual(2);
    for (const p of under) expect(p.pts.filter(q => q.y < (heightAt(w.ground!, q.x, q.z) ?? Infinity) - 3).length / p.pts.length).toBeGreaterThan(0.8);
  });
  it('breaks off the clear streets into alleys and buildings', () => {
    const hides = w.hides.filter(h => h.kind === 'crate' || h.kind === 'dumpster' || h.kind === 'drum').map(h => ({ x: (h.inner.x0 + h.inner.x1) / 2, z: (h.inner.z0 + h.inner.z1) / 2 })), insides = new Set(w.plots.filter(p => p.route && p.route.length > 1).map(p => `${p.route![1].x},${p.route![1].z}`));
    const streets = P.filter(p => p.kind === 'street' && p.unit !== 'delivery');
    const alleys = streets.flatMap(p => p.pts.filter((q, i) => p.dwell[i] === DWELL.alley && hides.some(h => Math.hypot(h.x - q.x, h.z - q.z) < 1.5)));
    const inside = streets.flatMap(p => p.pts.filter((q, i) => p.dwell[i] === DWELL.inside && insides.has(`${q.x},${q.z}`)));
    expect(alleys.length).toBeGreaterThanOrEqual(5);
    expect(inside.length).toBeGreaterThanOrEqual(3);
    expect(P.filter(p => p.kind === 'drone').some(p => p.dwell.some(d => d === DWELL.alley))).toBe(true);
    // Who walks them: delivery robots on the flat, quadrupeds and humanoids on the rest.
    for (const k of ['quadruped', 'humanoid']) expect(streets.some(p => p.unit === k), k).toBe(true);
  });
});
