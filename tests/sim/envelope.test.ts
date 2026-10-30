// M3-50: re-measures the movement envelope (src/data/envelope.ts) from the sim. Each number is the most that
// succeeds, found to 0.05 m; a movement change that moves one by more than 0.1 m fails here.
import { describe, it, expect } from 'vitest';
import { setup, run, floor, secs, sprintJumpAt, aim, LMB, RMB } from './helpers';
import { solid, rampSolid, type Solid } from '../../src/world/geom';
import { B, type SimEvent, type SimState, type InputFrame } from '../../src/sim/types';
import type { World } from '../../src/world/world';
import { MAT } from '../../src/world/mats';
import { addItem } from '../../src/sim/inventory';
import { ENVELOPE } from '../../src/data/envelope';

/** The highest value that passes, on a 0.05 grid: step down from hi by 0.25 to a pass, then bisect above it. */
function highest(ok: (v: number) => boolean, lo: number, hi: number) {
  const at = (k: number) => +(k * 0.05).toFixed(2), top = Math.round(hi / 0.05);
  let a = top;
  while (a * 0.05 >= lo && !ok(at(a))) a -= 5;
  if (a * 0.05 < lo) return NaN;
  if (a === top) return hi;
  let b = a + 5;
  while (b - a > 1) { const m = (a + b) >> 1; if (ok(at(m))) a = m; else b = m; }
  return at(a);
}

/** Both ends of an entry match the stored envelope within 0.1 m. */
function matches(name: keyof typeof ENVELOPE, comfortable: number, max: number) {
  const e = ENVELOPE[name];
  expect(Math.abs(max - e.max), `${name}.max measured ${max}`).toBeLessThanOrEqual(0.1);
  expect(Math.abs(comfortable - e.comfortable), `${name}.comfortable measured ${comfortable}`).toBeLessThanOrEqual(0.1);
}
const ninety = (v: number) => +(v * 0.9).toFixed(2);

/** A crowbar in hand. */
function holdItem(state: SimState) {
  addItem(state, state.inv.pack, 'crowbar');
  state.inv.hotbar[0] = state.inv.pack.items[0].uid;
  state.inv.held = 1;
}

/** Run 3 s with this input and report whether he stood at height h at some point. */
function standsAt(state: SimState, world: World, h: number, inp: Partial<InputFrame>) {
  let on = false;
  run(state, world, secs(3), inp, s => { on ||= s.player.onGround && Math.abs(s.player.pos.y - h) < 0.02; });
  return on;
}

/** Near platform z >= 0, far platform z <= -gap, both at 0, a pit 10 m down. */
function gapCourse(gap: number, z: number, extra: Solid[] = [], x = 0) {
  return setup([solid(-5, -1, 0, 5, 0, 40), solid(-5, -1, -40, 5, 0, -gap), solid(-20, -12, -60, 20, -10, 60), ...extra], { x, y: 0, z, yaw: 0 });
}
const across = (s: SimState, gap: number) => Math.abs(s.player.pos.y) < 0.01 && s.player.pos.z < -gap;

/** Standing still with his centre `at` m from the edge: W and Space, held through the flight. */
function standingJump(gap: number, at: number) {
  const { world, state } = gapCourse(gap, at);
  run(state, world, 3);
  run(state, world, secs(2), { my: 1, pressed: B.JUMP, buttons: B.JUMP });
  return across(state, gap);
}

/** Sprint, jump once his centre is `at` m from the edge, Space held through the flight. */
function runningJump(gap: number, at: number, item = false) {
  const { world, state } = gapCourse(gap, 30);
  if (item) holdItem(state);
  sprintJumpAt(state, world, at);
  run(state, world, secs(1.5), { my: 1, buttons: B.SPRINT | B.JUMP });
  return across(state, gap);
}

/** Highest rise of the feet in a jump with Space held, from standing or a sprint. */
function apex(sprint: boolean) {
  const { world, state } = setup([floor()], { x: 0, y: 0, z: 30, yaw: 0 });
  run(state, world, 3);
  if (sprint) run(state, world, secs(2), { my: 1, buttons: B.SPRINT });
  let a = 0;
  run(state, world, secs(1.5), { my: sprint ? 1 : 0, pressed: B.JUMP, buttons: B.JUMP | B.SPRINT }, s => { a = Math.max(a, s.player.pos.y); });
  return +a.toFixed(2);
}

/** A wall with its top at h and its face at z = -3, deep enough to stand on; he stands 0.2 m from it. */
function wall(h: number) {
  const r = setup([floor(), solid(-5, 0, -30, 5, h, -3)], { x: 0, y: 0, z: -2.55, yaw: 0 });
  run(r.state, r.world, 3);
  return r;
}

/** W and Space held at the wall, no hands. */
function hop(h: number) {
  const { world, state } = wall(h);
  return standsAt(state, world, h, { my: 1, pressed: B.JUMP, buttons: B.JUMP });
}

/** LMB looking just under the lip, after a jump if `jump`, then W pulls him over. */
function mantle(h: number, jump: boolean) {
  const { world, state } = wall(h);
  if (jump) run(state, world, 1, { pressed: B.JUMP, buttons: B.JUMP });
  for (let i = 0; i < 40 && state.player.mode !== 'grip'; i++) { aim(state, 0, h - 0.1, -3); run(state, world, 1, { buttons: LMB | (jump ? B.JUMP : 0) }); }
  return state.player.mode === 'grip' && standsAt(state, world, h, { buttons: LMB, my: 1 });
}

/** Sprint at the wall, jump 2.4 m from it with Space held, Space `late` ticks after he's 0.55 m from it looking up it, grab. */
function wallKick(h: number, late: number, low: number) {
  const { world, state } = setup([floor(), solid(-5, 0, -30, 5, h, -3)], { x: 0, y: 0, z: 12, yaw: 0 });
  const p = state.player;
  run(state, world, 3);
  for (let i = 0; i < secs(10) && p.pos.z - 0.25 + 3 > 2.4; i++) run(state, world, 1, { my: 1, buttons: B.SPRINT });
  run(state, world, 1, { my: 1, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
  for (let i = 0; i < 60 && p.pos.z >= -2.2; i++) { aim(state, 0, h, -3); run(state, world, 1, { my: 1, buttons: B.JUMP }); }
  aim(state, 0, h, -3);
  run(state, world, late, { my: 1, buttons: B.JUMP });
  run(state, world, 1, { my: 1, buttons: B.JUMP, pressed: B.JUMP });
  for (let i = 0; i < secs(1.2) && p.mode !== 'grip'; i++) { aim(state, 0, h - 0.1 - low, -3); run(state, world, 1, { buttons: LMB }); }
  return p.mode === 'grip' && standsAt(state, world, h, { buttons: LMB, my: 1 });
}

/** The gap course with a wall along his left: sprint, jump `at` m from the edge, Space 47 + `late` ticks later runs along it. */
function startWallRun(gap: number, at: number, late: number, item = false) {
  const r = gapCourse(gap, 30, [solid(-1.2, -10, -40, -1.0, 4, 40)], -0.5);
  if (item) holdItem(r.state);
  sprintJumpAt(r.state, r.world, at);
  run(r.state, r.world, 27 + late, { my: 1, buttons: B.SPRINT | B.JUMP });
  run(r.state, r.world, 1, { my: 1, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP });
  return r;
}
function wallRun(gap: number, at: number, late: number, item = false) {
  const { world, state } = startWallRun(gap, at, late, item);
  run(state, world, secs(2), { my: 1, buttons: B.SPRINT | B.JUMP });
  return across(state, gap);
}
/** ...and 50 + `late` ticks into the wall-run, Space looking up and ahead kicks him off the wall. */
function wallRunKick(gap: number, at: number, late: number) {
  const { world, state } = startWallRun(gap, at, late);
  run(state, world, 50 + late, { my: 1, buttons: B.SPRINT | B.JUMP });
  run(state, world, 1, { my: 1, buttons: B.SPRINT | B.JUMP, pressed: B.JUMP, yaw: Math.atan2(-0.35, Math.sqrt(1 - 0.35 ** 2)), pitch: 1.5 });
  run(state, world, secs(3), { my: 1, buttons: B.SPRINT | B.JUMP, yaw: 0, pitch: 0 });
  return across(state, gap);
}

/** Sprint, then Ctrl at a point where the ground ahead falls away at `grade` (0 for flat): metres slid until he's up. */
function slide(grade: number) {
  const len = grade > 0 ? 600 : 40, drop = grade * len;
  const { world, state } = setup([
    solid(-5, -1, 0, 5, 0, 40), grade > 0 ? rampSolid(-5, -drop - 1, -len, 5, 0, -drop, 0, 3) : solid(-5, -1, -len, 5, 0, 0),
    solid(-20, -drop - 20, -len - 60, 20, -drop - 10, 60),
  ], { x: 0, y: 0.05, z: 20, yaw: 0 });
  for (let i = 0; i < secs(4) && state.player.pos.z > 0.5; i++) run(state, world, 1, { my: 1, buttons: B.SPRINT });
  run(state, world, 1, { my: 1, buttons: B.SPRINT | B.CROUCH, pressed: B.CROUCH });
  const z0 = state.player.pos.z;
  for (let t = 0; t < secs(200) && state.player.slide >= 0; t++) run(state, world, 1, { buttons: B.CROUCH });
  return +(z0 - state.player.pos.z).toFixed(2);
}

/** Walk off a ledge h high onto concrete, or onto a 0.6 m heap of `mat`; Ctrl just before landing if `roll`. Unhurt? */
function unhurt(h: number, roll: boolean, mat = -1) {
  const heap = mat < 0 ? [] : [solid(-2, 0, -12, 2, 0.6, -2, mat)];
  const { world, state } = setup([solid(-5, -1, -30, 5, 0, 30), solid(-5, 0, -2, 5, h, 10), ...heap], { x: 0, y: h, z: 0, yaw: 0 });
  const p = state.player;
  let pressed = false;
  for (let i = 0; i < secs(5); i++) {
    const press = roll && !pressed && !p.onGround && p.pos.y < 0.6 && p.vel.y < 0;
    if (press) pressed = true;
    run(state, world, 1, { my: i < 60 ? 1 : 0, pressed: press ? B.CROUCH : 0 });
    const e = state.events.find(e => e.t === 'land' && e.h > 1) as Extract<SimEvent, { t: 'land' }> | undefined;
    if (e) return e.outcome.damage === 0 && !e.outcome.sprain;
  }
  return false;
}

/** Two bars d apart 2.15 m up over a pit: pump on the first, let go on the way up the front (`late` ticks late), catch the second. */
function lache(d: number, late: number) {
  const { world, state } = setup([
    solid(-4, -1, 0.6, 4, 0, 10), solid(-10, -7, -40, 10, -6, 20), solid(-4, -1, -40, 4, 0, -d - 2),
    solid(-2, 2.1, -0.03, 2, 2.15, 0.03), solid(-2, 2.1, -d - 0.03, 2, 2.15, -d + 0.03),
  ], { x: 0, y: 0, z: 0.9, yaw: 0 });
  const p = state.player;
  run(state, world, 3);
  for (let i = 0; i < 20 && p.mode !== 'grip'; i++) { aim(state, 0, 2.12, 0.03); run(state, world, 1, { buttons: LMB | RMB }); }
  let go = -1, last = -99;
  for (let i = 0; i < secs(14); i++) {
    if (go < 0 && i > secs(4) && p.vel.z < -4 && p.vel.y > 2.5) go = i + late;
    if (go < 0 || i < go) {
      const pump = go < 0 && i - last > 20 && p.vel.z < -0.3;
      if (pump) last = i;
      run(state, world, 1, { buttons: LMB | RMB, yaw: 0, pressed: pump ? B.JUMP : 0 });
      continue;
    }
    aim(state, 0, 2.12, -d + 0.03);
    run(state, world, 1, { buttons: i === go ? 0 : LMB | RMB });
    if (p.mode === 'grip' && (p.hands[0].grip ?? p.hands[1].grip)!.z < -d + 0.5) return true;
    if (p.pos.y < -2) return false;
  }
  return false;
}

const yawTo = (hx: number, hz: number) => Math.atan2(-hx, -hz);

/** Walls 2 m apart with their tops at h: jump at the left one, kick off it, kick off the right one (each looking up and
 *  half away), grab the left lip, W. Each Space `late` ticks late; the grab aimed `low` under the ideal spot. */
function jumpTwoKicks(h: number, late: number, low: number) {
  const { world, state } = setup([floor(), solid(-2, 0, -40, -1, h, 40), solid(1, 0, -40, 2, h, 40)], { x: -0.7, y: 0, z: 20, yaw: 0 });
  const p = state.player, a = Math.sqrt(0.75);
  run(state, world, 3);
  run(state, world, 21 + late, { pressed: B.JUMP, buttons: B.JUMP });
  run(state, world, 33 + late, { pressed: B.JUMP, buttons: B.JUMP, yaw: yawTo(0.5, -a), pitch: 1.5 });
  run(state, world, 1, { pressed: B.JUMP, buttons: B.JUMP, yaw: yawTo(-0.6, -0.8), pitch: 1.5 });
  for (let i = 0; i < secs(1.5); i++) {
    if (p.mode !== 'grip') aim(state, -1, h - 0.1 - low, p.pos.z);
    run(state, world, 1, { buttons: LMB | RMB });
  }
  return standsAt(state, world, h, { buttons: LMB | RMB, my: 1 });
}

/** A tall wall north (face z = -3) and a ledge d behind him with its lip 3 m up: jog at the wall, jump 0.8 m from it,
 *  kick up it, kick back off it looking up, grab the lip, W. Each Space `late` ticks late; the grab aimed `low` under. */
function jumpBackGrab(d: number, late: number, low: number) {
  const { world, state } = setup([floor(), solid(-3, 0, -30, 3, 8, -3), solid(-3, 0, -3 + d, 3, 3, 20)], { x: 0, y: 0, z: -3.3 + d, yaw: 0 });
  const p = state.player;
  run(state, world, 3);
  for (let i = 0; i < secs(3) && p.pos.z - 0.25 > -2.2; i++) run(state, world, 1, { my: 1 });
  run(state, world, 15 + late, { my: 1, pressed: B.JUMP, buttons: B.JUMP });
  run(state, world, 29 + late, { pressed: B.JUMP, buttons: B.JUMP, yaw: 0, pitch: 0 });
  run(state, world, 1, { pressed: B.JUMP, buttons: B.JUMP, yaw: Math.PI, pitch: 1.5 });
  for (let i = 0; i < secs(1.5) && p.mode !== 'grip' && !p.onGround; i++) { aim(state, 0, 2.9 - low, -3 + d); run(state, world, 1, { buttons: LMB | RMB }); }
  return standsAt(state, world, 3, { buttons: LMB | RMB, my: 1 });
}

describe('the movement envelope (M3-50)', () => {
  it('jumps', () => {
    matches('standingJump', highest(g => standingJump(g, 0.45), 1, 3.5), highest(g => standingJump(g, 0.05), 1, 3.5));
    matches('runningJump', highest(g => runningJump(g, 0.45), 4, 7.5), highest(g => runningJump(g, 0.05), 4, 7.5));
    const stand = apex(false), sprint = apex(true);
    matches('standingJumpHeight', ninety(stand), stand);
    matches('runningJumpHeight', ninety(sprint), sprint);
  });
  it('hops, mantles and the run-up wall kick', () => {
    const h = highest(hop, 0.5, 2.5);
    matches('hop', ninety(h), h);
    const stand = highest(v => mantle(v, false), 1, 3), jump = highest(v => mantle(v, true), 2, 3.5);
    matches('mantleStanding', ninety(stand), stand);
    matches('mantleJump', ninety(jump), jump);
    matches('wallKick', highest(v => wallKick(v, 3, 0.1), 2.5, 4.5), highest(v => wallKick(v, 0, 0), 2.5, 4.5));
  });
  it('wall-runs', () => {
    matches('wallRun', highest(g => wallRun(g, 0.45, 3), 8, 14.5), highest(g => wallRun(g, 0.05, 0), 8, 14.5));
  });
  it('slides', () => {
    const flat = slide(0), down = slide(0.2);
    matches('slideFlat', ninety(flat), flat);
    matches('slideDownhill', ninety(down), down);
  });
  it('drops, rolls and soft landings', () => {
    const safe = highest(h => unhurt(h, false), 2, 6), roll = highest(h => unhurt(h, true), 4, 9);
    matches('safeDrop', ninety(safe), safe);
    matches('safeDropRoll', ninety(roll), roll);
    // Onto a 0.6 m heap: the drop counts from its top.
    const bags = +(highest(h => unhurt(h, false, MAT.soft), 4, 11) - 0.6).toFixed(2), awning = +(highest(h => unhurt(h, false, MAT.cloth), 4, 11) - 0.6).toFixed(2);
    matches('softDropBags', ninety(bags), bags);
    matches('softDropAwning', ninety(awning), awning);
  });
  it('laches', () => {
    matches('lache', highest(d => lache(d, 3), 2, 7.5), highest(d => lache(d, 0), 2, 7.5));
  });
  it('chains', () => {
    matches('jumpTwoKicks', highest(h => jumpTwoKicks(h, 3, 0.1), 3, 7), highest(h => jumpTwoKicks(h, 0, 0), 3, 7));
    matches('jumpBackGrab', highest(d => jumpBackGrab(d, 3, 0.1), 5, 10), highest(d => jumpBackGrab(d, 0, 0), 5, 10));
    matches('wallRunKick', highest(g => wallRunKick(g, 0.45, 3), 12, 20), highest(g => wallRunKick(g, 0.05, 0), 12, 20));
  });
  it('holding an item', () => {
    matches('runningJumpItem', highest(g => runningJump(g, 0.45, true), 4, 7.5), highest(g => runningJump(g, 0.05, true), 4, 7.5));
    matches('wallRunItem', highest(g => wallRun(g, 0.45, 3, true), 8, 14.5), highest(g => wallRun(g, 0.05, 0, true), 8, 14.5));
  });
});
