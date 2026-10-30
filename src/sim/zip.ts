// Ziplines (M3-52, U-021): hanging from a line by a hook, a pulley or gloved hands he rides it down, faster on a
// steeper line, and lets go with Ctrl or at its end. Lines are the cables strung between buildings (a live one
// throws him off with a shock unless his gloves are insulated) and the ones he rigs himself: with rope in hand
// and two hooks in the pack, one hook on an anchor in reach, the other thrown up to 40 m to one lower by at least
// 1 in 10.
import { B, DT, type InputFrame, type SimState, type Vec3 } from './types';
import type { World, Line } from '../world/world';
import { movement as M } from '../data/movement';
import { raycast } from '../world/geom';
import { free } from './physics';
import { has, consume } from './inventory';
import { damage } from './body';
import { onUseId } from './use';

/** What he hangs from, best first: its friction along the line. */
const RIDERS: [string, number][] = [['trolley', 0.03], ['pulley', 0.04], ['hook', 0.08], ['grapple', 0.08], ['insgloves', 0.16], ['gloves', 0.16]];
/** His hands above his feet, hanging; how close to a line they must be to take it. */
const HANG = 2.05, REACH = 0.7;
const MAX_LEN = 40, MIN_FALL = 0.1, TOP = 18;

export const allLines = (s: SimState, w: World): Line[] => (s.lines?.length ? w.lines.concat(s.lines) : w.lines);

/** The line's high end, its direction down it, its length and how steep it is (sine). */
function frame(l: Line) {
  const [h, lo] = l.a.y >= l.b.y ? [l.a, l.b] : [l.b, l.a], dx = lo.x - h.x, dy = lo.y - h.y, dz = lo.z - h.z, len = Math.hypot(dx, dy, dz) || 1;
  return { h, dx: dx / len, dy: dy / len, dz: dz / len, len, sin: -dy / len };
}

/** The line in reach of his hands, anywhere from his waist to overhead (stepping off a roof onto a line at his
 *  feet's level), and how far along it from its high end; line -1 if none. */
export function lineInReach(s: SimState, w: World): { line: number; s: number } {
  const p = s.player, lines = allLines(s, w), hx = p.pos.x, hz = p.pos.z;
  let best = -1, bd = REACH, bs = 0;
  lines.forEach((l, i) => {
    const f = frame(l);
    for (const up of [0.9, 1.3, 1.7, HANG]) {
      const hy = p.pos.y + up, t = Math.max(0, Math.min(f.len, (hx - f.h.x) * f.dx + (hy - f.h.y) * f.dy + (hz - f.h.z) * f.dz));
      const d = Math.hypot(hx - f.h.x - f.dx * t, hy - f.h.y - f.dy * t, hz - f.h.z - f.dz * t);
      if (d < bd) { bd = d; best = i; bs = t; }
    }
  });
  return { line: best, s: bs };
}

/** LMB pressed: take a line within reach of his hands; true if that's what happened (a ride or a shock). */
export function tryZip(s: SimState, w: World): boolean {
  const p = s.player, lines = allLines(s, w), { line: best, s: bs } = lineInReach(s, w);
  if (best < 0) return false;
  const rider = RIDERS.find(([id]) => has(s.inv.pack, id));
  if (!rider) { s.events.push({ t: 'msg', text: 'needs a hook, a pulley or gloves' }); return false; }
  if (lines[best].live && !has(s.inv.pack, 'insgloves')) {
    // A live line: the shock throws him off.
    damage(s, 35, 'electrocuted');
    s.events.push({ t: 'hurt', dmg: 35, cause: 'shock' }, { t: 'sfx', id: 'shock' });
    p.vel.x *= -0.3; p.vel.z *= -0.3; p.vel.y = Math.min(p.vel.y, 0);
    p.mode = 'air'; p.onGround = false;
    return true;
  }
  // Where his body would hang is clear (a few metres on, clipped on at a roof's edge, he steps off onto it).
  const f = frame(lines[best]);
  let at = bs;
  while (at < Math.min(f.len, bs + 3) && !free(w.index, f.h.x + f.dx * at, f.h.y + f.dy * at - HANG, f.h.z + f.dz * at, M.height.stand)) at += 0.25;
  if (at >= Math.min(f.len, bs + 3)) return false;
  p.pos.x = f.h.x + f.dx * at; p.pos.y = f.h.y + f.dy * at - HANG; p.pos.z = f.h.z + f.dz * at;
  p.zip = { line: best, s: at, v: Math.max(0, p.vel.x * f.dx + p.vel.y * f.dy + p.vel.z * f.dz) };
  p.mode = 'zip'; p.onGround = false;
  s.events.push({ t: 'sfx', id: 'zip' });
  return true;
}

export function stepZip(s: SimState, w: World, input: InputFrame) {
  const p = s.player, z = p.zip, l = z ? allLines(s, w)[z.line] : null;
  if (!z || !l) { p.mode = 'air'; p.zip = null; return; }
  const f = frame(l), mu = RIDERS.find(([id]) => has(s.inv.pack, id))?.[1] ?? 0.16, cos = Math.sqrt(1 - f.sin * f.sin);
  z.v = Math.max(0, Math.min(TOP, z.v + M.gravity * (f.sin - mu * cos) * DT));
  const ns = z.s + z.v * DT, x = f.h.x + f.dx * ns, y = f.h.y + f.dy * ns - HANG, zz = f.h.z + f.dz * ns;
  // Ctrl lets go; the line's end, or something in the way, drops him off it, still moving.
  const off = (input.pressed & B.CROUCH) || ns >= f.len - 0.4 || !free(w.index, x, y, zz, M.height.stand);
  if (off) {
    p.vel.x = f.dx * z.v; p.vel.y = f.dy * z.v; p.vel.z = f.dz * z.v;
    p.mode = 'air'; p.zip = null; p.fallFrom = p.pos.y;
    return;
  }
  z.s = ns;
  p.pos.x = x; p.pos.y = y; p.pos.z = zz;
  p.vel.x = f.dx * z.v; p.vel.y = f.dy * z.v; p.vel.z = f.dz * z.v;
  p.fallFrom = p.pos.y;
}

/** Rope in hand: the first use sets a hook on an anchor in reach, the second throws the other to rig the line. */
onUseId('rope', (s, w) => {
  const p = s.player, eye: Vec3 = { x: p.pos.x, y: p.pos.y + M.eye[p.posture], z: p.pos.z };
  const dx = -Math.sin(p.yaw) * Math.cos(p.pitch), dy = Math.sin(p.pitch), dz = -Math.cos(p.yaw) * Math.cos(p.pitch);
  if (!has(s.inv.pack, 'hook', 2)) { s.events.push({ t: 'msg', text: 'needs two hooks' }); return; }
  const hit = raycast(w.index, eye.x, eye.y, eye.z, dx, dy, dz, s.rig ? MAX_LEN + 5 : 2.5);
  if (!hit) { s.events.push({ t: 'msg', text: s.rig ? 'nothing to hook there' : 'no anchor in reach' }); return; }
  const at = { x: eye.x + dx * (hit.t - 0.05), y: eye.y + dy * (hit.t - 0.05), z: eye.z + dz * (hit.t - 0.05) };
  if (!s.rig) { s.rig = at; s.events.push({ t: 'msg', text: 'hook set' }); return; }
  const a = s.rig, run = Math.hypot(at.x - a.x, at.z - a.z), len = Math.hypot(run, at.y - a.y);
  if (len > MAX_LEN) { s.events.push({ t: 'msg', text: 'too far' }); return; }
  if (Math.abs(at.y - a.y) < MIN_FALL * run) { s.events.push({ t: 'msg', text: 'not steep enough' }); return; }
  (s.lines ??= []).push({ a, b: at });
  s.rig = null;
  consume(s.inv.pack, 'rope', 1); consume(s.inv.pack, 'hook', 2);
  s.events.push({ t: 'msg', text: 'line rigged' }, { t: 'sfx', id: 'rig' });
});
