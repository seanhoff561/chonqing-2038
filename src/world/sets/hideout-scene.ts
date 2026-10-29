// Standalone hideout scenario: the chamber in solid rock, its passage rising to a small street
// above (the city version replaces the street with Shibati and Jiaochangkou).
import { solid, carve, rampSolid, type Solid } from '../geom';
import { makeWorld, type World } from '../world';
import { MAT } from '../mats';
import { hideoutParts, placeHideout } from './hideout';

export function buildHideoutScene(): World {
  const h = hideoutParts(0, 0, 0);
  let solids: Solid[] = [solid(-20, -3, -30, 90, 12, 30, MAT.stone)];
  solids = placeHideout(solids, h);
  // Passage east, then a stair ramp up to the street at 12 m.
  solids = carve(solids, { x0: 26, y0: 0, z0: -1, x1: 44, y1: 2.4, z1: 1 });
  for (let i = 0; i < 12; i++) solids = carve(solids, { x0: 44 + i * 2, y0: i * 1, z0: -1, x1: 46 + i * 2, y1: 12.1, z1: 1 });
  solids.push(rampSolid(44, -0.5, -1, 68, 1, 0, 12, 1, MAT.stone));
  solids = carve(solids, { x0: 68, y0: 12, z0: -1, x1: 70, y1: 14.5, z1: 1 });
  // A few buildings around the grate for the view up the shaft.
  solids.push(solid(-4, 12, -14, 6, 40, -6, MAT.tile), solid(14, 12, -16, 24, 34, -7, MAT.plaster), solid(-2, 12, 7, 8, 30, 16, MAT.tile));
  return makeWorld({
    name: 'hideout', solids, props: h.props, zones: h.zones, climbables: h.climbables,
    spawn: { ...h.at.spawn, yaw: -Math.PI / 2 },
    teleports: [
      { name: 'mattress', ...h.at.spawn, yaw: -Math.PI / 2 },
      { name: 'passage', x: 30, y: 0, z: 0, yaw: -Math.PI / 2 },
      { name: 'street above', x: 10, y: 12, z: 3, yaw: 0 },
    ],
  });
}
