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
  /** UI commands for this tick */
  cmds?: import('./commands').Cmd[];
}

export const emptyInput = (): InputFrame => ({ mx: 0, my: 0, yaw: 0, pitch: 0, buttons: 0, pressed: 0, slot: -1 });

export type SimEvent =
  | { t: 'noise'; x: number; y: number; z: number; r: number; kind: string }
  | { t: 'land'; h: number; roll: boolean; outcome: FallOutcome }
  | { t: 'hurt'; dmg: number; cause: string }
  | { t: 'slept'; from: number; to: number; where: 'bed' | 'collapse' }
  | { t: 'use'; id: string }
  | { t: 'open'; id: string }
  | { t: 'grab'; hand: number; kind: string }
  | { t: 'sfx'; id: string }
  | { t: 'ate'; id: string; sick: boolean }
  | { t: 'msg'; text: string };

export interface FallOutcome { damage: number; sprain: boolean; fracture: boolean; arm: boolean; lethal: boolean }

export interface SimState {
  version: number;
  seed: number;
  rng: Rng;
  tick: number;
  /** game seconds since day 1, 00:00 */
  time: number;
  player: import('./player').Player;
  body: import('./body').Body;
  inv: { pack: import('./inventory').Grid; hotbar: (number | null)[]; held: number };
  /** container grids by id, created when first opened */
  containers: Record<string, import('./inventory').Grid>;
  nextUid: number;
  /** container currently open beside the backpack, or null */
  openContainer: string | null;
  /** interactable id he's looking at, and a running hold-E task */
  target: string | null;
  task: { id: string; t: number; dur: number } | null;
  /** dynamic world state: searched containers, opened doors, removed things */
  wstate: { searched: Record<string, true>; open: Record<string, boolean>; gone: Record<string, true> };
  /** cause of death, or null while alive */
  dead: string | null;
  /** events emitted during the latest tick */
  events: SimEvent[];
  flags: { god: boolean; noclip: boolean; rain: number };
}
