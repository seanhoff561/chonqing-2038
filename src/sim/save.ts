// The ironman save: one slot, written when he wakes, deleted when he dies. Storage is injected so tests can use a shim.
import type { SimState } from './types';
import { STATE_VERSION } from './sim';

export interface Storage { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export interface SaveFile { version: number; scenario: string; savedAt: number; state: SimState }

export const SAVE_KEY = 'cq2038.save';

export function writeSave(st: Storage, scenario: string, state: SimState) {
  const f: SaveFile = { version: STATE_VERSION, scenario, savedAt: state.time, state };
  st.setItem(SAVE_KEY, JSON.stringify(f));
}

/** The save, or null if there is none or it can't be read. */
export function readSave(st: Storage): SaveFile | null {
  const raw = st.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as SaveFile;
    if (f.version !== STATE_VERSION || !f.state) return null;
    return f;
  } catch {
    return null;
  }
}

export const deleteSave = (st: Storage) => st.removeItem(SAVE_KEY);
