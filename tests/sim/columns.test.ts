// M4-01b (U-030, U-031): the machines' columns out of the factory as real units. Squads leave every gate at all
// hours along its convoy way: humanoids in two staggered files, quadrupeds on the flanks, a carrier, a drone over
// them; the two fire teams move by bounds; a pair peels off into an alley and runs back to its place.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { unitPose, type Unit } from '../../src/sim/units';
import { COLUMN } from '../../src/data/units';
import { SCALE } from '../../src/sim/clock';

const w = getWorld('yuzhong'), C = w.convoys!, s = createState(1, w), cols = s.units.filter(u => u.convoy);
const at = (u: Unit, t: number) => unitPose(w, u, t * SCALE);

describe('columns out of the factory (M4-01b)', () => {
  it('marches squads out of every gate at all hours, starting on its convoy way', () => {
    expect(C.length).toBeGreaterThanOrEqual(2);
    for (const [k] of C.entries()) for (const hour of [3, 15]) {
      const on = cols.filter(u => u.convoy!.path === k && unitPose(w, u, hour * 3600).active);
      expect(on.length, `way ${k} at ${hour}:00`).toBeGreaterThanOrEqual(COLUMN.squad.length);
    }
    // A squad's first moments: at the way's start.
    const lead = cols.find(u => u.convoy!.path === 0 && u.convoy!.slot === 0 && u.convoy!.member === 0)!, p = at(lead, 1);
    expect(Math.hypot(p.x - C[0].pts[0].x, p.z - C[0].pts[0].z)).toBeLessThan(6);
  });
  it('keeps a squad in a loose staggered formation, not single file', () => {
    const squad = cols.filter(u => u.convoy!.path === 0 && u.convoy!.slot === 0 && COLUMN.squad[u.convoy!.member].kind !== 'drone'), t = 200;
    const ps = squad.map(u => at(u, t)).filter(p => p.active);
    expect(ps.length).toBeGreaterThanOrEqual(6);
    // Spread across the road: some to each side of the line through the squad.
    const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cz = ps.reduce((a, p) => a + p.z, 0) / ps.length, yaw = ps[0].yaw;
    const side = ps.map(p => (p.x - cx) * Math.cos(yaw) - (p.z - cz) * Math.sin(yaw));
    expect(side.filter(v => v > 1).length).toBeGreaterThanOrEqual(2);
    expect(side.filter(v => v < -1).length).toBeGreaterThanOrEqual(2);
  });
  it('moves the two fire teams by bounds: one runs while the other holds', () => {
    const team = (k: number) => cols.find(u => u.convoy!.path === 0 && u.convoy!.slot === 0 && COLUMN.squad[u.convoy!.member].team === k && COLUMN.squad[u.convoy!.member].kind === 'humanoid')!;
    const speed = (u: Unit, t: number) => { const a = at(u, t), b = at(u, t + 0.5); return Math.hypot(b.x - a.x, b.z - a.z) / 0.5; };
    let seen = 0;
    for (let t = 120; t < 120 + 2 * COLUMN.bound; t += 1) {
      const a = speed(team(0), t), b = speed(team(1), t);
      if (Math.min(a, b) < 0.2 && Math.max(a, b) > COLUMN.pace * 1.5) seen++;
    }
    expect(seen).toBeGreaterThanOrEqual(2 * COLUMN.bound - 6);
  });
  it('peels a pair off into an alley, and back into its place', () => {
    const k = C.findIndex(c => c.spurs.length), peel = cols.filter(u => u.convoy!.path === k && COLUMN.peel.includes(u.convoy!.member));
    expect(k).toBeGreaterThanOrEqual(0);
    let alley = false, back = false;
    for (const u of peel.slice(0, 4)) {
      const mate = cols.find(q => q.convoy!.path === k && q.convoy!.slot === u.convoy!.slot && q.convoy!.member === COLUMN.squad.findIndex(m => m.team === COLUMN.squad[u.convoy!.member].team && m.kind === 'humanoid'))!;
      let off = false;
      for (let t = 0; t < 3000; t += 1) {
        const p = at(u, t), q = at(mate, t);
        if (!p.active || !q.active) continue;
        const gap = Math.hypot(p.x - q.x, p.z - q.z);
        if (gap > 25 && C[k].spurs.some(sp => Math.hypot(sp.at.x - p.x, sp.at.z - p.z) < 1)) { off = alley = true; }
        if (off && gap < 16) { back = true; break; }
      }
    }
    expect(alley).toBe(true);
    expect(back).toBe(true);
  });
});
