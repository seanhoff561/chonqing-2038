// Street dressing (M3-34, U-014): every street, plaza, stair street, dock and park tile gets wrecked traffic,
// litter, street furniture, greenery and the occupier's checkpoints, by rules seeded per tile. Big props get
// collision (cars are cover); nothing lands on a building, over a hole or near a door or container.
import { solid, overlaps, raycast, type Solid, type SolidIndex } from '../geom';
import { MAT } from '../mats';
import { rand, randInt, type Rng } from '../../sim/rng';
import { tiles, tileAt, TILE, type Tile } from '../map';
import { PROP_BOX } from '../../data/props';
import type { Prop, Inter } from '../world';
import { tileRng } from './buildings';

const STREET = '.=sb';

/** Collision boxes for a prop: long footprints turned at an angle are split into short AABB segments. */
export function propBoxes(p: Prop): Solid[] {
  const b = PROP_BOX[p.kind];
  if (!b) return [];
  const w = p.kind === 'rubblepile' ? (p.w ?? 2) * 0.8 : b.w, d = p.kind === 'rubblepile' ? (p.w ?? 2) * 0.8 : b.d;
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw), n = Math.max(1, Math.round(d / 1.4)), out: Solid[] = [];
  for (let i = 0; i < n; i++) {
    const z0 = -d / 2 + (i * d) / n, z1 = z0 + d / n;
    const pts = [[-w / 2, z0], [w / 2, z0], [-w / 2, z1], [w / 2, z1]].map(([x, z]) => [p.x + x * c + z * s, p.z - x * s + z * c]);
    const xs = pts.map(q => q[0]), zs = pts.map(q => q[1]);
    out.push(solid(Math.min(...xs), p.y, Math.min(...zs), Math.max(...xs), p.y + b.h, Math.max(...zs), MAT.hidden));
  }
  return out;
}

/** clear: walkways to keep free (tunnel mouths, gates, the feet of stairs). */
export function dressCity(index: SolidIndex, inter: Inter[], clear: { x: number; z: number; r: number }[] = []) {
  const props: Prop[] = [], solids: Solid[] = [];
  // Doors, containers and gates stay clear: a coarse grid of where they are.
  const near = new Set(inter.map(i => `${Math.floor(i.x / 4)},${Math.floor(i.z / 4)}`));
  const busy = (x: number, z: number) => {
    if (clear.some(c => Math.hypot(x - c.x, z - c.z) < c.r)) return true;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (near.has(`${Math.floor(x / 4) + dx},${Math.floor(z / 4) + dz}`)) return true; return false; };
  for (const t of tiles()) {
    if (!STREET.includes(t.type) && t.type !== 'p') continue;
    const r = tileRng(t, 'dress'), placed: Solid[] = [];
    const put = (kind: string, x: number, z: number, yaw: number, extra: Partial<Prop> = {}) => {
      const down = raycast(index, x, t.h + 6, z, 0, -1, 0, 12);
      if (!down || down.ny < 0.7 || busy(x, z)) return false;
      const p: Prop = { kind, x, y: t.h + 6 - down.t, z, yaw, ...extra };
      const boxes = propBoxes(p);
      for (const b of boxes) {
        const lifted = { ...b, y0: b.y0 + 0.05 };
        if (overlaps(index, lifted) || placed.some(o => o.x0 < b.x1 && b.x0 < o.x1 && o.z0 < b.z1 && b.z0 < o.z1)) return false;
      }
      props.push(p); solids.push(...boxes); placed.push(...boxes);
      return true;
    };
    const x0 = t.c * TILE, z0 = t.r * TILE, cx = x0 + TILE / 2, cz = z0 + TILE / 2;
    // On a stair street only the terraces either side take props; the flight down the middle stays clear.
    const stairsAlongZ = t.type === 's' && Math.abs((tileAt(t.c, t.r - 1)?.h ?? t.h) - (tileAt(t.c, t.r + 1)?.h ?? t.h)) >= Math.abs((tileAt(t.c - 1, t.r)?.h ?? t.h) - (tileAt(t.c + 1, t.r)?.h ?? t.h));
    const at = () => {
      let a = 1 + rand(r) * (TILE - 2);
      const b = 1 + rand(r) * (TILE - 2);
      if (t.type === 's') a = rand(r) < 0.5 ? 0.6 + rand(r) * 5.6 : 13.8 + rand(r) * 5.6;
      return t.type === 's' && !stairsAlongZ ? [x0 + b, z0 + a] : [x0 + a, z0 + b];
    };
    const scatter = (kind: string, n: number) => { for (let i = 0; i < n; i++) { const [x, z] = at(); put(kind, x, z, rand(r) * Math.PI * 2); } };
    if (t.type === '=' || t.type === 'b') road(t, r, put);
    else if (t.type === '.') {
      scatter('bike', rand(r) < 0.4 ? 2 + randInt(r, 4) : 0);
      scatter('scooter', randInt(r, 3));
      if (rand(r) < 0.5) scatter('bench', 1);
      if (rand(r) < 0.4) scatter('bin', 1);
      if (rand(r) < 0.35) put('tree', cx + (rand(r) - 0.5) * 14, cz + (rand(r) - 0.5) * 14, rand(r) * 6);
      if (rand(r) < 0.4) put('lamppost', x0 + 2, z0 + 2 + rand(r) * 16, rand(r) < 0.5 ? 0 : Math.PI);
      if (rand(r) < 0.12) scatter('stall', 1);
      if (rand(r) < 0.1) scatter('mahjong', 1);
      if (rand(r) < 0.06) scatter('kiosk', 1);
      if (rand(r) < 0.06) scatter('dronewreck', 1);
      if (rand(r) < 0.05) put('edict', cx, z0 + 3 + rand(r) * 14, rand(r) < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      scatter('pot', randInt(r, 3));
    } else if (t.type === 's') {
      scatter('pot', 1 + randInt(r, 3));
      if (rand(r) < 0.2) scatter('bangbang', 1);
      if (rand(r) < 0.15) scatter('laundry', 1);
      if (rand(r) < 0.1) scatter('stall', 1);
    } else {
      // Hillside parks run wild: trees, figs and scrub.
      scatter('tree', 2 + randInt(r, 4));
      if (rand(r) < 0.4) scatter('figtree', 1);
      scatter('shrub', 2 + randInt(r, 4));
    }
    scatter('weeds', 3 + randInt(r, 5));
    scatter('trash', randInt(r, 3));
    scatter('debris', randInt(r, 2));
    if (rand(r) < 0.25) scatter('boxes', 1);
    if (rand(r) < 0.2) scatter('sign', 1);
    if (rand(r) < 0.15) scatter('rubblepile', 1);
    figRoots(t, r, props);
  }
  return { props, solids };
}

/** Main roads and docks: wrecked traffic along the lanes, the odd bus, lampposts, sometimes a checkpoint. */
function road(t: Tile, r: Rng, put: (kind: string, x: number, z: number, yaw: number, extra?: Partial<Prop>) => boolean) {
  const alongX = tileAt(t.c - 1, t.r)?.type === t.type || tileAt(t.c + 1, t.r)?.type === t.type;
  const x0 = t.c * TILE, z0 = t.r * TILE, cx = x0 + TILE / 2, cz = z0 + TILE / 2;
  const at = (along: number, across: number): [number, number] => (alongX ? [x0 + along, cz + across] : [cx + across, z0 + along]);
  const dir = alongX ? Math.PI / 2 : 0;
  for (let i = 0, n = randInt(r, 4); i < n; i++) {
    const crash = rand(r) < 0.25, [x, z] = at(2 + rand(r) * 16, (rand(r) < 0.5 ? -1 : 1) * (2.5 + rand(r) * 4));
    put(rand(r) < 0.18 ? 'van' : 'car', x, z, dir + (rand(r) < 0.5 ? 0 : Math.PI) + (crash ? (rand(r) - 0.5) * 2.4 : (rand(r) - 0.5) * 0.3));
  }
  if (rand(r) < 0.08) { const [x, z] = at(10, (rand(r) - 0.5) * 4); put('bus', x, z, dir + (rand(r) - 0.5) * 0.4); }
  { const [x, z] = at(10, rand(r) < 0.5 ? -8.6 : 8.6); put('lamppost', x, z, dir); }
  if (rand(r) < 0.3) for (let i = 0, n = 2 + randInt(r, 3); i < n; i++) { const [x, z] = at(4 + i * 1.2, 8 + rand(r)); put('scooter', x, z, dir + Math.PI / 2 + (rand(r) - 0.5) * 0.6); }
  if (rand(r) < 0.18) { const [x, z] = at(4 + rand(r) * 12, (rand(r) < 0.5 ? -1 : 1) * 8.5); put('tree', x, z, rand(r) * 6); }
  if (rand(r) < 0.07) {
    // An occupier checkpoint across the road: barriers with a scanner gate in the gap and a camera.
    for (const a of [-7.5, -5.5, -3.5, 3.5, 5.5, 7.5]) { const [x, z] = at(10, a); put('jersey', x, z, dir + Math.PI / 2); }
    { const [x, z] = at(10, 0); put('scanner', x, z, dir); }
    { const [x, z] = at(12, -9); put('campole', x, z, dir); }
    { const [x, z] = at(16, 8.4); put('edict', x, z, dir + Math.PI); }
  }
}

/** Fig roots spill over a retaining wall where the ground drops 3 m or more to the next tile. */
function figRoots(t: Tile, r: Rng, props: Prop[]) {
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const o = tileAt(t.c + dc, t.r + dr);
    if (!o || t.h - o.h < 3 || !STREET.includes(o.type) || rand(r) > 0.35) continue;
    const ex = t.c * TILE + TILE / 2 + dc * TILE / 2, ez = t.r * TILE + TILE / 2 + dr * TILE / 2, off = (rand(r) - 0.5) * 12;
    props.push({ kind: 'figroots', x: ex + (dr ? off : 0), y: o.h, z: ez + (dc ? off : 0), yaw: Math.atan2(dc, dr), w: 3 + rand(r) * 3, h: t.h - o.h });
  }
}

