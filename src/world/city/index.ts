// The city: terrain from the tile map, then fabric and set pieces.
import { makeWorld, type World } from '../world';
import { buildTerrain } from './terrain';
import { buildFabric } from './buildings';
import { buildShibati } from '../sets/shibati';
import { buildJiaochangkou, BEAM, STATIONS } from '../sets/jiaochangkou';
import { carveTunnels, AIRRAID } from './tunnels';
import { TILE } from '../map';

export function buildCity(): World {
  const t = buildTerrain();
  const f = buildFabric();
  const sb = buildShibati();
  const jk = buildJiaochangkou();
  const tn = carveTunnels(t.solids);
  const solids = tn.ground.concat(f.solids, sb.solids, jk.solids, tn.solids);
  // The gate's door switches its own collision solid.
  tn.inter.find(i => i.id === 'shibati-gate')!.data!.solid = solids.indexOf(tn.gate);
  return makeWorld({
    name: 'city', solids, decor: t.decor.concat(f.decor, sb.decor, jk.decor, tn.decor), water: t.water, props: f.props.concat(tn.props),
    inter: f.inter.concat(jk.inter, tn.inter), climbables: f.climbables.concat(jk.climbables), hides: f.hides, sites: f.sites.concat(tn.sites), zones: tn.zones,
    // The far view: ground, every block's stand-in, and the set pieces as they are.
    far: tn.ground.concat(t.decor, f.far, sb.solids, jk.solids),
    spawn: { x: 23 * TILE + 10, y: 44, z: 17 * TILE + 10, yaw: Math.PI },
    teleports: [
      { name: 'Jiaochangkou plaza', x: 24 * TILE, y: 44, z: 17 * TILE, yaw: Math.PI },
      { name: 'Shibati top', x: 23 * TILE + 10, y: 44, z: 19 * TILE + 2, yaw: Math.PI },
      { name: 'Shibati bottom', x: 23 * TILE + 10, y: 6, z: 28 * TILE + 15, yaw: 0 },
      { name: 'Air-raid shelter (rotten mattress)', x: AIRRAID.x + 3.6, y: AIRRAID.y + 0.05, z: AIRRAID.z + 0.2, yaw: -Math.PI / 2 },
      { name: 'Grand Tunnel junction', x: 465.6, y: 32.05, z: 345, yaw: Math.PI / 2 },
      { name: 'Line 2 terminus platform', x: STATIONS[0].x0 + 10, y: BEAM.top + 0.05, z: BEAM.z + 3, yaw: Math.PI / 2 },
      { name: 'Line 2 beam, west of the terminus', x: STATIONS[0].x0 - 5, y: BEAM.top + 0.05, z: BEAM.z, yaw: Math.PI / 2 },
    ],
  });
}
