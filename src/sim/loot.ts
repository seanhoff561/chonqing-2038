// Rolling loot. Each container rolls from its own stream (run seed + container id), so what it holds
// doesn't depend on the order the player opens things.
import type { SimState } from './types';
import type { Inter } from '../world/world';
import { loot } from '../data/loot';
import { item } from '../data/items';
import { makeRng, rand, randInt, hashString } from './rng';
import { addItem } from './inventory';
import { setFiller } from './containers';

export function rollLoot(s: SimState, it: Inter) {
  const g = s.containers[it.id];
  for (const [id, n] of (it.data?.items as [string, number][] | undefined) ?? []) addItem(s, g, id, n);
  const t = loot[(it.data?.loot as string) ?? ''];
  if (!t) return;
  const r = makeRng(hashString(`${s.seed}:${it.id}`));
  if (rand(r) < t.empty) return;
  const rolls = t.rolls[0] + randInt(r, t.rolls[1] - t.rolls[0] + 1);
  const total = t.items.reduce((a, e) => a + e.w, 0);
  for (let k = 0; k < rolls; k++) {
    let x = rand(r) * total;
    const e = t.items.find(e => (x -= e.w) < 0)!;
    const n = e.n ? e.n[0] + randInt(r, e.n[1] - e.n[0] + 1) : 1;
    const food = item(e.id).food;
    // Food was made some while before the machines came; fresh food may already be past its date.
    const extra = food ? { made: s.time - rand(r) * Math.min(food.shelfDays * 1.3, 400) * 86400 } : {};
    addItem(s, g, e.id, n, extra);
  }
}

setFiller(rollLoot);
