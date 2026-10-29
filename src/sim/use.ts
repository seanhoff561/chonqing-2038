// The held item: hotbar selection and using it (left mouse). Item behaviours register by id or category.
import { B, type InputFrame, type SimState } from './types';
import type { World } from '../world/world';
import type { Stack } from './inventory';
import { item, type ItemCat } from '../data/items';
import { onCmd } from './commands';

type UseFn = (s: SimState, w: World, st: Stack, input: InputFrame) => void;
const byId = new Map<string, UseFn>();
const byCat = new Map<ItemCat, UseFn>();
export const onUseId = (id: string, f: UseFn) => byId.set(id, f);
export const onUseCat = (c: ItemCat, f: UseFn) => byCat.set(c, f);

/** The stack in his hands, or null for empty hands. */
export function heldStack(s: SimState): Stack | null {
  if (s.inv.held <= 0) return null;
  const uid = s.inv.hotbar[s.inv.held - 1];
  return s.inv.pack.items.find(x => x.uid === uid) ?? null;
}

export function useStack(s: SimState, w: World, st: Stack, input: InputFrame) {
  const f = byId.get(st.id) ?? byCat.get(item(st.id).cat);
  s.events.push({ t: 'use', id: st.id });
  f?.(s, w, st, input);
}

onCmd((s, c, w) => {
  if (c.c !== 'use') return;
  const st = s.inv.pack.items.find(x => x.uid === c.uid);
  if (st) useStack(s, w, st, { mx: 0, my: 0, yaw: 0, pitch: 0, buttons: 0, pressed: 0, slot: -1 });
});

export function stepHeld(s: SimState, w: World, input: InputFrame) {
  // No drawing an item while hanging on by the hands.
  if (input.slot >= 0 && !(s.player.mode === 'grip' && input.slot > 0)) s.inv.held = s.inv.held === input.slot && input.slot > 0 ? 0 : input.slot;
  const st = heldStack(s);
  if (!st) return;
  if ((input.pressed & B.USE) && s.player.mode !== 'dead' && s.player.mode !== 'hidden') useStack(s, w, st, input);
}
