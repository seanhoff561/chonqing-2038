// The real place (M3-39, U-017): bare-ground elevation and OpenStreetMap features of the eastern Yuzhong
// peninsula in local metres, x east and z south from the north-west corner of the box in osm.json.
import { GROUND } from '../data/geo/ground';
import OSM from '../data/geo/osm.json';

export type Pts = number[];
export interface GeoData {
  size: [number, number];
  bbox: { lon0: number; lat0: number; lon1: number; lat1: number };
  /** [highway, width dm, flags (1 steps, 2 bridge, 4 tunnel), layer, name, points dm] */
  streets: [string, number, number, number, string, Pts][];
  /** [levels, height dm, kind, name, points dm] */
  buildings: [number, number, string, string, Pts][];
  /** [kind, name, points dm] */
  areas: [string, string, Pts][];
  /** [railway, flags, layer, name, points dm] */
  rails: [string, number, number, string, Pts][];
  /** [name, kind, x dm, z dm] */
  stations: [string, string, number, number][];
  aerial: [string, Pts][];
  landmarks: Record<string, { x: number; z: number; lon: number; lat: number }>;
}
export const GEO = OSM as unknown as GeoData;

const RAD = Math.PI / 180, LAT = ((GEO.bbox.lat0 + GEO.bbox.lat1) / 2) * RAD;
const M_LAT = 111132.954 - 559.822 * Math.cos(2 * LAT) + 1.175 * Math.cos(4 * LAT);
const M_LON = 111412.84 * Math.cos(LAT) - 93.5 * Math.cos(3 * LAT);
/** Longitude and latitude to local metres. */
export const toLocal = (lon: number, lat: number): [number, number] => [(lon - GEO.bbox.lon0) * M_LON, (GEO.bbox.lat0 - lat) * M_LAT];

let heights: Float32Array | null = null;
function grid(): Float32Array {
  if (heights) return heights;
  const bin = typeof atob === 'function' ? Uint8Array.from(atob(GROUND.data), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(GROUND.data, 'base64'));
  const dm = new Int16Array(bin.buffer, bin.byteOffset, bin.byteLength / 2);
  heights = Float32Array.from(dm, v => v / 10);
  return heights;
}

/** Bare ground above sea level at (x, z), bilinear between samples; clamped at the box's edges. */
export function groundAt(x: number, z: number): number {
  const g = grid(), { w, h, cell } = GROUND;
  const fx = Math.min(Math.max(x / cell, 0), w - 1.001), fz = Math.min(Math.max(z / cell, 0), h - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), ax = fx - i, az = fz - j, k = j * w + i;
  return (g[k] * (1 - ax) + g[k + 1] * ax) * (1 - az) + (g[k + w] * (1 - ax) + g[k + w + 1] * ax) * az;
}
