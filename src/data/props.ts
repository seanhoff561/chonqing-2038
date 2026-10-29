// Collision footprints of dressing props (M3-34): width across x, depth along z at yaw 0, height. Props not
// listed are walked over or through (litter, weeds, signs, scooters lying down).
export const PROP_BOX: Record<string, { w: number; d: number; h: number }> = {
  car: { w: 1.8, d: 4.4, h: 1.45 }, van: { w: 1.95, d: 4.9, h: 2.0 }, bus: { w: 2.5, d: 11, h: 3.0 },
  jersey: { w: 0.62, d: 2, h: 0.82 }, barrier: { w: 2.1, d: 0.4, h: 1.05 }, sandbags: { w: 2.2, d: 0.7, h: 0.9 },
  kiosk: { w: 2.4, d: 2.0, h: 2.5 }, stall: { w: 1.7, d: 0.9, h: 1.0 }, bin: { w: 0.6, d: 0.6, h: 0.9 },
  bench: { w: 1.8, d: 0.45, h: 0.5 }, mahjong: { w: 0.9, d: 0.9, h: 0.76 }, tree: { w: 0.4, d: 0.4, h: 3 },
  figtree: { w: 0.6, d: 0.6, h: 4 }, lamppost: { w: 0.2, d: 0.2, h: 7.5 }, campole: { w: 0.2, d: 0.2, h: 4.5 },
  dronedock: { w: 0.6, d: 0.6, h: 2.2 }, rubblepile: { w: 1.6, d: 1.6, h: 0.6 }, bollard: { w: 0.25, d: 0.25, h: 0.9 },
  edict: { w: 3.2, d: 0.3, h: 4.4 },
};
