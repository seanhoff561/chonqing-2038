// Hand climbing (U-002/U-003): hold left or right mouse to grip a lip, sill, pipe or rung within reach.
// While gripping he hangs and reels toward the grip; W pulls up (and over a lip), S lets the arms out,
// Space launches a leg-driven dyno, Q or releasing both buttons drops. Grip endurance drains while hanging.
// Grabbing keeps momentum; the hands can only pull so hard (see stepGrip).
import { B, DT, type InputFrame, type SimState } from './types';
import type { World } from '../world/world';
import type { Player, Grip } from './player';
import { movement as M } from '../data/movement';
import { raycast, topAt } from '../world/geom';
import { free, moveHorizontal, moveVertical, groundGap } from './physics';
import { startAction, kickOff } from './parkour';
import { lim, sfx, lookDelta } from './move';

const HW = M.width / 2;
const G = M.grip;
const BITS = [B.USE, B.AIM];

const eyeY = (p: Player) => p.pos.y + M.eye[p.posture];
function lookDir(p: Player) {
  const c = Math.cos(p.pitch);
  return { x: -Math.sin(p.yaw) * c, y: Math.sin(p.pitch), z: -Math.cos(p.yaw) * c };
}

/** The grip under the reticle, if a hand could take it from where his body is. */
export function findGrab(world: World, p: Player): Grip | null {
  const ex = p.pos.x, ey = eyeY(p), ez = p.pos.z, d = lookDir(p);
  let best: Grip | null = null, bestT = G.rayReach;
  // Pipes and ladders: nearest point of the look ray to the vertical bar.
  const hl = d.x * d.x + d.z * d.z;
  if (hl > 1e-6) for (const c of world.climbables) {
    const cx = c.x + c.nx * 0.08, cz = c.z + c.nz * 0.08;
    const t = Math.max(0, Math.min(bestT, ((cx - ex) * d.x + (cz - ez) * d.z) / hl));
    const px = ex + d.x * t, pz = ez + d.z * t, py = ey + d.y * t;
    if (Math.hypot(px - cx, pz - cz) > G.pipeRadius || py < c.y0 || py > c.y1) continue;
    bestT = t;
    best = { x: cx, y: py, z: cz, nx: c.nx, nz: c.nz, kind: c.kind === 'ladder' ? 'rung' : 'pipe', top: c.y1 };
  }
  const h = raycast(world.index, ex, ey, ez, d.x, d.y, d.z, bestT);
  if (h) {
    const s = world.index.solids[h.id];
    const hx = ex + d.x * h.t, hy = ey + d.y * h.t, hz = ez + d.z * h.t;
    best = null;
    if (Math.abs(h.ny) < 0.5) {
      // A wall face just below its top edge is a lip, if nothing sits on the edge.
      const top = topAt(s, hx, hz);
      if (top - hy <= G.lipDepth && free(world.index, hx - h.nx * 0.07, top + 0.02, hz - h.nz * 0.07, 0.3, 0.05))
        best = { x: hx, y: top, z: hz, nx: h.nx, nz: h.nz, kind: 'lip', top };
    } else if (h.ny > 0.7 && !s.ramp) {
      // On a top surface near an edge facing him: grip that edge.
      const edges = [
        { dist: hx - s.x0, nx: -1, nz: 0, x: s.x0, z: hz }, { dist: s.x1 - hx, nx: 1, nz: 0, x: s.x1, z: hz },
        { dist: hz - s.z0, nx: 0, nz: -1, x: hx, z: s.z0 }, { dist: s.z1 - hz, nx: 0, nz: 1, x: hx, z: s.z1 },
      ].filter(e => e.dist <= G.edgeBand && Math.abs(e.nx * d.x + e.nz * d.z) > 0.2).sort((a, b) => a.dist - b.dist);
      const e = edges[0];
      if (e && free(world.index, e.x + e.nx * 0.2, s.y1 - 0.5, e.z + e.nz * 0.2, 0.45, 0.1))
        best = { x: e.x, y: s.y1, z: e.z, nx: e.nx, nz: e.nz, kind: 'lip', top: s.y1 };
    }
  }
  if (!best) return null;
  const rel = best.y - p.pos.y;
  // Waist height and up; crouched at an edge he can grab the lip under him to climb down.
  if (rel < (p.posture === 'crouch' ? G.lowestCrouched : G.lowest) || rel > G.heightReach) return null;
  return best;
}

const gripping2 = (p: Player) => p.hands[0].grip !== null && p.hands[1].grip !== null;
export const gripping = (p: Player) => p.hands[0].grip !== null || p.hands[1].grip !== null;

export function releaseAll(p: Player, regrab = 0) {
  p.hands[0].grip = p.hands[1].grip = null;
  p.regrab = Math.max(p.regrab, regrab);
  if (p.mode === 'grip') { p.mode = 'air'; p.onGround = false; p.fallFrom = p.pos.y; }
}

/** Every tick before the mode update: hands follow their buttons and grab what's under the reticle. */
export function stepHands(s: SimState, world: World, input: InputFrame) {
  const p = s.player, L = lim();
  p.regrab = Math.max(0, p.regrab - DT);
  if (!gripping(p)) {
    p.endurance = Math.min(M.endurance.max, p.endurance + M.endurance.regen * DT);
    if (p.exhausted && p.endurance >= M.endurance.recover) p.exhausted = false;
  }
  const busy = p.mode === 'action' || p.mode === 'hidden' || p.mode === 'dead' || p.mode === 'noclip';
  for (let i = 0; i < 2; i++) {
    const h = p.hands[i];
    if (busy || !(input.buttons & BITS[i])) { h.grip = null; continue; }
    if (h.grip || p.regrab > 0 || !L.hang || p.exhausted || p.posture === 'crawl') continue;
    const g = findGrab(world, p);
    if (!g) continue;
    // Two hands on one lip sit a shoulder-width apart.
    const o = p.hands[1 - i].grip;
    if (o && g.kind === 'lip' && Math.hypot(o.x - g.x, o.z - g.z) < 0.25) {
      const side = i === 0 ? -0.18 : 0.18;
      g.x = o.x + g.nz * side * 2 - (o.x - g.x); g.z = o.z - g.nx * side * 2 - (o.z - g.z);
    }
    h.grip = g;
    input.pressed &= ~BITS[i];
    s.inv.held = 0; // climbing stows whatever was in his hand
    if (p.mode !== 'grip') {
      p.mode = 'grip';
      p.onGround = false;
      p.strain = 0;
      p.slide = -1;
      if (p.posture !== 'stand' && free(world.index, p.pos.x, p.pos.y + 1e-3, p.pos.z, M.height.stand)) p.posture = 'stand';
      p.pull = Math.max(G.pullMin, Math.min(G.hangMax, g.y - p.pos.y));
      p.side = 0;
    }
    p.kicks = 0;
    s.events.push({ t: 'grab', hand: i, kind: g.kind });
    sfx(s, gripping2(p) ? 'grab2' : 'grab');
  }
  if (p.mode === 'grip' && !gripping(p)) { releaseAll(p); sfx(s, 'release'); }
}

let curWorld: World | null = null;

export function stepGrip(s: SimState, world: World, input: InputFrame) {
  curWorld = world;
  const p = s.player, L = lim();
  const grips = p.hands.map(h => h.grip).filter((g): g is Grip => g !== null);
  if (!grips.length) { releaseAll(p); return; }
  const scale = (grips.every(g => g.kind === 'rung') ? G.ladderScale : 1) / L.climbScale;
  p.endurance -= (grips.length > 1 ? G.drainTwo : G.drainOne) * scale * DT;
  if (p.endurance <= 0) { p.endurance = 0; p.exhausted = true; releaseAll(p, 0.5); sfx(s, 'slip'); return; }
  if (input.pressed & B.DROP) { releaseAll(p, 0.4); sfx(s, 'release'); return; }
  // He hangs and pulls from the higher hand; sideways he sits between them.
  const ax = grips.reduce((a, g) => a + g.x, 0) / grips.length, ay = Math.max(...grips.map(g => g.y)), az = grips.reduce((a, g) => a + g.z, 0) / grips.length;
  let nx = grips.reduce((a, g) => a + g.nx, 0), nz = grips.reduce((a, g) => a + g.nz, 0);
  const nl = Math.hypot(nx, nz) || 1;
  nx /= nl; nz /= nl;
  // Over the top: the highest lip, once he's pulled up far enough.
  const lip = grips.reduce<Grip | null>((a, g) => (!a || g.top > a.top ? g : a), null)!;
  const atTop = lip.kind === 'lip' || lip.y >= lip.top - 0.3;
  if (atTop && p.pos.y >= lip.top - L.mantleFrom - 1e-3 && ((input.buttons & B.JUMP) || input.my > 0) && (input.my > 0 || (input.pressed & B.JUMP))) {
    const back = lip.kind === 'lip' ? HW + 0.05 : HW + 0.12;
    const b = { x: lip.x - lip.nx * back, y: lip.top + 1e-3, z: lip.z - lip.nz * back };
    if (free(world.index, b.x, b.y, b.z, M.height.crouch) && free(world.index, p.pos.x, Math.max(p.pos.y, lip.top) + 1e-3, p.pos.z, M.height.crouch)) {
      p.hands[0].grip = p.hands[1].grip = null;
      startAction(p, 'climbup', G.climbTime, b, 'ground', 'crouch', 0);
      sfx(s, 'pullover');
      s.events.push({ t: 'noise', x: p.pos.x, y: p.pos.y, z: p.pos.z, r: M.noise.mantle, kind: 'mantle' });
      return;
    }
  }
  // Feet on the wall below the hands? Then Space pushes off; without footing it pumps a swing (U-005).
  const foothold = !!raycast(world.index, p.pos.x, p.pos.y + 0.45, p.pos.z, -nx, 0, -nz, HW + 0.45);
  const look = lookDelta();
  if ((input.pressed & B.JUMP) && L.jumpScale > 0 && foothold) {
    releaseAll(p, G.regrab);
    const { hx, hz } = { hx: -Math.sin(p.yaw), hz: -Math.cos(p.yaw) };
    if (-(hx * nx + hz * nz) > 0.3 || p.pitch > M.wallKick.upPitch) {
      p.vel.y = G.dynoUp * Math.sqrt(L.jumpScale);
      p.vel.x = -nx * 0.3; p.vel.z = -nz * 0.3;
      sfx(s, 'dyno');
    } else kickOff(s, nx, nz);
    s.events.push({ t: 'noise', x: p.pos.x, y: p.pos.y, z: p.pos.z, r: M.noise.vault, kind: 'dyno' });
    return;
  }
  // Mouse drags move the body against the hands (U-005): down hauls him up, sideways shifts him.
  if (L.pull) {
    if (input.my > 0) p.pull -= G.pullSpeed * L.climbScale * DT;
    else if (input.my < 0) p.pull += G.pullSpeed * DT;
    p.pull += look.dPitch * G.mousePull;
  }
  p.pull = Math.max(G.pullMin, Math.min(G.hangMax, p.pull));
  p.side = Math.max(-G.sideMax, Math.min(G.sideMax, p.side - look.dYaw * G.mousePull));
  const two = grips.length > 1, cap = two ? G.capTwo : G.capOne;
  // Free hanging (no wall under the feet, body well below the hands) swings; anything else is the spring.
  if (!foothold && p.pos.y < ay - 1.2) {
    swing(s, ax, ay, az, input, look.dYaw, cap);
    return;
  }
  // The hands are a force-limited spring toward the hanging spot (U-004): momentum carries through,
  // one hand holds his weight when slow but slips after redirecting him when fast, two hands stop him.
  const sx = p.side * Math.cos(p.yaw), sz = -p.side * Math.sin(p.yaw); // along the camera's right
  const tx = ax + nx * G.wallGap + sx, ty = ay - p.pull, tz = az + nz * G.wallGap + sz;
  const k = G.spring, c = 2 * Math.sqrt(k);
  // The spring pulls at most a reach's worth (0.3 m of error); hands pull, gravity does the lowering.
  let ex = tx - p.pos.x, ez = tz - p.pos.z;
  const ey = Math.max(-0.3, Math.min(0.3, ty - p.pos.y)), eh = Math.hypot(ex, ez);
  if (eh > 0.3) { ex *= 0.3 / eh; ez *= 0.3 / eh; }
  let fx = k * ex - c * p.vel.x, fy = Math.max(0, k * ey - c * p.vel.y + M.gravity), fz = k * ez - c * p.vel.z;
  // Feet on the ground carry his weight, so only the sideways pull loads the hands then.
  const supported = groundGap(world.index, p.pos, 0.03) !== Infinity;
  const load = supported ? Math.hypot(fx, fz) : Math.hypot(fx, fy, fz);
  const f = Math.hypot(fx, fy, fz);
  if (f > cap) { fx *= cap / f; fy *= cap / f; fz *= cap / f; }
  if (load > cap) p.strain += DT;
  else p.strain = Math.max(0, p.strain - DT);
  p.vel.x += fx * DT; p.vel.y += (fy - M.gravity) * DT; p.vel.z += fz * DT;
  if (p.strain > (two ? G.strainTwo : G.strainOne)) {
    p.strain = 0;
    releaseAll(p, G.regrab);
    sfx(s, 'slip');
    return;
  }
  const blocked = moveHorizontal(world.index, p.pos, M.height.stand, p.vel.x * DT, p.vel.z * DT, 0.05);
  if (blocked & 1) p.vel.x = 0;
  if (blocked & 2) p.vel.z = 0;
  if (moveVertical(world.index, p.pos, M.height.stand, p.vel.y * DT) !== 0) p.vel.y = 0;
  p.fallFrom = p.pos.y;
  // A hand whose hold has drifted out of reach lets go.
  for (const h of p.hands) if (h.grip && Math.hypot(h.grip.x - p.pos.x, h.grip.y - eyeY(p), h.grip.z - p.pos.z) > G.rayReach + 0.8) h.grip = null;
  if (!gripping(p)) releaseAll(p);
}

/**
 * Hanging free from a bar or beam: a pendulum around the grip (arms as the rope). Space pumps toward
 * where he looks; letting go mid-swing keeps the velocity (a lache). The grip still has a force limit.
 */
function swing(s: SimState, ax: number, ay: number, az: number, input: InputFrame, dYaw: number, cap: number) {
  const p = s.player, world = curWorld!;
  // Hanging free, his head has to stay under the bar.
  p.pull = Math.max(p.pull, M.height.stand + 0.1);
  if (input.pressed & B.JUMP) {
    const hx = -Math.sin(p.yaw), hz = -Math.cos(p.yaw);
    p.vel.x += hx * G.pump; p.vel.z += hz * G.pump;
    sfx(s, 'pump');
  }
  // Sideways mouse drags add a little swing too.
  p.vel.x += Math.cos(p.yaw) * -dYaw * G.mouseSwing; p.vel.z += -Math.sin(p.yaw) * -dYaw * G.mouseSwing;
  const hs = Math.hypot(p.vel.x, p.vel.z);
  if (hs > G.swingMax) { p.vel.x *= G.swingMax / hs; p.vel.z *= G.swingMax / hs; }
  p.vel.y -= M.gravity * DT;
  p.vel.x *= 1 - G.swingDamp * DT; p.vel.z *= 1 - G.swingDamp * DT;
  let x = p.pos.x + p.vel.x * DT, y = p.pos.y + p.vel.y * DT, z = p.pos.z + p.vel.z * DT;
  // Keep the feet on a sphere of radius `pull` around the grip; remove the radial velocity.
  let dx = x - ax, dy = y - ay, dz = z - az;
  const d = Math.hypot(dx, dy, dz) || 1;
  dx /= d; dy /= d; dz /= d;
  const vr = p.vel.x * dx + p.vel.y * dy + p.vel.z * dz;
  // The pull the hands must hold: centripetal plus gravity along the arms.
  const v2 = p.vel.x ** 2 + p.vel.y ** 2 + p.vel.z ** 2 - vr * vr;
  const need = v2 / p.pull - M.gravity * dy;
  if (need > cap) { p.strain += DT; if (p.strain > G.strainOne) { p.strain = 0; releaseAll(p, G.regrab); sfx(s, 'slip'); return; } }
  else p.strain = Math.max(0, p.strain - DT);
  p.vel.x -= vr * dx; p.vel.y -= vr * dy; p.vel.z -= vr * dz;
  const hs2 = Math.hypot(p.vel.x, p.vel.z);
  if (hs2 > G.swingMax) { p.vel.x *= G.swingMax / hs2; p.vel.z *= G.swingMax / hs2; }
  x = ax + dx * p.pull; y = ay + dy * p.pull; z = az + dz * p.pull;
  const mx = x - p.pos.x, mz = z - p.pos.z;
  const blocked = moveHorizontal(world.index, p.pos, M.height.stand, mx, mz, 0.05);
  if (blocked & 1) p.vel.x = 0;
  if (blocked & 2) p.vel.z = 0;
  if (moveVertical(world.index, p.pos, M.height.stand, y - p.pos.y) !== 0) p.vel.y = 0;
  p.fallFrom = p.pos.y;
}
