// Parses the ASCII map into tiles with type, ground height and district.
import { TYPES, HEIGHTS, LEVELS, TILE, MAP_W, MAP_H, DISTRICTS } from '../data/map';

export interface Tile { c: number; r: number; type: string; h: number; district: string }

export const TILE_TYPES = '~b.=s#ThXpW';

let cache: Tile[] | null = null;

export function tiles(): Tile[] {
  if (cache) return cache;
  const out: Tile[] = [];
  for (let r = 0; r < MAP_H; r++)
    for (let c = 0; c < MAP_W; c++) {
      const d = DISTRICTS.find(d => c >= d.box[0] && c <= d.box[2] && r >= d.box[1] && r <= d.box[3]);
      out.push({ c, r, type: TYPES[r][c], h: LEVELS.indexOf(HEIGHTS[r][c]) * 2, district: d?.id ?? 'city' });
    }
  return (cache = out);
}

export const tileAt = (c: number, r: number): Tile | null => (c < 0 || r < 0 || c >= MAP_W || r >= MAP_H ? null : tiles()[r * MAP_W + c]);
export const tileAtPos = (x: number, z: number) => tileAt(Math.floor(x / TILE), Math.floor(z / TILE));
export { TILE };
