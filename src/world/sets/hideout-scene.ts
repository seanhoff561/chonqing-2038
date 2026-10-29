// Standalone hideout scenario: the chamber in solid rock, its passage rising to a small street
// above (the city version replaces the street with Shibati and Jiaochangkou).
import { solid, carve, rampSolid, type Solid } from '../geom';
import { makeWorld, type World } from '../world';
import { MAT } from '../mats';
import { hideoutParts, placeHideout } from './hideout';

export function buildHideoutScene(): World {
  const h = hideoutParts(0, 0, 0);
  let solids: Solid[] = [solid(-20, -3, -30, 90, 9, 30, MAT.stone)];
  solids = placeHideout(solids, h);
  // Passage east, then a stair ramp up to the street at 12 m.
  solids = carve(solids, { x0: 26, y0: 0, z0: -1, x1: 44, y1: 2.4, z1: 1 });
  for (let i = 0; i < 9; i++) solids = carve(solids, { x0: 44 + i * 2, y0: i * 1, z0: -1, x1: 46 + i * 2, y1: 9.1, z1: 1 });
  solids.push(rampSolid(44, -0.5, -1, 62, 1, 0, 9, 1, MAT.stone));
  // A few buildings around the grate for the view up the shaft.
  solids.push(solid(-4, 9, -14, 6, 37, -6, MAT.tile), solid(13, 9, -6, 22, 23, 4, MAT.tile), solid(14, 9, -16, 24, 31, -7, MAT.plaster), solid(-2, 9, 7, 8, 27, 16, MAT.tile));
  const props = [...h.props,
    { kind: 'neon', x: 1, y: 19, z: -5.95, yaw: 0, w: 1.4, h: 8, text: '重庆小面' },
    { kind: 'neon', x: 12.95, y: 16.5, z: 0.5, yaw: -Math.PI / 2, w: 1.1, h: 6, text: '十八梯旅馆' },
    { kind: 'neonGlow', x: 11.5, y: 12, z: 0.5, yaw: 0 },
    { kind: 'neon', x: 18, y: 16, z: -6.95, yaw: 0, h: 1.6, text: '火锅 · 老码头' },
    { kind: 'neon', x: 3, y: 15, z: 6.95, yaw: Math.PI, h: 1.4, text: '请居民留在室内' },
    { kind: 'searchlight', x: 19, y: 31.5, z: -11, yaw: 0, d: 70 },
    { kind: 'searchlight', x: 1, y: 37.5, z: -10, yaw: 2, d: 70 },
    { kind: 'patrolDecor', x: 10, y: 9, z: 0, yaw: 0 },
  ];
  return makeWorld({
    name: 'hideout', solids, props, zones: h.zones, climbables: h.climbables, inter: h.inter,
    spawn: { ...h.at.spawn, yaw: -Math.PI / 2 },
    teleports: [
      { name: 'mattress', ...h.at.spawn, yaw: -Math.PI / 2 },
      { name: 'passage', x: 30, y: 0, z: 0, yaw: -Math.PI / 2 },
      { name: 'street above', x: 10, y: 9, z: 3, yaw: 0 },
    ],
  });
}
