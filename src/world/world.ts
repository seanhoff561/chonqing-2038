// The static world: collision index plus the entity lists the sim needs. Identical every run.
import type { Marks } from './yuzhong/marks';
import type { Heightfield } from './heightfield';
import { buildIndex, solid, turn, type Box, type Solid, type SolidIndex } from './geom';
import { MAT } from './mats';

/** Vertical climbable. (nx, nz) points from the wall out toward where the climber hangs. */
/** pole: a street pole with step bolts up it (U-032), climbed like a ladder; its post stands behind the grip line. */
export interface Climbable { kind: 'pipe' | 'ladder' | 'pole'; x: number; z: number; y0: number; y1: number; nx: number; nz: number }

/** A box he can curl up in. The interior box is what must fit him. */
/** A line he can ride hanging from it (M3-52): a cable strung between buildings, live with power or dead. */
export interface Line { a: { x: number; y: number; z: number }; b: { x: number; y: number; z: number }; live?: boolean }

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
export interface Zone { kind: string; box: Box; /** an underground space with its own lights (M3-58) */ lit?: boolean }

/** A street's line on the ground: its kind (OSM highway), width, whether it's a stair, its points. */
export interface StreetLine { kind: string; w: number; steps: boolean; pts: [number, number][] }

/** A hold, hide spot or alley piece: one group per hand-route column. */
export interface Feature { kind: string; x: number; y: number; z: number; group: number; /** out of the wall it's on */ nx?: number; nz?: number }

/** A built lot as laid out on the map (Yuzhong): its corners, base and walking route, for tests and tools. */
export interface Plot { corners: [number, number][]; base: number; wall: number; /** roof top (ridge or parapet) */ top: number; kind: string; /** its infill row, if any */ row?: string; /** foundation bottom */ found: number; route?: { x: number; y: number; z: number }[]; far: boolean; osm: boolean;
  /** what it built itself: its ranges of the world's solids and climbables (first in each list), [from, to) */
  own?: { solids: [number, number]; climbables: [number, number] } }

export interface Teleport { name: string; x: number; y: number; z: number; yaw: number }

/** A way across the city off the streets (M3-37): its points (roof to roof, along connections) and how each step
 *  is taken ('jump', 'drop', or the connection's kind). */
export interface Route { id: string; kind: 'main' | 'branch'; pts: { x: number; y: number; z: number }[]; ways: string[] }
/** A machine's beat (M3-37, laid for M4): along streets or over the roofs, between the hours it keeps. */
export interface Patrol { kind: 'street' | 'drone'; pts: { x: number; y: number; z: number }[]; hours: [number, number] }
/** A place reached only one way, with a tool (U-037): where, what it takes, and where that's used from. */
export interface Gate { tool: string; x: number; y: number; z: number; from: { x: number; y: number; z: number } }

export interface World {
  name: string;
  /** off-street routes, machines' beats, tool-gated places (M3-37); empty for small worlds */
  routes: Route[]; patrols: Patrol[]; gates: Gate[];
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
  /** the parks' lawns, inside their real outlines (M3-60, U-033), drawn over the ground */
  lawns?: [number, number][][];
  /** cables strung between buildings, to ride (M3-52) */
  lines: Line[];
  /** the machines' columns' ways out of the factory along the roads, at ground level (M3-57b) */
  convoys?: { x: number; y: number; z: number }[][];
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
  routes?: Route[]; patrols?: Patrol[]; gates?: Gate[];
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
  lawns?: World['lawns'];
  lines?: Line[];
  convoys?: World['convoys'];
  features?: Feature[];
  spawn: World['spawn'];
}

/** A ladder's own frame (U-032): a plate behind its rungs, standing 3 cm off whatever's there, so his feet find
 *  something to push on (with nothing behind it he'd only swing). */
function ladderBack(c: Climbable): Solid {
  return turn([solid(c.x - 0.3, c.y0, c.z, c.x + 0.3, c.y1, c.z + 0.03, MAT.metal)], Math.atan2(-c.nx, c.nz), c.x, c.z)[0];
}

export function makeWorld(p: WorldParts): World {
  const solids = p.solids.concat((p.climbables ?? []).filter(c => c.kind === 'ladder').map(ladderBack));
  // Doors and windows (M3-36) find the solid they switch by its part.
  const parts = new Map<string, number>();
  solids.forEach((s, i) => { if (s.part) parts.set(s.part, i); });
  if (parts.size) for (const it of p.inter ?? []) if (typeof it.data?.part === 'string' && parts.has(it.data.part)) it.data.solid = parts.get(it.data.part);
  return {
    name: p.name,
    routes: p.routes ?? [], patrols: p.patrols ?? [], gates: p.gates ?? [],
    decor: p.decor ?? [],
    solids,
    ground: p.ground,
    plots: p.plots ?? [],
    streets: p.streets ?? [],
    marks: p.marks,
    lawns: p.lawns,
    lines: p.lines ?? [],
    convoys: p.convoys,
    features: p.features ?? [],
    index: buildIndex(solids, p.ground),
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
