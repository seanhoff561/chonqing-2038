// The ruins of the fighting (M3-56c, U-028, U-030): when the city fought the machines it blew up its own streets,
// and the rough ground by the buildings (the marks' ruins) is where that left its debris. Each patch gets rubble
// heaps, tipped slabs, rebar and broken walls, at least one piece however small; the big ones a collapsed
// building (a broken corner of wall, slabs piled against it, rubble round it); the steepest banks are retaining
// walls with fig roots hanging over them. Debris has collision, so it is cover and something to climb.
import { overlaps, type Solid, type SolidIndex } from '../geom';
import { heightAt, type Heightfield } from '../heightfield';
import { makeRng, hashString, rand, type Rng } from '../../sim/rng';
import type { Prop } from '../world';
import { propBoxes } from './dressing';
import { MARK, type Marks } from './marks';

/** Patches this many cells and up hold a collapsed building. */
const BIG = 10;

export function ruins(index: SolidIndex, g: Heightfield, mk: Marks): { props: Prop[]; solids: Solid[] } {
  const props: Prop[] = [], solids: Solid[] = [];
  const put = (kind: string, x: number, z: number, yaw: number, extra: Partial<Prop> = {}) => {
    const y = heightAt(g, x, z);
    if (y === null) return false;
    const p: Prop = { kind, x, y, z, yaw, ...extra }, boxes = propBoxes(p);
    if (boxes.some(b => overlaps(index, { ...b, y0: b.y0 + 0.6 }) || solids.some(o => o.x0 < b.x1 && b.x0 < o.x1 && o.z0 < b.z1 && b.z0 < o.z1 && Math.abs(o.y0 - b.y0) < 2))) return false;
    props.push(p);
    solids.push(...boxes);
    return true;
  };
  /** Downhill across a cell (the way its debris slid), and its drop. */
  const fall = (i: number, j: number) => {
    const h = (a: number, b: number) => heightAt(g, (i + a) * mk.cell, (j + b) * mk.cell) ?? 0;
    const gx = h(1, 0.5) - h(0, 0.5), gz = h(0.5, 1) - h(0.5, 0);
    return { yaw: Math.atan2(-gx, -gz), drop: Math.hypot(gx, gz) };
  };
  const seen = new Uint8Array(mk.m.length);
  for (let k0 = 0; k0 < mk.m.length; k0++) {
    if (mk.m[k0] !== MARK.ruin || seen[k0]) continue;
    // The patch: its cells, four-connected.
    const cells = [k0];
    seen[k0] = 1;
    for (let n = 0; n < cells.length; n++) {
      const k = cells[n], i = k % mk.w, j = (k - i) / mk.w;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = (j + b) * mk.w + i + a;
        if (i + a >= 0 && i + a < mk.w && j + b >= 0 && j + b < mk.h && mk.m[q] === MARK.ruin && !seen[q]) { seen[q] = 1; cells.push(q); }
      }
    }
    const r = makeRng(hashString(`ruin${k0}`));
    let placed = 0;
    if (cells.length >= BIG) placed += collapse(cells[cells.length >> 1], r);
    for (const k of cells) {
      const i = k % mk.w, j = (k - i) / mk.w, x = (i + 0.2 + rand(r) * 0.6) * mk.cell, z = (j + 0.2 + rand(r) * 0.6) * mk.cell, q = rand(r), f = fall(i, j);
      if (q < 0.2) placed += +put('rubblepile', x, z, rand(r) * 6.3, { w: 1.5 + rand(r) * 2.5 });
      else if (q < 0.28) placed += +put('slab', x, z, f.yaw + (rand(r) - 0.5) * 0.6);
      else if (q < 0.34) placed += +put('rebar', x, z, rand(r) * 6.3);
      else if (q < 0.44) placed += +put('debris', x, z, rand(r) * 6.3);
      else if (q < 0.48) placed += +put('halfwall', x, z, f.yaw + Math.PI / 2, { w: 2 + rand(r) * 2, h: 1 + rand(r) * 2 });
      // Retaining walls with fig roots over the steepest banks, facing downhill from the foot of the bank.
      if (f.drop > 3 && rand(r) < 0.35) props.push({ kind: 'figroots', x: (i + 0.5) * mk.cell, y: (heightAt(g, (i + 0.5) * mk.cell, (j + 0.5) * mk.cell) ?? 0) - f.drop / 2, z: (j + 0.5) * mk.cell, yaw: f.yaw, w: 3, h: f.drop });
    }
    // However small the patch, something of the fighting lies on it.
    for (const k of cells) {
      if (placed) break;
      const i = k % mk.w, j = (k - i) / mk.w;
      for (const [kind, extra] of [['debris', {}], ['rubblepile', { w: 1.5 }], ['rebar', {}]] as const) if (put(kind, (i + 0.5) * mk.cell, (j + 0.5) * mk.cell, rand(r) * 6.3, extra)) { placed++; break; }
    }
  }
  return { props, solids };

  /** A collapsed building at cell k: a broken corner of wall, slabs piled against it, rubble round it. */
  function collapse(k: number, r: Rng): number {
    const i = k % mk.w, j = (k - i) / mk.w, cx = (i + 0.5) * mk.cell, cz = (j + 0.5) * mk.cell, yaw = fall(i, j).yaw, c = Math.cos(yaw), s = Math.sin(yaw);
    // In the heap's frame: u across the slope, v down it.
    const at = (u: number, v: number): [number, number] => [cx + u * c + v * s, cz - u * s + v * c];
    let n = 0;
    n += +put('halfwall', ...at(-2, -1.5), yaw, { w: 4 + rand(r) * 2, h: 2.5 + rand(r) * 2 });
    n += +put('halfwall', ...at(0.5, -3.5), yaw + Math.PI / 2, { w: 3 + rand(r) * 2, h: 1.5 + rand(r) * 2 });
    for (let m = 0; m < 3; m++) n += +put('slab', ...at(-0.5 + m * 1.6, 0.5 + rand(r)), yaw + (rand(r) - 0.5) * 0.8);
    for (let m = 0; m < 4; m++) n += +put('rubblepile', ...at((rand(r) - 0.5) * 7, 1 + rand(r) * 4), rand(r) * 6.3, { w: 2 + rand(r) * 2 });
    n += +put('rebar', ...at(1.5, -1), rand(r) * 6.3);
    return n;
  }
}
