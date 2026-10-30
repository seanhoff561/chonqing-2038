// Over the skyline (U-036): where a tower rises clear of everything round it, its walls hold more, a way up for
// whoever looks for it. Not a line of anything: what any wall carries (sills, AC units, beam ends, a stretch of
// ledge), wandering across a face, round a corner on a ledge, over a setback; and patches off it that lead
// nowhere (a run of sills, a broken pipe). From a hold the next is a reach or a dyno; from a ledge or a setback's
// roof, a jump and a grab (from the envelope). Features 'route' (a hold), 'rest' (a ledge to pull onto) and
// 'routeTop' (a block's edge) in one group, in climbing order.
import { MAT } from '../mats';
import { rand, randInt, type Rng } from '../../sim/rng';
import { ENVELOPE as E } from '../../data/envelope';
import { sides, onFace, faceXZ, type Side } from './climb';
import type { Lot, Fabric } from './buildings';
import type { Block } from './routes';

/** The most between holds from hanging (a dyno) and from standing (a jump and a grab, under mantleJump). */
const DYNO = 2.0, JUMP = E.mantleJump.comfortable - 0.1;
const LEDGE = 0.6;

type P = { x: number; y: number; z: number };

/** A way up from `from` (the first hold, out of reach of the roofs round it) to the top of the last block; the
 *  points along it, to keep anything else clear of. */
export function skyward(l: Lot, blocks: Block[], from: number, r: Rng, out: Fabric): P[] {
  const held: P[] = [];
  let i = blocks.findIndex(b => b.top - 4 > from);
  if (i < 0) return held;
  const group = out.features.length;
  const at = (b: Block) => sides({ ...l, ...b });
  let b = blocks[i], face = randInt(r, 4), s = at(b)[face];
  if (s.b - s.a < 6) return held;
  let u = s.a + 2 + rand(r) * (s.b - s.a - 4), y = Math.max(from, b.y0 + JUMP), stand = false;
  const hold = (s: Side, c: number, y: number) => {
    const k = rand(r);
    let d: number;
    if (k < 0.4) {
      // A window's sill.
      out.solids.push(onFace(s, c - 0.5, c + 0.5, 0, 0.14, y - 0.1, y, MAT.concrete));
      out.decor.push(onFace(s, c - 0.4, c + 0.4, 0, 0.02, y, y + 1.1, MAT.glass));
      d = 0.14;
    } else if (k < 0.75) {
      // An AC unit, its grille out.
      out.solids.push(onFace(s, c - 0.375, c + 0.375, 0, 0.4, y - 0.5, y, MAT.metal));
      out.decor.push(onFace(s, c - 0.28, c + 0.12, 0.4, 0.42, y - 0.44, y - 0.06, MAT.tealMetal));
      d = 0.4;
    } else {
      // A steel beam's end left sticking out.
      d = 0.6 + rand(r) * 0.4;
      out.solids.push(onFace(s, c - 0.13, c + 0.13, 0, d, y - 0.3, y, MAT.metal));
    }
    const p = faceXZ(s, c, d);
    out.features.push({ kind: 'route', ...p, y, group, nx: s.nx, nz: s.nz });
    held.push({ ...p, y });
  };
  hold(s, u, y);
  for (let guard = 0; guard < 300; guard++) {
    if (b.top - y <= (stand ? JUMP : DYNO)) {
      // The block's edge: the parapet, or a setback's roof to stand on and go on up the next block from.
      out.features.push({ kind: 'routeTop', ...faceXZ(s, u, 0), y: b.top, group, nx: s.nx, nz: s.nz });
      if (++i >= blocks.length) break;
      b = blocks[i]; s = at(b)[face]; u = Math.max(s.a + 1.5, Math.min(s.b - 1.5, u)); y = b.y0; stand = true;
      continue;
    }
    const ny = y + (stand ? JUMP - 0.45 + rand(r) * 0.4 : 1.55 + rand(r) * 0.45);
    if (stand || rand(r) > 0.18 || s.b - s.a < 8) {
      // A hold up and a little aside (from a ledge's end, straight up).
      if (!stand) u = Math.max(s.a + 0.8, Math.min(s.b - 0.8, u + (rand(r) - 0.5) * 1.4));
      hold(s, u, ny);
      y = ny; stand = false;
      continue;
    }
    // A stretch of ledge to pull up onto and walk along; run out to a corner it wraps round onto the next face.
    const dir = rand(r) < 0.5 ? -1 : 1, end = u + dir * (3 + rand(r) * 4);
    out.features.push({ kind: 'rest', ...faceXZ(s, u, LEDGE), y: ny, group, nx: s.nx, nz: s.nz });
    held.push({ ...faceXZ(s, u, LEDGE), y: ny });
    const ledge = (s: Side, c0: number, c1: number) => {
      out.solids.push(onFace(s, Math.min(c0, c1), Math.max(c0, c1), 0, LEDGE, ny - 0.2, ny, MAT.concrete));
      for (let k = 0, n = Math.ceil(Math.abs(c1 - c0) / 1.5); k <= n; k++) held.push({ ...faceXZ(s, c0 + ((c1 - c0) * k) / n, LEDGE), y: ny });
    };
    if (end > s.a + 1 && end < s.b - 1) {
      ledge(s, u - dir * 0.5, end);
      u = end - dir * 0.4;
    } else {
      const atA = dir < 0, nf = s.nz !== 0 ? (atA ? 2 : 3) : (atA ? 0 : 1), ns = at(b)[nf];
      const start = face === 0 || face === 2 ? ns.a : ns.b, sign = start === ns.a ? 1 : -1, wrap = 1.6 + rand(r) * 1.4;
      ledge(s, u - dir * 0.5, atA ? s.a - LEDGE : s.b + LEDGE);
      ledge(ns, start, start + sign * wrap);
      face = nf; s = ns; u = start + sign * (wrap - 0.5);
    }
    y = ny; stand = true;
  }
  // Patches that lead nowhere, clear of the way up.
  const clear = (p: { x: number; z: number }, y0: number, y1: number) => held.every(h => Math.hypot(h.x - p.x, h.z - p.z) > 3 || h.y < y0 - 3 || h.y > y1 + 3);
  for (let k = 0, n = Math.floor((blocks[blocks.length - 1].top - from) / 12); k < n; k++) {
    const bb = blocks[Math.max(0, randInt(r, blocks.length))], ss = at(bb)[randInt(r, 4)];
    if (ss.b - ss.a < 4 || bb.top - 3 < Math.max(from, bb.y0 + JUMP)) continue;
    const c = ss.a + 1 + rand(r) * (ss.b - ss.a - 2), y0 = Math.max(from, bb.y0 + JUMP) + rand(r) * (bb.top - 3 - Math.max(from, bb.y0 + JUMP));
    if (rand(r) < 0.35) {
      // A length of broken downpipe.
      const y1 = Math.min(bb.top - 1.5, y0 + 3 + rand(r) * 3), p = faceXZ(ss, c, 0.06);
      if (!clear(p, y0, y1)) continue;
      out.climbables.push({ kind: 'pipe', x: p.x, z: p.z, y0, y1, nx: ss.nx, nz: ss.nz });
      out.features.push({ kind: 'pipe', x: p.x, y: y0, z: p.z, group: out.features.length });
      out.decor.push(onFace(ss, c - 0.08, c + 0.08, 0, 0.12, y0, y1, MAT.metal));
      for (let y = y1 - 0.4; y > y0 + 0.3; y -= 2.5) out.decor.push(onFace(ss, c - 0.1, c + 0.1, 0, 0.16, y, y + 0.05, MAT.metal));
    } else {
      // Two or three sills and AC units, each a reach over the last.
      if (!clear(faceXZ(ss, c, 0), y0, y0 + 4)) continue;
      const g = out.features.length;
      for (let m = 2 + randInt(r, 2), y = y0, cc = c; m > 0 && bb.top - y > 1.5; m--, y += 1.5 + rand(r) * 0.4) {
        const ac = rand(r) < 0.45;
        out.solids.push(ac ? onFace(ss, cc - 0.375, cc + 0.375, 0, 0.4, y - 0.5, y, MAT.metal) : onFace(ss, cc - 0.5, cc + 0.5, 0, 0.14, y - 0.1, y, MAT.concrete));
        out.features.push({ kind: ac ? 'ac' : 'sill', ...faceXZ(ss, cc, 0), y, group: g });
        cc = Math.max(ss.a + 0.6, Math.min(ss.b - 0.6, cc + (rand(r) - 0.5) * 1.2));
      }
    }
  }
  return held;
}
