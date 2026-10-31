// Collision footprints of dressing props (M3-34): width across x, depth along z at yaw 0, height. Props not
// listed are walked over or through (litter, weeds, signs, scooters lying down).
export const PROP_BOX: Record<string, { w: number; d: number; h: number }> = {
  car: { w: 1.8, d: 4.4, h: 1.45 }, van: { w: 1.95, d: 4.9, h: 2.0 }, bus: { w: 2.5, d: 11, h: 3.0 },
  jersey: { w: 0.62, d: 2, h: 0.82 }, barrier: { w: 2.1, d: 0.4, h: 1.05 }, sandbags: { w: 2.2, d: 0.7, h: 0.9 },
  kiosk: { w: 2.4, d: 2.0, h: 2.5 }, stall: { w: 1.7, d: 0.9, h: 1.0 }, bin: { w: 0.6, d: 0.6, h: 0.9 },
  bench: { w: 1.8, d: 0.45, h: 0.5 }, mahjong: { w: 0.9, d: 0.9, h: 0.76 }, tree: { w: 0.4, d: 0.4, h: 3 },
  figtree: { w: 0.6, d: 0.6, h: 4 }, lamppost: { w: 0.2, d: 0.2, h: 7.5 }, campole: { w: 0.2, d: 0.2, h: 4.5 },
  dronedock: { w: 0.6, d: 0.6, h: 2.2 }, rubblepile: { w: 1.6, d: 1.6, h: 0.6 }, bollard: { w: 0.25, d: 0.25, h: 0.9 },
  edict: { w: 3.2, d: 0.3, h: 4.4 }, slab: { w: 2.4, d: 2.6, h: 0.5 }, halfwall: { w: 0.3, d: 3, h: 2 },
  bags: { w: 1.4, d: 1.4, h: 0.65 }, garden: { w: 2, d: 3, h: 0.3 }, tarp: { w: 2.4, d: 3, h: 1.3 }, boxes: { w: 1.2, d: 1.2, h: 0.5 },
  dumpster: { w: 1.9, d: 1.15, h: 1.3 }, drum: { w: 1.0, d: 1.0, h: 1.25 },
  // The trees by species and the potted plants (M3-62): their trunks, a clump of bamboo, a hedge p.w long.
  camphor: { w: 0.7, d: 0.7, h: 2.4 }, palm: { w: 0.35, d: 0.35, h: 5 }, bamboo: { w: 0.9, d: 0.9, h: 4 }, ginkgo: { w: 0.4, d: 0.4, h: 5 },
  hedge: { w: 0.7, d: 3, h: 0.9 }, potplant: { w: 0.7, d: 0.7, h: 0.6 },
};

/** Props hung on walls, strung overhead, set on roofs or built round a place: everything else stands on the
 *  ground or on whatever is under it (M3-56). */
export const HUNG = new Set(['neonblade', 'neonsign', 'ledscreen', 'laundry', 'vine', 'figroots', 'cablebundle', 'arches', 'train', 'grate', 'graffiti', 'qr', 'redbanner', 'ledboard']);

/** Props he can hide in (M3-47, U-021): the space inside, in the prop's frame: width (x), height, depth (z), its
 *  floor above the prop's foot and its middle along z. */
export const PROP_HIDE: Record<string, { kind: string; w: number; h: number; d: number; y: number; z: number }> = {
  dumpster: { kind: 'dumpster', w: 1.7, h: 1.0, d: 0.95, y: 0.2, z: 0 },
  drum: { kind: 'drum', w: 0.82, h: 1.05, d: 0.82, y: 0.12, z: 0 },
  kiosk: { kind: 'kiosk', w: 2.0, h: 2.1, d: 1.6, y: 0.1, z: 0 },
  car: { kind: 'boot', w: 1.2, h: 0.6, d: 0.85, y: 0.6, z: -1.65 },
  van: { kind: 'van', w: 1.6, h: 1.35, d: 2.0, y: 0.55, z: -1.2 },
};
