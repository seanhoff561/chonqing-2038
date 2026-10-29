// The static world: collision index plus the entity lists the sim needs. Identical every run.
import { buildIndex, type Box, type Solid, type SolidIndex } from './geom';

/** Vertical climbable. (nx, nz) points from the wall out toward where the climber hangs. */
export interface Climbable { kind: 'pipe' | 'ladder'; x: number; z: number; y0: number; y1: number; nx: number; nz: number }

/** A box he can curl up in. The interior box is what must fit him. */
export interface HideSpot { id: number; inner: Box; kind: string }

export interface Label { text: string; x: number; y: number; z: number; face: 'n' | 's' | 'e' | 'w' | 'up' }

export interface Teleport { name: string; x: number; y: number; z: number; yaw: number }

export interface World {
  name: string;
  teleports: Teleport[];
  solids: Solid[];
  index: SolidIndex;
  water: Box[];
  climbables: Climbable[];
  hides: HideSpot[];
  labels: Label[];
  spawn: { x: number; y: number; z: number; yaw: number };
}

export interface WorldParts {
  name: string;
  solids: Solid[];
  water?: Box[];
  climbables?: Climbable[];
  hides?: HideSpot[];
  labels?: Label[];
  teleports?: Teleport[];
  spawn: World['spawn'];
}

export function makeWorld(p: WorldParts): World {
  return {
    name: p.name,
    solids: p.solids,
    index: buildIndex(p.solids),
    water: p.water ?? [],
    climbables: p.climbables ?? [],
    hides: p.hides ?? [],
    labels: p.labels ?? [],
    teleports: p.teleports ?? [],
    spawn: p.spawn,
  };
}
