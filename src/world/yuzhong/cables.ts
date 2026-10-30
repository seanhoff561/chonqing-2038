// Cables strung across the streets (M3-52, U-021): old power and telephone lines from a higher roof down to a
// lower one across the street, to ride hanging from a hook or a pulley. Some still carry the machines' power and
// throw a man off with a shock. Only where the drop is at least 1 in 10, the run no more than 40 m and nothing
// stands in the way.
import { raycast, overlaps, solid, type Solid, type SolidIndex } from '../geom';
import { MAT } from '../mats';
import { makeRng, hashString, rand } from '../../sim/rng';
import type { Line } from '../world';
import type { Plan } from './lots';

export function cables(plans: Plan[], index: SolidIndex): { lines: Line[]; masts: Solid[] } {
  const lines: Line[] = [], masts: Solid[] = [], rows = new Map<string, Plan[]>();
  for (const p of plans) if (p.row && !p.far) { const a = rows.get(p.row); if (a) a.push(p); else rows.set(p.row, [p]); }
  /** A mast at the middle of a lot's street face, just in from the edge of its roof: its foot, and how high. */
  const edge = (p: Plan, up = 1.2) => { const o = p.obb, c = Math.cos(o.yaw), s = Math.sin(o.yaw), d = o.hd - 0.4; return { x: o.cx - s * d, y: p.wall + up, z: o.cz + c * d }; };
  for (const [row, ps] of rows) {
    const [si, side] = row.split(':');
    if (side !== '1') continue;
    const opposite = rows.get(`${si}:-1`);
    if (!opposite) continue;
    for (const p of ps) {
      const r = makeRng(hashString(`cable${p.seed}`));
      if (rand(r) > 0.6) continue;
      // To the first of the three nearest roofs across the street it can reach (the city's heights vary a lot).
      const near = edge(p), qs = opposite.slice().sort((m, o) => Math.hypot(edge(m).x - near.x, edge(m).z - near.z) - Math.hypot(edge(o).x - near.x, edge(o).z - near.z)).slice(0, 3);
      for (const q of qs) {
        // The high end a mast's height over its roof; the low end on a taller mast, so he hangs clear of the lower
        // roof's edge when he drops off onto it.
        const [hi, lo] = p.wall >= q.wall ? [p, q] : [q, p], a = edge(hi), b = edge(lo, 3.3);
        const run = Math.hypot(b.x - a.x, b.z - a.z), len = Math.hypot(run, b.y - a.y);
        if (len > 40 || run < 6 || Math.abs(b.y - a.y) < 0.1 * run) continue;
        // Clear of everything between the two masts.
        const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len, z: (b.z - a.z) / len }, hit = raycast(index, a.x + d.x * 0.5, a.y + d.y * 0.5, a.z + d.z * 0.5, d.x, d.y, d.z, len - 1);
        if (hit) continue;
        // And the man hanging under it clear too, once he's off the high roof.
        let blocked = false;
        for (let t = 3; t < len - 1 && !blocked; t += 1) { const x = a.x + d.x * t, y = a.y + d.y * t, z = a.z + d.z * t; blocked = overlaps(index, { x0: x - 0.3, y0: y - 2.05, z0: z - 0.3, x1: x + 0.3, y1: y - 0.2, z1: z + 0.3 }); }
        if (blocked) continue;
        lines.push({ a, b, live: rand(r) < 0.2 });
        for (const [e, w] of [[a, hi.wall], [b, lo.wall]] as const) masts.push(solid(e.x - 0.06, w, e.z - 0.06, e.x + 0.06, e.y + 0.15, e.z + 0.06, MAT.metal));
        break;
      }
    }
  }
  return { lines, masts };
}
