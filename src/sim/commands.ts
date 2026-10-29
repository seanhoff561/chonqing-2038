// UI commands (backpack moves, hotbar binds, item use) travel in input frames so the sim stays authoritative.
import type { SimState } from './types';
import type { World } from '../world/world';
import type { Grid } from './inventory';
import { moveStack } from './inventory';

export type Cmd =
  | { c: 'move'; from: string; to: string; uid: number; x: number; y: number; rot: boolean }
  | { c: 'bind'; slot: number; uid: number | null }
  | { c: 'use'; uid: number }
  | { c: 'drop'; uid: number }
  | { c: 'act'; name: string; arg?: string | number };

/** 'pack' or a container id. */
export function gridRef(s: SimState, ref: string): Grid | null {
  return ref === 'pack' ? s.inv.pack : s.containers[ref] ?? null;
}

type Handler = (s: SimState, cmd: Cmd, w: World) => void;
const handlers: Handler[] = [];
/** Other systems (use, drop, crafting) register here. */
export const onCmd = (h: Handler) => { handlers.push(h); };

export function applyCmds(s: SimState, w: World, cmds: Cmd[] | undefined) {
  if (!cmds) return;
  for (const cmd of cmds) {
    if (cmd.c === 'move') {
      const from = gridRef(s, cmd.from), to = gridRef(s, cmd.to);
      if (from && to && (cmd.to === 'pack' || cmd.from === 'pack' || cmd.from === cmd.to || s.openContainer === cmd.to || s.openContainer === cmd.from)) moveStack(from, to, cmd.uid, cmd.x, cmd.y, cmd.rot);
    } else if (cmd.c === 'bind') {
      if (cmd.slot >= 0 && cmd.slot < s.inv.hotbar.length) {
        s.inv.hotbar = s.inv.hotbar.map(u => (u === cmd.uid ? null : u));
        s.inv.hotbar[cmd.slot] = cmd.uid;
      }
    }
    for (const h of handlers) h(s, cmd, w);
  }
}
