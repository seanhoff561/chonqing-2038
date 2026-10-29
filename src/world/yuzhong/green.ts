// The green (M3-56b, U-028): the land away from the buildings has gone back to woods, thick with trees and
// shrubs; the parks keep their trees and shrubs; weeds come up through the grass on the open ground. One pass
// over the marks' cells, seeded per cell; nothing stands in anything built.
import { overlaps, type Solid, type SolidIndex } from '../geom';
import { heightAt, type Heightfield } from '../heightfield';
import { makeRng, hashString, rand } from '../../sim/rng';
import type { Prop } from '../world';
import { propBoxes } from './dressing';
import { MARK, grassAt, type Marks } from './marks';

export function greenery(index: SolidIndex, g: Heightfield, mk: Marks): { props: Prop[]; solids: Solid[] } {
  const props: Prop[] = [], solids: Solid[] = [];
  const put = (kind: string, x: number, z: number, yaw: number) => {
    const y = heightAt(g, x, z);
    if (y === null) return;
    const p: Prop = { kind, x, y, z, yaw }, boxes = propBoxes(p);
    // Clear of anything built; a slope may run into the foot of a trunk.
    if (boxes.some(b => overlaps(index, { ...b, y0: b.y0 + 0.6 }))) return;
    props.push(p);
    solids.push(...boxes);
  };
  for (let j = 0; j < mk.h; j++) for (let i = 0; i < mk.w; i++) {
    const m = mk.m[j * mk.w + i];
    if (!m || m === MARK.ruin) continue;
    const r = makeRng(hashString(`green${i},${j}`)), x = (i + 0.2 + rand(r) * 0.6) * mk.cell, z = (j + 0.2 + rand(r) * 0.6) * mk.cell, q = rand(r), yaw = rand(r) * Math.PI * 2;
    if (m === MARK.wood) {
      if (q < 0.45) put(rand(r) < 0.25 ? 'figtree' : 'tree', x, z, yaw);
      else if (q < 0.75) put('shrub', x, z, yaw);
      else if (q < 0.95) put('weeds', x, z, yaw);
    } else if (m === MARK.park) {
      if (q < 0.1) put(rand(r) < 0.3 ? 'figtree' : 'tree', x, z, yaw);
      else if (q < 0.2) put('shrub', x, z, yaw);
      else if (q < 0.3) put('weeds', x, z, yaw);
    } else if (q < 0.15 && grassAt(mk, x, z)) put(q < 0.04 ? 'shrub' : 'weeds', x, z, yaw);
  }
  return { props, solids };
}
