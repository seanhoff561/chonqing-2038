// The player's state. Movement modes are advanced in move.ts.
import type { Vec3 } from './types';

export type Posture = 'stand' | 'crouch' | 'crawl' | 'hidden';
export type Mode = 'ground' | 'air' | 'action' | 'hang' | 'wallrun' | 'wallclimb' | 'climb' | 'swim' | 'hidden' | 'dead' | 'noclip';

/** A timed scripted move (mantle, vault, climb-up, entering a box): lerps the feet from a to b. */
export interface Action { kind: string; t: number; dur: number; a: Vec3; b: Vec3; then: Mode; posture: Posture; speed: number }

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
  stamina: number;
  exhausted: boolean;
  staminaIdle: number;
  act: Action | null;
  /** wall normal and timers for hang, wall-run and climbs */
  wall: { nx: number; nz: number; t: number; y: number; id: number };
  breath: number;
  wetUntil: number;
  stepAcc: number;
  crawlToggle: boolean;
  hideId: number;
  /** seconds left in which a jump still counts after walking off an edge */
  coyote: number;
  /** seconds into a slide, or -1 */
  slide: number;
  /** where he climbs back out of a hiding spot */
  hideExit: Vec3 | null;
}

export function createPlayer(x: number, y: number, z: number, yaw: number): Player {
  return {
    pos: { x, y, z }, vel: { x: 0, y: 0, z: 0 }, yaw, pitch: 0,
    mode: 'air', posture: 'stand', onGround: false, fallFrom: y, crouchAge: 99,
    stamina: 100, exhausted: false, staminaIdle: 0, act: null,
    wall: { nx: 0, nz: 0, t: 0, y: 0, id: -1 }, breath: 40, wetUntil: 0, stepAcc: 0, crawlToggle: false, hideId: -1, coyote: 0, slide: -1, hideExit: null,
  };
}
