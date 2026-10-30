// Climbing lines up the towers (M3-57a, U-023): from the street to the roof, every hold a generated one. Steel
// stubs left out of the facade 1.6 to 2 m apart, a dyno each (from the envelope), swinging left and right;
// every half-dozen a broken floor: the torn edge of a slab over a hole knocked into the building, to reach up to,
// mantle into, crouch out of sight and get the grip back; from its edge the next stub is a jump and a grab away.
// Halfway up the tallest, beside one of those floors, a vantage platform high over the street. Hard by design: no rest between the broken
// floors, every other stretch at the longest dyno.
import { carve } from '../geom';
import { MAT } from '../mats';
import { rand, type Rng } from '../../sim/rng';
import { sides, onFace, faceXZ } from './climb';
import type { Lot, Fabric } from './buildings';

/** Stubs between broken floors; the first stub out of a floor, over its hole (a jump and a grab); the floor's slab
 *  (proud of the wall), its hole, and how far over the last stub it is (a reach while hanging). */
const RUN = 6, OUT = 2.4, HOLE = 2.2, LEDGE = 0.25, REACH = 1.0;

/** A block of the building: its footprint, the floor at its foot, its roof, and the top of its edge (a parapet). */
export interface Block { x0: number; z0: number; x1: number; z1: number; y0: number; y1: number; top: number }

/** A climbing line up `face` (north, south, west, east) of each block in turn, at `u` along it; features in one
 *  group: 'route' stubs, 'rest' floors, 'vantage' (one on lines over 80 m), 'routeTop' each block's edge. */
export function climbLine(l: Lot, blocks: Block[], face: number, at: number, r: Rng, out: Fabric) {
  const group = out.features.length, tall = blocks[blocks.length - 1].y1 - blocks[0].y0 > 80;
  let vantage = !tall, n = 0;
  for (const b of blocks) {
    const s = sides({ ...l, ...b })[face];
    let u = Math.max(s.a + 3.5, Math.min(s.b - 3.5, at)), shift = 1;
    const stub = (y: number, c: number) => {
      // Proud of the wall by a hand's width only, so his feet find the wall under it to push off.
      out.solids.push(onFace(s, c - 0.3, c + 0.3, 0, 0.14, y - 0.12, y, MAT.metal));
      out.features.push({ kind: 'route', ...faceXZ(s, c, 0.14), y, group, nx: s.nx, nz: s.nz });
    };
    let y = b.y0 + OUT, side = 1, hard = false, last = b.y0;
    while (y < b.top - 1.9) {
      stub(y, u + side * 0.35);
      last = y; side = -side; n++;
      const step = hard ? 2.0 : 1.6 + rand(r) * 0.3;
      if (n % RUN === 0 && y + REACH + OUT < b.top - 2) {
        // A broken floor a reach over the last stub: the cornice left of it to grab (his eyes outside its edge),
        // the hole behind to mantle into and crouch in.
        // Over it the line carries on beside the hole (his feet need wall to push off, not an opening), the cornice
        // running on under where it starts.
        y += REACH;
        const nu = Math.max(s.a + 3.5, Math.min(s.b - 3.5, u + shift * 1.65));
        out.solids.push(onFace(s, Math.min(u - 1.5, nu - 0.5), Math.max(u + 1.5, nu + 0.5), -2, LEDGE, y - 0.25, y, MAT.concrete));
        out.solids.splice(0, out.solids.length, ...carve(out.solids, onFace(s, u - 1.3, u + 1.3, -2, 0.02, y + 0.001, y + HOLE, 0)));
        if (!vantage && y > b.y0 + (b.y1 - b.y0) * 0.5 && y > 60) {
          // Halfway up a tall one, a platform out beside it, railed, to look down from.
          vantage = true;
          out.solids.push(onFace(s, u + 1.5, u + 5.5, 0, 2.6, y - 0.25, y, MAT.concrete));
          // A railing of bars: posts, a mid rail and a top rail along its edge and its far end.
          for (const [a, b] of [[1.02, 1.06], [0.5, 0.54]]) out.decor.push(onFace(s, u + 1.5, u + 5.5, 2.54, 2.6, y + a, y + b, MAT.metal), onFace(s, u + 5.44, u + 5.5, 0, 2.6, y + a, y + b, MAT.metal));
          for (let c = u + 1.55; c < u + 5.5; c += 1.3) out.decor.push(onFace(s, c - 0.03, c + 0.03, 2.54, 2.6, y, y + 1.02, MAT.metal));
          for (const d of [0.9, 1.8]) out.decor.push(onFace(s, u + 5.44, u + 5.5, d - 0.03, d + 0.03, y, y + 1.02, MAT.metal));
          out.features.push({ kind: 'vantage', ...faceXZ(s, u + 3.5, 2), y, group, nx: s.nx, nz: s.nz });
        }
        out.features.push({ kind: 'rest', ...faceXZ(s, u, LEDGE), y, group, nx: s.nx, nz: s.nz });
        last = y; y += OUT; hard = !hard; u = nu; side = shift; shift = -shift;
        continue;
      }
      y += step;
    }
    // Stubs on up to within a dyno of the edge.
    while (b.top - last > 1.9) { last = Math.min(last + 1.9, b.top - 1.6); stub(last, u + side * 0.35); side = -side; }
    // The block's edge: its parapet, or a setback's roof.
    out.features.push({ kind: 'routeTop', ...faceXZ(s, u, 0), y: b.top, group, nx: s.nx, nz: s.nz });
  }
}
