// Shared sim types. Everything in SimState is plain JSON data.
import type { Rng } from './rng';

export interface Vec3 { x: number; y: number; z: number }

export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;

/** Button bits for InputFrame.buttons (held) and InputFrame.pressed (went down since the last tick). */
export const B = {
  JUMP: 1, SPRINT: 2, CROUCH: 4, CRAWL: 8, INTERACT: 16, DROP: 32, USE: 64, AIM: 128,
  RELOAD: 256, HEADLAMP: 512,
} as const;

export interface InputFrame {
  /** strafe (right +) and forward (+) axes, -1..1 */
  mx: number;
  my: number;
  /** absolute look angles in radians; yaw 0 looks toward -z (north), positive yaw turns left */
  yaw: number;
  pitch: number;
  buttons: number;
  pressed: number;
  /** hotbar selection this tick (0-5) or -1 for none */
  slot: number;
}

export const emptyInput = (): InputFrame => ({ mx: 0, my: 0, yaw: 0, pitch: 0, buttons: 0, pressed: 0, slot: -1 });

export type SimEvent =
  | { t: 'noise'; x: number; y: number; z: number; r: number; kind: string }
  | { t: 'land'; h: number; roll: boolean; outcome: FallOutcome }
  | { t: 'msg'; text: string };

export interface FallOutcome { damage: number; sprain: boolean; fracture: boolean; arm: boolean; lethal: boolean }

export interface SimState {
  version: number;
  seed: number;
  rng: Rng;
  tick: number;
  player: import('./player').Player;
  /** events emitted during the latest tick */
  events: SimEvent[];
  flags: { god: boolean; noclip: boolean; rain: number };
}
