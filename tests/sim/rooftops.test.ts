// M3-03 on the real map (M3-41c, D-016): rows of buildings along the streets with alleys between them and roof
// clutter; neighbouring roofs often within jumping range (unknown heights meet a neighbour's roof); a sim runs a
// rooftop route across four buildings, jumping the gaps and vaulting the parapets.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { raycast } from '../../src/world/geom';
import { teleport } from '../../src/sim/player';
import { minRect, obbOverlap, corners, inside, type Obb } from '../../src/world/yuzhong/shapes';
import { districtAt } from '../../src/world/yuzhong/lots';
import { run } from './helpers';
import { B } from '../../src/sim/types';
import { ENVELOPE as E } from '../../src/data/envelope';
import type { Plot } from '../../src/world/world';

const w = getWorld('yuzhong');
const low = w.plots.filter(p => !p.far && p.kind !== 'tower'), obb = new Map<Plot, Obb>(low.map(p => [p, minRect(p.corners)]));
/** Whether two buildings stand closer than gap metres apart. */
const near = (a: Plot, b: Plot, gap: number) => Math.hypot(obb.get(a)!.cx - obb.get(b)!.cx, obb.get(a)!.cz - obb.get(b)!.cz) < 90 && obbOverlap(obb.get(a)!, obb.get(b)!, gap / 2);

describe('buildings and rooftops (M3-03)', () => {
  it('lines the streets with rows of buildings, 1.5-4 m alleys between them, and clutters the roofs', () => {
    let alleys = 0, pairs = 0;
    for (let i = 0; i + 1 < low.length; i++) {
      const a = low[i], b = low[i + 1];
      if (!a.row || a.row !== b.row || Math.abs(Math.sin(2 * (obb.get(a)!.yaw - obb.get(b)!.yaw))) > 1e-3) continue;
      pairs++;
      expect(near(a, b, 1.45), 'alley at least 1.5 m').toBe(false);
      if (near(a, b, 4.05)) alleys++;
    }
    // Next door along a street, or round a bend or past a gap.
    expect(alleys).toBeGreaterThan(300);
    expect(alleys / pairs).toBeGreaterThan(0.7);
    expect(w.features.filter(f => ['crate', 'dumpster', 'bar', 'fence'].includes(f.kind)).length).toBeGreaterThan(200);
    expect(w.props.filter(p => p.kind === 'stilts').length).toBeGreaterThan(100);
  });
  // Jumping range from the movement envelope (M3-50): a running jump across, a safe drop down.
  it('neighbouring roofs are often within jumping range (a running jump across, a safe drop down)', () => {
    const jumpable = low.filter(a => low.some(b => b !== a && near(a, b, E.runningJump.comfortable) && !near(a, b, 0.5) && a.top - b.top >= -0.5 && a.top - b.top <= E.safeDrop.max));
    expect(jumpable.length / low.length).toBeGreaterThan(0.5);
  });
  it('runs a rooftop route across four buildings in Shibati', () => {
    // Flat roofs a running jump apart (a 3.2 m gap at most, level or up to 3.5 m down), nearest Shibati first.
    const roofs = low.filter(p => p.kind === 'res');
    // From the back of one roof straight at the middle of the next, nothing in his way (knee and chest high, his
    // width either side) but the parapets.
    const extent = (a: Obb, ux: number, uz: number) => a.hw * Math.abs(ux * Math.cos(a.yaw) + uz * Math.sin(a.yaw)) + a.hd * Math.abs(-ux * Math.sin(a.yaw) + uz * Math.cos(a.yaw));
    const backOf = (a: Obb, b: Obb): [number, number] => {
      const dl = Math.hypot(b.cx - a.cx, b.cz - a.cz), ux = (b.cx - a.cx) / dl, uz = (b.cz - a.cz) / dl, ext = extent(a, ux, uz);
      return [a.cx - ux * (ext - 1), a.cz - uz * (ext - 1)];
    };
    const clear = (a: Plot, b: Plot) => {
      const oa = obb.get(a)!, ob = obb.get(b)!, [x, z] = backOf(oa, ob), dx = ob.cx - x, dz = ob.cz - z, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
      // Knee high up to just short of his own parapet, chest high all the way.
      const ray = (h: number, o: number, len: number) => !raycast(w.index, x - uz * o, a.wall + h, z + ux * o, ux, 0, uz, len);
      return [-0.4, 0, 0.4].every(o => ray(0.35, o, 2 * extent(oa, ux, uz) - 1.6) && ray(1.2, o, l));
    };
    const hop = (a: Plot, b: Plot) => near(a, b, 3.2) && !near(a, b, 1.5) && a.top - b.top >= -0.3 && a.top - b.top <= 3.5 && clear(a, b);
    const sb = w.teleports.find(t => t.name === 'shibati')!, d = (p: Plot) => Math.hypot(obb.get(p)!.cx - sb.x, obb.get(p)!.cz - sb.z);
    let path: Plot[] | null = null;
    const dfs = (p: Plot[]): boolean => {
      if (p.length === 4) { path = p; return true; }
      for (const b of roofs) if (!p.includes(b) && hop(p[p.length - 1], b) && dfs([...p, b])) return true;
      return false;
    };
    for (const a of [...roofs].sort((x, y) => d(x) - d(y)).filter(p => districtAt(obb.get(p)!.cx, obb.get(p)!.cz).district === 'shibati')) if (dfs([a])) break;
    expect(path).not.toBeNull();
    const route = path! as Plot[], s = createState(1, w), o0 = obb.get(route[0])!;
    teleport(s.player, o0.cx, route[0].top + 0.05, o0.cz);
    run(s, w, 20);
    // Each hop: back up to the far side of this roof for a run-up, then sprint at the next one and jump at the edge.
    let reached = 1, stuck = 0, back = true, backT = 0, detour = 0, side = 1;
    for (let t = 0; t < 60 * 60 && reached < route.length; t++) {
      const p = s.player, cur = obb.get(route[reached - 1])!, next = obb.get(route[reached])!;
      const [tx, tz] = back ? backOf(cur, next) : [next.cx, next.cz], yaw = Math.atan2(-(tx - p.pos.x), -(tz - p.pos.z));
      if (back) {
        if (Math.hypot(tx - p.pos.x, tz - p.pos.z) < 0.5 || ++backT > 180) { back = false; backT = 0; }
        else run(s, w, 1, { my: 1, yaw });
        continue;
      }
      // Roof clutter in the way: step round it.
      stuck = p.onGround && Math.hypot(p.vel.x, p.vel.z) < 0.5 ? stuck + 1 : 0;
      if (stuck > 20) { detour = 40; side = -side; stuck = 0; }
      if (detour > 0) { detour--; run(s, w, 1, { mx: side, my: 0.3, yaw }); continue; }
      // Jump when the next metre ahead leaves this roof.
      const ax = p.pos.x - Math.sin(yaw) * 1.0, az = p.pos.z - Math.cos(yaw) * 1.0, edge = p.onGround && !inside(corners(cur), ax, az);
      run(s, w, 1, { my: 1, yaw, buttons: B.SPRINT | (edge || !p.onGround ? B.JUMP : 0), pressed: edge ? B.JUMP : 0 });
      if (p.onGround && inside(corners(next), p.pos.x, p.pos.z) && p.pos.y > route[reached].wall - 0.5) { reached++; back = true; }
    }
    expect(districtAt(o0.cx, o0.cz).district).toBe('shibati');
    expect(reached, `route at ${o0.cx.toFixed(0)},${o0.cz.toFixed(0)}`).toBe(4);
    expect(s.dead).toBeFalsy();
  });
});
