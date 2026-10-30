// The static world: collision index plus the entity lists the sim needs. Identical every run.
import type { Marks } from './yuzhong/marks';
import type { Heightfield } from './heightfield';
import { buildIndex, type Box, type Solid, type SolidIndex } from './geom';

/** Vertical climbable. (nx, nz) points from the wall out toward where the climber hangs. */
export interface Climbable { kind: 'pipe' | 'ladder'; x: number; z: number; y0: number; y1: number; nx: number; nz: number }

/** A box he can curl up in. The interior box is what must fit him. */
/** A place to curl up in: inner is its space, centred where it is with its own width (x) and depth (z) before
 *  it's turned by yaw (as a prop's: three's rotation.y). */
export interface HideSpot { id: number; inner: Box; kind: string; yaw?: number }

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

/** A street's line on the ground: its kind (OSM highway), width, whether it's a stair, its points. */
export interface StreetLine { kind: string; w: number; steps: boolean; pts: [number, number][] }

/** A hold, hide spot or alley piece: one group per hand-route column. */
export interface Feature { kind: string; x: number; y: number; z: number; group: number }

/** A built lot as laid out on the map (Yuzhong): its corners, base and walking route, for tests and tools. */
export interface Plot { corners: [number, number][]; base: number; wall: number; /** roof top (ridge or parapet) */ top: number; kind: string; /** its infill row, if any */ row?: string; /** foundation bottom */ found: number; route?: { x: number; y: number; z: number }[]; far: boolean; osm: boolean }

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
  /** heightfield ground (M3-41a), also in the index */
  ground?: Heightfield;
  plots: Plot[];
  /** the streets on the ground, drawn as meshes along their lines (M3-54) */
  streets: StreetLine[];
  /** what the open ground should become, for filling it (M3-56a); real-map worlds only */
  marks?: Marks;
  /** holds, hide spots and alley pieces as built (Yuzhong), for tests and tools */
  features: Feature[];
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
  /** heightfield ground (M3-41a) */
  ground?: Heightfield;
  plots?: Plot[];
  streets?: StreetLine[];
  marks?: Marks;
  features?: Feature[];
  spawn: World['spawn'];
}

export function makeWorld(p: WorldParts): World {
  return {
    name: p.name,
    decor: p.decor ?? [],
    solids: p.solids,
    ground: p.ground,
    plots: p.plots ?? [],
    streets: p.streets ?? [],
    marks: p.marks,
    features: p.features ?? [],
    index: buildIndex(p.solids, p.ground),
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
