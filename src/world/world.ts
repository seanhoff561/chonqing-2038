// The static world: collision index plus the entity lists the sim needs. Identical every run.
import { buildIndex, type Box, type Solid, type SolidIndex } from './geom';

/** Vertical climbable. (nx, nz) points from the wall out toward where the climber hangs. */
export interface Climbable { kind: 'pipe' | 'ladder'; x: number; z: number; y0: number; y1: number; nx: number; nz: number }

/** A box he can curl up in. The interior box is what must fit him. */
export interface HideSpot { id: number; inner: Box; kind: string }

export interface Label { text: string; x: number; y: number; z: number; face: 'n' | 's' | 'e' | 'w' | 'up' }

/** Render-side set dressing, built by kind in src/render/props.ts. */
export interface Prop { kind: string; x: number; y: number; z: number; yaw: number; w?: number; h?: number; d?: number; text?: string; gap?: [number, number] }

/** Something he can use with E. `r` is how close the look ray must pass. */
export interface Inter { id: string; kind: string; x: number; y: number; z: number; r: number; zh: string; en: string; data?: Record<string, unknown> }

/** A place he could make a shelter (U-013): what there is to claim, and how exposed it is. exits counts ways
 *  out; windows (per floor) is how much light leaks out at night; streetSides is how many of its walls face a
 *  street where patrols walk. */
export interface Site {
  id: string; kind: 'flat' | 'roof hut' | 'cellar'; x: number; y: number; z: number;
  bed: string | null; table: string | null; containers: string[]; exits: number; windows: number; streetSides: number;
}

/** Areas with special rules: 'under' = underground (no sky light). */
export interface Zone { kind: string; box: Box }

export interface Teleport { name: string; x: number; y: number; z: number; yaw: number }

export interface World {
  name: string;
  /** render-only boxes (visible stair steps over invisible ramps, trims) */
  decor: Solid[];
  teleports: Teleport[];
  props: Prop[];
  zones: Zone[];
  inter: Inter[];
  sites: Site[];
  /** render-only stand-ins for the far view (U-012): one box per block; empty for small worlds */
  far: Solid[];
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
  decor?: Solid[];
  water?: Box[];
  climbables?: Climbable[];
  hides?: HideSpot[];
  labels?: Label[];
  teleports?: Teleport[];
  props?: Prop[];
  zones?: Zone[];
  inter?: Inter[];
  sites?: Site[];
  far?: Solid[];
  spawn: World['spawn'];
}

export function makeWorld(p: WorldParts): World {
  return {
    name: p.name,
    decor: p.decor ?? [],
    solids: p.solids,
    index: buildIndex(p.solids),
    water: p.water ?? [],
    climbables: p.climbables ?? [],
    hides: p.hides ?? [],
    labels: p.labels ?? [],
    teleports: p.teleports ?? [],
    props: p.props ?? [],
    zones: p.zones ?? [],
    inter: p.inter ?? [],
    sites: p.sites ?? [],
    far: p.far ?? [],
    spawn: p.spawn,
  };
}
