// The green (M3-56b, U-028, M3-62): the land away from the buildings has gone back to woods, thick with trees and
// shrubs; the parks keep their trees, shrubs and hedges; weeds come up through the grass on the open ground. The
// trees by species, the big ones climbable up their trunks (U-035). One pass
// over the marks' cells, seeded per cell; nothing stands in anything built.
import { overlaps, type Solid, type SolidIndex } from '../geom';
import { heightAt, type Heightfield } from '../heightfield';
import { makeRng, hashString, rand } from '../../sim/rng';
import type { Climbable, Prop } from '../world';
import { PROP_BOX } from '../../data/props';
import { propBoxes } from './dressing';
import { MARK, grassAt, type Marks } from './marks';

/** Trees he can climb (U-035), by species: how far up the trunk goes before the crown (m). */
const TRUNK: Record<string, number> = { tree: 2.4, figtree: 3.6, camphor: 2.0, ginkgo: 2.6 };

/** A tree's trunk to climb hand over hand to where the crown starts (U-035, M3-62), on the side it faces; null if
 *  it isn't a tree he can climb. */
export function trunk(p: Prop): Climbable | null {
  const up = TRUNK[p.kind];
  if (!up) return null;
  const R = PROP_BOX[p.kind].w / 2, nx = Math.sin(p.yaw), nz = Math.cos(p.yaw);
  return { kind: 'pole', x: p.x + nx * R, z: p.z + nz * R, y0: p.y + 0.3, y1: p.y + up, nx, nz };
}
const pick = <T>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];

export function greenery(index: SolidIndex, g: Heightfield, mk: Marks): { props: Prop[]; solids: Solid[] } {
  const props: Prop[] = [], solids: Solid[] = [];
  const put = (kind: string, x: number, z: number, yaw: number, extra: Partial<Prop> = {}) => {
    const y = heightAt(g, x, z);
    if (y === null) return;
    const p: Prop = { kind, x, y, z, yaw, ...extra }, boxes = propBoxes(p);
    // Clear of anything built; a slope may run into the foot of a trunk.
    if (boxes.some(b => overlaps(index, { ...b, y0: b.y0 + 0.6 }))) return;
    props.push(p);
    solids.push(...boxes);
  };
  for (let j = 0; j < mk.h; j++) for (let i = 0; i < mk.w; i++) {
    const m = mk.m[j * mk.w + i];
    if (!m || m === MARK.ruin || m === MARK.laid) continue;
    const r = makeRng(hashString(`green${i},${j}`)), x = (i + 0.2 + rand(r) * 0.6) * mk.cell, z = (j + 0.2 + rand(r) * 0.6) * mk.cell, q = rand(r), yaw = rand(r) * Math.PI * 2, R = () => rand(r);
    // (Species, M3-62: the woods banyan, camphor and bamboo; the parks camphor, ginkgo, palms and banyans, their
    // paths edged with hedges; ferns in the shade.)
    if (m === MARK.wood) {
      if (q < 0.45) put(pick(R, ['figtree', 'figtree', 'camphor', 'camphor', 'bamboo', 'tree', 'ginkgo']), x, z, yaw);
      else if (q < 0.75) put('shrub', x, z, yaw);
      else if (q < 0.85) put('fern', x, z, yaw);
      else if (q < 0.95) put('weeds', x, z, yaw);
    } else if (m === MARK.park) {
      if (q < 0.1) put(pick(R, ['camphor', 'camphor', 'ginkgo', 'ginkgo', 'palm', 'figtree', 'tree']), x, z, yaw);
      else if (q < 0.17) put('shrub', x, z, yaw);
      else if (q < 0.22) put('hedge', x, z, Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2), { w: 2 + rand(r) * 3 });
      else if (q < 0.26) put('fern', x, z, yaw);
      else if (q < 0.32) put('weeds', x, z, yaw);
    } else if (q < 0.15 && grassAt(mk, x, z)) put(q < 0.04 ? 'shrub' : 'weeds', x, z, yaw);
  }
  return { props, solids };
}
