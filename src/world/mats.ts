// Material ids shared by world generation and rendering.
export const MAT = {
  concrete: 0, block: 1, brick: 2, metal: 3, wood: 4, tile: 5, stone: 6, plaster: 7, asphalt: 8,
  glass: 9, moss: 10, crate: 11, water: 12, roofTile: 13, mark: 14,
  /** painted facades with window grids (M3-10): concrete walk-up, salmon tile slab, old brick */
  facade: 15, facadeTile: 16, facadeBrick: 17,
  /** abandoned block with big glassless openings; white balcony bands (M3-23) */
  facadeOpen: 18, facadeBand: 19,
  blossom: 20, leaves: 21, tealMetal: 22, cloth: 23,
  /** collision only: a prop draws it */
  hidden: 99,
} as const;
export type MatId = (typeof MAT)[keyof typeof MAT];
