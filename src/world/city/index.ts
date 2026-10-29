// The city: terrain from the tile map, then fabric and set pieces.
import { makeWorld, type World } from '../world';
import { buildTerrain } from './terrain';
import { buildFabric } from './buildings';
import { TILE } from '../map';

export function buildCity(): World {
  const t = buildTerrain();
  const f = buildFabric();
  return makeWorld({
    name: 'city', solids: t.solids.concat(f.solids), decor: t.decor.concat(f.decor), water: t.water, props: f.props, inter: f.inter, climbables: f.climbables, hides: f.hides,
    spawn: { x: 23 * TILE + 10, y: 44, z: 17 * TILE + 10, yaw: Math.PI },
    teleports: [
      { name: 'Jiaochangkou plaza', x: 24 * TILE, y: 44, z: 17 * TILE, yaw: Math.PI },
      { name: 'Shibati top', x: 23 * TILE + 10, y: 44, z: 19 * TILE + 2, yaw: Math.PI },
      { name: 'Shibati bottom', x: 23 * TILE + 10, y: 6, z: 28 * TILE + 15, yaw: 0 },
    ],
  });
}
