// The start hideout's grate (M3-72, U-038): in an alley, under a heap of rubbish bags, bolted from below. Working
// it is slow and loud: from below he draws the bolts and shoves it up, the bags tumbling off; going down he pulls it
// shut by the cords tied through it, which drag the bags back over, and shoots the bolts. From above it lifts only
// unbolted, and the bags have to be dragged back by hand. Left open, or the bags off it, or his things lying about
// up there, it's found: they come down while he sleeps.
import type { SimState } from './types';
import type { World, Inter } from '../world/world';
import { onInteract } from './interact';
import { sleepHooks } from './sleep';
import { doorSolid } from './doors';
import { overlaps } from '../world/geom';
import { boxAt } from './physics';
import { movement as M } from '../data/movement';

/** Seconds each takes, and how far each is heard (m). */
export const GRATE = {
  unbolt: 3.5, lift: 2, shut: 4, lower: 1.5, cover: 2,
  loud: 14, noise: 9, quiet: 3,
  /** what counts as up there by it: his things within this of it */
  near: 12,
  /** asleep under a give-away, he's found this many hours in, or at nightfall's patrol over it if sooner */
  found: 3, patrol: [21, 5] as [number, number],
};

export const bagsId = (it: Inter) => it.id + '-bags';
const isOpen = (s: SimState, it: Inter) => !!s.wstate.open[it.id];
/** A basement's manhole grate (M3-73a) has no bags; a loose one was never bolted. */
const manhole = (it: Inter) => !!it.data?.manhole;
const bolted = (s: SimState, it: Inter) => !it.data?.loose && !s.wstate.unlocked?.[it.id];
const bagsOff = (s: SimState, it: Inter) => !manhole(it) && !!s.wstate.open[bagsId(it)];
const below = (s: SimState, it: Inter) => s.player.pos.y < it.y - 0.3;
type Act = 'unbolt' | 'lift' | 'shut' | 'lower' | 'cover';
function act(s: SimState, it: Inter): Act {
  if (below(s, it)) return isOpen(s, it) ? 'shut' : bolted(s, it) ? 'unbolt' : 'lift';
  return isOpen(s, it) ? 'lower' : bagsOff(s, it) ? 'cover' : 'lift';
}
/** What it says, naming what it is (a grate, a trapdoor, a roof hatch: M3-83). */
function label(s: SimState, it: Inter): [string, string] {
  const zh = it.zh, en = it.en.toLowerCase(), loose = !!it.data?.loose;
  switch (act(s, it)) {
    case 'unbolt': return [`拔开插销 顶开${zh}`, `Draw the bolts, push the ${en} up`];
    case 'lift': return [`掀开${zh}`, `Lift the ${en}`];
    case 'shut': return loose ? [`拉上${zh}`, `Pull the ${en} shut`] : [`拉上${zh} 插上插销`, `Pull the ${en} shut and bolt it`];
    case 'lower': return [`放下${zh}`, `Lower the ${en}`];
    default: return ['把垃圾袋拖回去', 'Drag the bags back over it'];
  }
}

/** Would the shut grate close on him (his body through the opening)? From below he ducks a little under it as it
 *  comes down, if there's room. */
function inTheWay(s: SimState, w: World, it: Inter) {
  w.index.off[doorSolid(it)] = 0;
  const p = s.player, at = (dy: number) => overlaps(w.index, boxAt(p.pos.x, p.pos.y - dy, p.pos.z, M.height[p.posture]));
  const dy = [0, 0.15, 0.3, 0.45].find(d => !at(d) && (d === 0 || below(s, it)));
  w.index.off[doorSolid(it)] = 1;
  if (dy === undefined) return true;
  p.pos.y -= dy;
  return false;
}

function sound(s: SimState, it: Inter, id: string, r: number) {
  s.events.push({ t: 'sfx', id });
  s.events.push({ t: 'noise', x: it.x, y: it.y + 0.5, z: it.z, r, kind: 'grate' });
}

onInteract('grate', {
  grip: true,
  label,
  can: (s, it) => {
    const a = act(s, it);
    if (a === 'lift' && !below(s, it) && bolted(s, it)) return 'bolted from below';
    // Standing on it, he can't lift it.
    const on = ((it.data?.half as number | undefined) ?? 1.2) + 0.6;
    if (a === 'lift' && !below(s, it) && Math.abs(s.player.pos.x - it.x) < on && Math.abs(s.player.pos.z - it.z) < on && Math.abs(s.player.pos.y - it.y) < 0.3) return 'step off it';
    return null;
  },
  dur: (s, it) => GRATE[act(s, it)],
  done: (s, w, it) => {
    const a = act(s, it), o = s.wstate.open;
    if (a === 'unbolt' || a === 'lift') {
      o[it.id] = true;
      o[bagsId(it)] = true;
      (s.wstate.unlocked ??= {})[it.id] = true;
      w.index.off[doorSolid(it)] = 1;
      sound(s, it, a === 'unbolt' ? 'grate-bolt' : 'grate-open', a === 'unbolt' ? GRATE.loud : GRATE.noise);
    } else if (a === 'shut' || a === 'lower') {
      if (inTheWay(s, w, it)) { s.events.push({ t: 'msg', text: 'in the way' }); return; }
      o[it.id] = false;
      w.index.off[doorSolid(it)] = 0;
      if (a === 'shut') { o[bagsId(it)] = false; delete s.wstate.unlocked?.[it.id]; }
      sound(s, it, a === 'shut' ? 'grate-bolt' : 'grate-shut', a === 'shut' ? GRATE.loud : GRATE.noise);
    } else {
      o[bagsId(it)] = false;
      sound(s, it, 'bags', GRATE.quiet);
    }
  },
});

/** What gives the hideout away while he's down there: null if nothing does. */
export function giveaway(s: SimState, it: Inter): string | null {
  if (isOpen(s, it)) return 'the grate left open';
  if (bagsOff(s, it)) return 'the bags off the grate';
  const near = (x: number, y: number, z: number) => y > it.y - 1 && Math.hypot(x - it.x, z - it.z) < GRATE.near;
  if (s.dropped.some(d => near(d.x, d.y, d.z)) || s.placed.some(p => near(p.x, p.y, p.z))) return 'his things left by the grate';
  return null;
}

/** When they come down: the night patrol's first pass over it once he's asleep, or a few hours in by day. */
function foundAt(from: number) {
  const [a, b] = GRATE.patrol;
  for (let t = from + 1800; t < from + GRATE.found * 3600; t += 600) { const h = (t / 3600) % 24; if (h >= a || h < b) return t; }
  return from + GRATE.found * 3600;
}

// Asleep down there with a give-away up top, he doesn't wake.
sleepHooks.fates.push((s, _until, w) => {
  const p = s.player.pos, grate = w.inter.find(i => i.kind === 'grate' && !manhole(i) && p.y < i.y - 2 && Math.hypot(p.x - i.x, p.z - i.z) < 25);
  const why = grate ? giveaway(s, grate) : null;
  return why ? { at: foundAt(s.time), cause: 'found', why } : null;
});
