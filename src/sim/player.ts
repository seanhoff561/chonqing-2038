// The player's state. Movement modes are advanced in move.ts.
import type { Vec3 } from './types';

export type Posture = 'stand' | 'crouch' | 'crawl' | 'hidden';
export type Mode = 'ground' | 'air' | 'action' | 'grip' | 'cling' | 'wallrun' | 'wallclimb' | 'chimney' | 'swim' | 'hidden' | 'zip' | 'dead' | 'noclip';

/** A timed scripted move (mantle, vault, climb-up, entering a box): lerps the feet from a to b. */
export interface Action { kind: string; t: number; dur: number; a: Vec3; b: Vec3; then: Mode; posture: Posture; speed: number }

/** A gripping hand: where, which way the surface faces, what kind, and the lip top when there is one. */
export interface Grip { x: number; y: number; z: number; nx: number; nz: number; kind: 'lip' | 'pipe' | 'rung'; top: number }
export interface Hand { grip: Grip | null }

export interface Player {
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  mode: Mode;
  posture: Posture;
  onGround: boolean;
  /** highest feet height since leaving the ground, for fall outcomes */
  fallFrom: number;
  /** seconds since crouch was last pressed (roll window) */
  crouchAge: number;
  /** grip endurance 0-100; at 0 the hands slip until it recovers */
  endurance: number;
  exhausted: boolean;
  hands: [Hand, Hand];
  /** metres from grip down to the feet while hanging (pulled up small, arms out large) */
  pull: number;
  /** seconds before the hands may grab again (after a dyno or slip) */
  regrab: number;
  /** wall moves used this airtime */
  kicks: number;
  /** seconds the hands have been pulling at their limit */
  strain: number;
  /** seconds Space has been held hanging free from a bar or edge (a muscle-up onto it at grip.muscleUp, U-035) */
  muscle: number;
  /** sideways body shift against the hands from mouse drags (U-005) */
  side: number;
  /** Space still held since a ground jump (released early cuts the jump) */
  jumpHeld: boolean;
  /** cling already used this airtime */
  clung: boolean;
  act: Action | null;
  /** wall normal and timers for hang, wall-run and climbs */
  wall: { nx: number; nz: number; t: number; y: number; id: number };
  breath: number;
  wetUntil: number;
  stepAcc: number;
  crawlToggle: boolean;
  hideId: number;
  /** riding a line (M3-52): which (the world's first, then his own), how far from its high end, how fast */
  zip?: { line: number; s: number; v: number } | null;
  /** seconds left in which a jump still counts after walking off an edge */
  coyote: number;
  /** seconds into a slide, or -1 */
  slide: number;
  /** headlamp (U-019): 0 off, 1 white, 2 red */
  lamp: 0 | 1 | 2;
  /** wrapped in a mylar blanket (M4-06): his heat hidden from thermal sight */
  mylar: boolean;
  /** seconds he's stunned for, a prod's (M4-18); till his next blow or shot (M4-20) */
  stun: number;
  swing: number;
  /** the pistol's kick, radians up, settling (M4-21) */
  kick: number;
  /** where he climbs back out of a hiding spot */
  hideExit: Vec3 | null;
}

export function createPlayer(x: number, y: number, z: number, yaw: number): Player {
  return {
    pos: { x, y, z }, vel: { x: 0, y: 0, z: 0 }, yaw, pitch: 0,
    mode: 'air', posture: 'stand', onGround: false, fallFrom: y, crouchAge: 99,
    endurance: 100, exhausted: false, hands: [{ grip: null }, { grip: null }], pull: 1.5, regrab: 0, kicks: 0, strain: 0, muscle: 0, side: 0, jumpHeld: false, clung: false, act: null,
    wall: { nx: 0, nz: 0, t: 0, y: 0, id: -1 }, breath: 40, wetUntil: 0, stepAcc: 0, crawlToggle: false, hideId: -1, coyote: 0, slide: -1, hideExit: null, lamp: 0, mylar: false, stun: 0, swing: 0, kick: 0,
  };
}

/** Put him somewhere (dev teleports, scenarios, tests) without a fall or a leftover action. */
export function teleport(p: Player, x: number, y: number, z: number) {
  p.pos.x = x; p.pos.y = y; p.pos.z = z;
  p.vel.x = p.vel.y = p.vel.z = 0;
  p.fallFrom = y;
  p.act = null;
  p.hands[0].grip = p.hands[1].grip = null;
  if (p.mode !== 'dead') p.mode = 'air';
  p.onGround = false;
}
