// M3-81 (U-044): every connection meets the walls it joins. Planks, beams, cable bundles, bars, walkways, skybridges,
// plank bridges, window planks and the routes' crossings: at each end, the building's mass (a wall, a parapet)
// right there at its height, none hanging in the air off a tower's podium or a stepped top.
import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/world/build';
import { buildIndex, overlaps } from '../../src/world/geom';
import { MAT } from '../../src/world/mats';
import type { Feature } from '../../src/world/world';

const w = getWorld('yuzhong');
// The buildings without the connections: the members are wood or cable, or thin steel, concrete or glass (beams,
// bars, walkways, decks), or sloped (but a pitched tile roof is a building's, M3-35).
const MEMBER = new Set<number>([MAT.wood, MAT.cable, MAT.metal, MAT.concrete, MAT.glass]);
const walls = buildIndex(w.solids.filter(s => s.mat !== MAT.wood && s.mat !== MAT.cable && (!s.ramp || s.mat === MAT.roofTile) && !(MEMBER.has(s.mat) && s.y1 - s.y0 <= 0.5)), w.ground);
const KINDS = ['crossPlank', 'crossBeam', 'crossCord', 'cord', 'gapBar', 'walkway', 'skybridge', 'bridge', 'winPlank', 'routeLink'];

/** The connections of a kind, as their two ends. */
function pairs(kind: string) {
  const by = new Map<number, Feature[]>();
  for (const f of w.features) if (f.kind === kind) (by.get(f.group) ?? by.set(f.group, []).get(f.group)!).push(f);
  return [...by.values()].filter(e => e.length === 2) as [Feature, Feature][];
}

/** Is there a building at end e (o the other end): just under its top, from a little in past it back to a metre and
 *  a half toward the other end (a plank laid on over the roof inside its parapet)? */
function meets(e: Feature, o: Feature) {
  const l = Math.hypot(e.x - o.x, e.z - o.z), dx = (e.x - o.x) / l, dz = (e.z - o.z) / l;
  for (let s = -1.55; s <= 0.76; s += 0.1) for (const dy of [0.05, 0.25, 0.45]) {
    const x = e.x + dx * s, y = e.y - dy, z = e.z + dz * s;
    if (overlaps(walls, { x0: x - 0.02, y0: y - 0.02, z0: z - 0.02, x1: x + 0.02, y1: y + 0.02, z1: z + 0.02 })) return true;
  }
  return false;
}

describe('connections meet the walls (M3-81)', () => {
  it('has each kind, both ends recorded', () => {
    for (const k of KINDS) expect(pairs(k).length, k).toBeGreaterThan(k === 'crossCord' ? 0 : k === 'routeLink' || k === 'crossBeam' ? 2 : 10);
  });
  it("every connection's two ends touch a building, none floating", () => {
    for (const k of KINDS) {
      const ps = pairs(k), bad = ps.filter(([a, b]) => !meets(a, b) || !meets(b, a));
      expect(bad.map(([a]) => `${a.x.toFixed(1)},${a.y.toFixed(1)},${a.z.toFixed(1)}`), `${k}: ${bad.length} of ${ps.length}`).toEqual([]);
    }
  });
});
