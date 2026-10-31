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
  | { t: 'slept'; from: number; to: number; where: 'bed' | 'rough' | 'collapse' }
  | { t: 'use'; id: string }
  | { t: 'open'; id: string }
  | { t: 'sleep-menu'; id: string }
  | { t: 'grab'; hand: number; kind: string }
  | { t: 'sfx'; id: string }
  | { t: 'ate'; id: string; sick: boolean }
  | { t: 'msg'; text: string }
  /** a line of dialogue (src/data/dialogue) */
  | { t: 'say'; id: string };

/** A stack he dropped (M3-72): lying where he let it go until he picks it up. */
export interface Dropped { stack: import('./inventory').Stack; x: number; y: number; z: number }

/** A piece of furniture he placed: its item id and where it stands. */
export interface Placed { id: string; item: string; x: number; y: number; z: number; yaw: number }

export interface FallOutcome { damage: number; sprain: boolean; fracture: boolean; arm: boolean; lethal: boolean }

export interface Shelter { id: string; x: number; y: number; z: number; battery: number; compromised: boolean }

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
  /** his hideouts (U-013, U-018): every bed he has claimed, where it is, its car battery charge (%) and
   *  whether the machines know where it is */
  shelters: Shelter[];
  /** furniture he has put down: beds, crates */
  placed: Placed[];
  /** things he dropped, lying where they fell */
  dropped: Dropped[];
  /** container currently open beside the backpack, or null */
  openContainer: string | null;
  /** interactable id he's looking at, and a running hold-E task */
  target: string | null;
  task: { id: string; t: number; dur: number } | null;
  /** dynamic world state: searched containers, opened doors, removed things */
  wstate: { searched: Record<string, true>; open: Record<string, boolean>; gone: Record<string, true>; unlocked?: Record<string, true>; benches?: Record<string, true> };
  /** lines he has rigged with rope and hooks (M3-52), and the first hook of one he's rigging */
  lines?: import('../world/world').Line[];
  rig?: Vec3 | null;
  /** cause of death, or null while alive */
  dead: string | null;
  /** events emitted during the latest tick */
  events: SimEvent[];
  flags: { god: boolean; noclip: boolean; rain: number; fog?: number; clear?: boolean };
  /** fog and rain now, 0 to 1 (M3-12): from the seeded schedule, forced up by the dev flags */
  weather: { fog: number; rain: number };
}
