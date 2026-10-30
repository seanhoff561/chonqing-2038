// Material ids shared by world generation and rendering.
export const MAT = {
  concrete: 0, block: 1, brick: 2, metal: 3, wood: 4, tile: 5, stone: 6, plaster: 7, asphalt: 8,
  glass: 9, moss: 10, crate: 11, water: 12, roofTile: 13, mark: 14,
  /** painted facades with window grids (M3-10): concrete walk-up, salmon tile slab, old brick */
  facade: 15, facadeTile: 16, facadeBrick: 17,
  /** abandoned block with big glassless openings; white balcony bands (M3-23) */
  facadeOpen: 18, facadeBand: 19,
  blossom: 20, leaves: 21, tealMetal: 22, cloth: 23,
  /** a glowing fitting: bulkhead lamps, lit signs */
  lamp: 24,
  /** grass and weeds on open ground (M3-56b) */
  grass: 25,
  /** broken concrete and brick over the rough ground (M3-56c) */
  rubble: 26,
  /** the machines' works (M3-57b): steel cladding with ribbon windows, every one lit at night; their cold working light */
  facadeWorks: 27, glare: 28,
  /** collision only and soft (a prop draws it): bags, bins, cardboard; landing on it breaks a fall (U-024) */
  soft: 98,
  /** collision only: a prop draws it */
  hidden: 99,
} as const;
export type MatId = (typeof MAT)[keyof typeof MAT];
