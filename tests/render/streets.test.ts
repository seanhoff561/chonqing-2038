// M3-54 (U-022): streets are meshes along their lines: a road's asphalt runs exactly its width either side of the
// line (mitred at bends, no cell-stepped edges), its pavements beyond, and a pavement never lies on a crossing
// road's carriageway.
import { describe, it, expect } from 'vitest';
import { heightfield } from '../../src/world/heightfield';
import { streetBuffers } from '../../src/render/streets';
import { MAT } from '../../src/world/mats';

const g = heightfield(0, 0, 2, 151, 151);
g.y.fill(5);
/** Distance from (x, z) to a polyline. */
const dist = (pts: [number, number][], x: number, z: number) => Math.min(...pts.slice(1).map(([bx, bz], k) => {
  const [ax, az] = pts[k], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(x - ax - vx * t, z - az - vz * t);
}));
const verts = (bufs: ReturnType<typeof streetBuffers>, mat: number) => bufs.filter(b => b.mat === mat).flatMap(b => {
  const out: [number, number, number][] = [];
  for (let i = 0; i < b.buf.pos.length; i += 3) out.push([b.buf.pos[i], b.buf.pos[i + 1], b.buf.pos[i + 2]]);
  return out;
});

describe('streets as meshes (M3-54)', () => {
  const road: [number, number][] = [[20, 100], [100, 100], [140, 40]], lane: [number, number][] = [[60, 20], [60, 180]];
  const meshes = streetBuffers(g, [{ kind: 'secondary', w: 10, steps: false, pts: road }, { kind: 'residential', w: 6, steps: false, pts: lane }]);
  it("lays the asphalt along the line, its edges at half the road's width (stretched no more than the miter at the bend)", () => {
    const asphalt = verts(meshes, MAT.asphalt).filter(v => v[1] < 5.04 && dist(lane, v[0], v[2]) > 3.5);
    expect(asphalt.length).toBeGreaterThan(100);
    for (const [x, , z] of asphalt) expect(dist(road, x, z)).toBeLessThanOrEqual(5 * 1.2 + 1e-6);
    // Edge vertices sit on the edge, not on a 2 m grid.
    const edges = asphalt.filter(([x, , z]) => dist(road, x, z) > 4.9);
    expect(edges.length).toBeGreaterThan(40);
    expect(edges.every(([x, , z]) => Math.abs(dist(road, x, z) - 5) < 0.02 || x > 95)).toBe(true);
  });
  it("keeps the pavements off the crossing road's carriageway and the lines painted on top", () => {
    const paving = verts(meshes, MAT.stone);
    expect(paving.length).toBeGreaterThan(100);
    // Pavement quads are left out where their middle would lie on the other road; corners may touch its edge.
    expect(paving.filter(([x, , z]) => dist(lane, x, z) < 2.5 && dist(road, x, z) > 5.2).length).toBe(0);
    expect(verts(meshes, MAT.asphalt).some(v => Math.abs(v[1] - 5.045) < 1e-3)).toBe(true);
  });
});
