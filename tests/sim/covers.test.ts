// M3-83 (U-044): nothing to climb or crawl through stands open. Every grate, vent, hatch and trapdoor has a cover he
// opens with F first, some bolted from below or rusted fast: the basements' trapdoors and drain grates, the roof
// hatches, the warren shafts' vent covers and the crawl vents between rooms, the grates over the underground's
// ladder shafts and where the sewers come into it. Each blocks its opening until he opens it, then the way is clear.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { createState } from '../../src/sim/sim';
import { teleport } from '../../src/sim/player';
import { syncWorld, doorSolid } from '../../src/sim/doors';
import { free } from '../../src/sim/physics';
import { overlaps, raycast } from '../../src/world/geom';
import { B } from '../../src/sim/types';
import { REACH } from '../../src/sim/interact';
import type { Inter } from '../../src/world/world';
import { run, secs, aim } from './helpers';

const w = getWorld('yuzhong'), of = (k: string) => w.features.filter(f => f.kind === k);
const covers = {
  trapdoor: w.inter.filter(i => i.kind === 'grate' && i.en === 'Trapdoor'),
  'roof hatch': w.inter.filter(i => i.kind === 'grate' && i.en === 'Roof hatch'),
  'drain grate': w.inter.filter(i => i.kind === 'grate' && i.en === 'Drain grate'),
  'street grate': w.inter.filter(i => i.id.startsWith('under-grate')),
  'sewer grate': w.inter.filter(i => i.id.startsWith('sewer-grate')),
  vent: w.inter.filter(i => i.kind === 'door' && i.en === 'Vent cover'),
};

/** Is the middle of its opening filled (the cover's collision there, and on)? */
function shut(it: Inter) {
  const b = w.index.solids[doorSolid(it)], x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2, z = (b.z0 + b.z1) / 2;
  return overlaps(w.index, { x0: x - 0.02, y0: y - 0.01, z0: z - 0.02, x1: x + 0.02, y1: y + 0.01, z1: z + 0.02 });
}

/** Somewhere to stand by it, off it, with it in reach: on the floor round it. */
function spot(it: Inter): [number, number, number] | null {
  const on = ((it.data?.half as number | undefined) ?? 0) + 0.6;
  for (const d of [on + 0.15, on + 0.4, 1.2, 1.6]) for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8, m = Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))), x = it.x + (Math.cos(a) * d) / m, z = it.z + (Math.sin(a) * d) / m;
    // (Down to the floor from a little over it: a door's handle is 1.1 m up, a grate's on the floor.)
    const top = it.y + (it.kind === 'door' ? 0.6 : 1.2), h = raycast(w.index, x, top, z, 0, -1, 0, 3);
    if (!h || top - h.t < it.y - 1.4) continue;
    const y = top - h.t;
    // (Seen from his eyes there, nothing between.)
    const ey = y + 1.62, v = [it.x - x, it.y - ey, it.z - z], l = Math.hypot(...v), sight = raycast(w.index, x, ey, z, v[0] / l, v[1] / l, v[2] / l, l);
    if (free(w.index, x, y + 0.02, z, 1.7) && l < REACH + it.r - 0.1 && (!sight || sight.t > l - it.r)) return [x, y, z];
  }
  return null;
}

/** Stand by it and hold F until it opens (or `t` seconds pass): whether it opened and its opening's clear then. */
function open(it: Inter, t = 6) {
  const s = createState(1, w), at = spot(it);
  if (!at) return null;
  s.flags.clear = true;
  s.wstate = { searched: {}, open: {}, gone: {} };
  syncWorld(s, w);
  teleport(s.player, at[0], at[1] + 0.02, at[2]);
  run(s, w, 5);
  aim(s, it.x, it.y, it.z);
  run(s, w, 1, { pressed: B.INTERACT, buttons: B.INTERACT });
  for (let i = 0; i < secs(t) && !s.wstate.open[it.id]; i++) run(s, w, 1, { buttons: B.INTERACT });
  const was = !!s.wstate.open[it.id], clear = !shut(it);
  // (Put back as built for the next one.)
  s.wstate.open = {};
  syncWorld(s, w);
  return { was, clear };
}

describe('everything to climb or crawl through has a cover, opened with F (M3-83)', () => {
  it('covers every basement hatch and drain, roof hatch, shaft duct, street grate and sewer mouth', () => {
    for (const [k, n] of Object.entries({ trapdoor: 200, 'roof hatch': 20, 'drain grate': 200, 'street grate': 3, 'sewer grate': 2, vent: 500 })) expect(covers[k as keyof typeof covers].length, k).toBeGreaterThan(n);
    // Each basement's ladder hatch and manhole.
    expect(covers.trapdoor.length).toBe(covers['drain grate'].length);
    // Each grate down to the tunnels: one over every shaft.
    for (const f of w.features.filter(f => f.kind === 'way:grate')) expect(covers['street grate'].some(i => Math.hypot(i.x - f.x, i.z - f.z) < 0.5), `${f.x},${f.z}`).toBe(true);
    // Both ducts of every warren shaft, at its foot and its head: covers the duct's height (a crawl vent's is lower).
    const vents = covers.vent, ducts = vents.filter(i => { const b = w.index.solids[doorSolid(i)]; return Math.abs(b.y1 - b.y0 - 1.2) < 0.01; });
    expect(ducts.length).toBe(of('shaft').length + of('shafthead').length);
    // All of them shut as built, filling their openings; some bolted, jammed or rusted fast.
    for (const [k, list] of Object.entries(covers)) expect(list.filter(shut).length / list.length, k).toBeGreaterThan(0.99);
    const grates = Object.entries(covers).filter(([k]) => k !== 'vent' && k !== 'sewer grate').flatMap(([, l]) => l);
    expect(grates.filter(i => !i.data?.loose).length / grates.length).toBeGreaterThan(0.15);
    expect(vents.filter(i => i.data?.lock === 'jammed').length / vents.length).toBeGreaterThan(0.2);
  });
  it('each kind blocks until he opens it with F, then the way through is clear', () => {
    for (const [k, list] of Object.entries(covers)) {
      // From above, the loose ones (a bolted one lifts only from below).
      const tries = list.filter(i => i.kind !== 'grate' || i.data?.loose).slice(0, 8);
      let opened = 0;
      for (const it of tries) {
        expect(shut(it), `${k} ${it.id}`).toBe(true);
        const r = open(it);
        if (!r) continue;
        expect(r, `${k} ${it.id}`).toEqual({ was: true, clear: true });
        expect(shut(it)).toBe(true);
        opened++;
      }
      expect(opened, k).toBeGreaterThanOrEqual(2);
    }
  });
  it("won't lift bolted from above", () => {
    const it = [...covers['street grate'], ...covers['roof hatch'], ...covers['drain grate']].find(i => !i.data?.loose && spot(i))!;
    expect(open(it, 4)).toEqual({ was: false, clear: false });
    expect(shut(it)).toBe(true);
  });
});
