// World builders by name, cached: the static world is identical every run.
import type { World } from './world';
import { buildGym } from './sets/gym';
import { buildHideoutScene } from './sets/hideout-scene';

const builders: Record<string, () => World> = { gym: buildGym, hideout: buildHideoutScene };
const cache = new Map<string, World>();

export function getWorld(name: string): World {
  let w = cache.get(name);
  if (!w) {
    const b = builders[name];
    if (!b) throw new Error(`unknown world ${name}`);
    cache.set(name, (w = b()));
  }
  return w;
}

export const worldNames = () => Object.keys(builders);
