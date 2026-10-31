// The machines' beats as walked (M4-01, U-024, U-028): the street patrols the network laid along the main roads
// (M3-37) and each district's own along its main streets, each given its walker (delivery robots on the flat ones, quadrupeds and humanoids on the rest) and its
// detours off the clear street: into an alley to look behind the bins, in at a street door to a building's ground
// floor, pausing there before coming back out; the drones drop into alleys off their lines. And beats under the
// ground: a quadruped through the underground city's halls and passages, a humanoid along the Grand Tunnel past the
// friends' stub, waiting at the metro's end.
import { raycast } from '../geom';
import { DWELL } from '../../data/units';
import type { World, Patrol, Camera } from '../world';
import { heightAt } from '../heightfield';
import { GEO } from '../geo';

/** The districts given beats of their own, the streets those run, and the side streets beats break off along. */
const DISTRICTS = ['jiefangbei', 'jiaochangkou', 'shibati', 'xiaoshizi', 'hongyadong', 'chaotianmen'];
const MAIN = new Set(['primary', 'secondary', 'tertiary']);
const SIDE = new Set(['residential', 'service', 'footway', 'path', 'pedestrian', 'living_street', 'steps', 'unclassified', 'tertiary']);

type V3 = { x: number; y: number; z: number };

/** Whether nothing stands between a and b, up off them by `up`. */
function clear(w: World, a: V3, b: V3, up: number) {
  const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  return d < 0.1 || !raycast(w.index, a.x, a.y + up, a.z, (b.x - a.x) / d, (b.y - a.y) / d, (b.z - a.z) / d, d);
}

/** Whether a walker can go straight from a to b: nothing in the way at 1 m up, and ground under b. */
function straight(w: World, a: V3, b: V3) {
  if (!clear(w, a, b, 1)) return false;
  const down = raycast(w.index, b.x, b.y + 1, b.z, 0, -1, 0, 3);
  return !!down && Math.abs(down.t - 1) < 0.6;
}

export function walkedBeats(w: World, base: Patrol[], tunnel: [V3, V3]): Patrol[] {
  // The bins and crates to look behind: the alleys' and the streets' (their hiding spots, M3-47).
  const hides = w.hides.filter(h => h.kind === 'crate' || h.kind === 'dumpster' || h.kind === 'drum').map(h => ({ x: (h.inner.x0 + h.inner.x1) / 2, y: h.inner.y0, z: (h.inner.z0 + h.inner.z1) / 2 }));
  const doors = w.plots.filter(p => !p.far && p.route && p.route.length > 1).map(p => [p.route![0], p.route![1]] as [V3, V3]);
  const g = w.ground!, sides = w.streets.filter(st => SIDE.has(st.kind));
  /** From a point on a side street: beside the bins in an alley within 15 m, or in at a door within 15 m. */
  const toAlley = (q: V3): V3[] | null => {
    for (const h of hides) {
      const d = Math.hypot(q.x - h.x, q.z - h.z);
      if (d > 15 || d < 1.5) continue;
      const by = { x: h.x + ((q.x - h.x) / d) * 1.2, y: h.y, z: h.z + ((q.z - h.z) / d) * 1.2 };
      if (straight(w, q, by)) return [by];
    }
    return null;
  };
  const toDoor = (q: V3): V3[] | null => { for (const [door, inside] of doors) if (Math.hypot(door.x - q.x, door.z - q.z) < 15 && straight(w, q, door) && straight(w, door, inside)) return [door, inside]; return null; };
  // The districts' own beats: their two longest main streets within 300 m of their centres.
  const district: Patrol[] = [];
  for (const k of DISTRICTS) {
    const L = GEO.landmarks[k], runs: V3[][] = [];
    for (const st of w.streets) {
      if (!MAIN.has(st.kind)) continue;
      let run: V3[] = [];
      for (const [x, z] of [...st.pts, [Infinity, Infinity] as [number, number]]) {
        if (Math.hypot(x - L.x, z - L.z) < 300) run.push({ x, y: heightAt(g, x, z) ?? 0, z });
        else { if (run.length > 1) runs.push(run); run = []; }
      }
    }
    const len = (r: V3[]) => r.slice(1).reduce((a, q, i) => a + Math.hypot(q.x - r[i].x, q.z - r[i].z), 0);
    for (const r of runs.filter(q => len(q) > 120).sort((a, b) => len(b) - len(a)).slice(0, 2)) district.push({ kind: 'street', unit: 'quadruped', pts: r, dwell: r.map((_, i) => (i === 0 || i === r.length - 1 ? DWELL.end : 0)), hours: [0, 24] });
  }
  let street = 0;
  const out = base.concat(district).map((p): Patrol => {
    // A drone drops into an alley now and then, to 6 m over the bins, hangs there, and climbs back to its line.
    if (p.kind === 'drone') {
      const pts: V3[] = [], dwell: number[] = [];
      let dips = 0;
      p.pts.forEach((q, i) => {
        pts.push(q); dwell.push(p.dwell[i]);
        if (i % 3 !== 1 || dips >= 4) return;
        const h = hides.find(f => Math.hypot(f.x - q.x, f.z - q.z) < 30 && clear(w, q, { x: f.x, y: f.y + 6, z: f.z }, 0));
        if (!h) return;
        pts.push({ x: h.x, y: h.y + 6, z: h.z }, q); dwell.push(DWELL.alley, 0);
        dips++;
      });
      return { ...p, pts, dwell };
    }
    if (p.kind !== 'street') return p;
    // Flat and long: a delivery robot's (no stairs, no detours). Otherwise quadrupeds and humanoids by turns.
    const steep = p.pts.slice(1).some((q, i) => Math.abs(q.y - p.pts[i].y) > 0.06 * Math.hypot(q.x - p.pts[i].x, q.z - p.pts[i].z) + 0.2);
    if (!steep && p.pts.length > 2) return { ...p, unit: 'delivery' };
    const unit = street++ % 2 ? 'humanoid' : 'quadruped', pts: V3[] = [], dwell: number[] = [];
    // (Looked along every 10 m or so for a side street.)
    const line: V3[] = [], rest: number[] = [];
    p.pts.forEach((q, i) => {
      if (i) { const a = p.pts[i - 1], n = Math.floor(Math.hypot(q.x - a.x, q.z - a.z) / 10); for (let k = 1; k < n; k++) { line.push({ x: a.x + ((q.x - a.x) * k) / n, y: a.y + ((q.y - a.y) * k) / n, z: a.z + ((q.z - a.z) * k) / n }); rest.push(0); } }
      line.push(q); rest.push(p.dwell[i]);
    });
    let since = 60, spurs = 0;
    line.forEach((q, i) => {
      pts.push(q); dwell.push(rest[i]);
      since += i ? Math.hypot(q.x - line[i - 1].x, q.z - line[i - 1].z) : 0;
      if (since < 100 || spurs >= 4 || i === line.length - 1) return;
      // Off along a side street (up to 60 m of it), into an alley beside the bins or in at a door to the floor
      // inside, by turns (the other if there's none of the one); out the same way.
      const near = (x: number, z: number, r: number) => Math.hypot(x - q.x, z - q.z) < r;
      let way: V3[] | null = null, alley = false;
      for (const side of sides) {
        const k = side.pts.findIndex(([x, z]) => near(x, z, 12));
        if (k < 0) continue;
        for (const dir of [1, -1]) {
          const walk: V3[] = [];
          let from = q;
          for (let j = k, run = 0; j >= 0 && j < side.pts.length && run < 60; j += dir) {
            const [x, z] = side.pts[j], v = { x, y: heightAt(g, x, z) ?? q.y, z };
            if (!straight(w, from, v)) break;
            run += Math.hypot(v.x - from.x, v.z - from.z); walk.push(v); from = v;
            const goes = spurs % 2 === 0 ? [toAlley, toDoor] : [toDoor, toAlley];
            for (const go of goes) { const t = go(from); if (t) { way = [...walk, ...t]; alley = go === toAlley; break; } }
            if (way) break;
          }
          if (way) break;
        }
        if (way) break;
      }
      if (!way) return;
      way.forEach((v, k) => { pts.push(v); dwell.push(k === way.length - 1 ? (alley ? DWELL.alley : DWELL.inside) : 0); });
      for (let k = way.length - 2; k >= 0; k--) { pts.push(way[k]); dwell.push(0); }
      pts.push(q); dwell.push(0);
      since = 0; spurs++;
    });
    return { ...p, unit, pts, dwell };
  });
  // Under the ground: the underground city's route end to end, and the Grand Tunnel from the friends' stub to the
  // metro's, a long wait at the metro end.
  const under = w.features.filter(f => f.kind === 'underRoute').sort((a, b) => a.group - b.group).map(f => ({ x: f.x, y: f.y, z: f.z }));
  if (under.length > 1) out.push({ kind: 'under', unit: 'quadruped', pts: under, dwell: under.map((_, i) => (i === 0 || i === under.length - 1 ? DWELL.end * 3 : 0)), hours: [0, 24] });
  out.push({ kind: 'under', unit: 'humanoid', pts: tunnel, dwell: [DWELL.end, DWELL.tunnel], hours: [0, 24] });
  return out;
}

/** Where a column's pair peels off (M4-01b): beside the bins in alleys within 20 m of its way, one every 150 m or so,
 *  reached straight from it. */
export function columnSpurs(w: World, pts: V3[]): { s: number; at: V3 }[] {
  const hides = w.features.filter(f => f.kind === 'crate' || f.kind === 'dumpster'), out: { s: number; at: V3 }[] = [];
  let s = 0, last = -100;
  pts.forEach((q, i) => {
    if (i) s += Math.hypot(q.x - pts[i - 1].x, q.z - pts[i - 1].z);
    if (s - last < 150) return;
    for (const h of hides) {
      const d = Math.hypot(q.x - h.x, q.z - h.z);
      if (d > 20 || d < 2) continue;
      const by = { x: h.x + ((q.x - h.x) / d) * 1.2, y: h.y, z: h.z + ((q.z - h.z) / d) * 1.2 };
      if (straight(w, q, by)) { out.push({ s, at: by }); last = s; break; }
    }
  });
  return out;
}

/** The cameras (M4-07, U-038: commonplace, so he's always on edge): every smart lamppost's, looking along its street;
 *  every camera pole's at the junctions; one over every third street door in the districts, looking out from it; and
 *  at each district's centre a sweeper, on the lamppost nearest it. */
export function placeCameras(w: World): Camera[] {
  const out: Camera[] = [];
  for (const p of w.props) {
    if (p.kind === 'lamppost') out.push({ kind: 'lamppost', x: p.x + Math.sin(p.yaw) * 0.25, y: p.y + 6.2, z: p.z + Math.cos(p.yaw) * 0.25, yaw: p.yaw });
    else if (p.kind === 'campole') out.push({ kind: 'camera', x: p.x + Math.sin(p.yaw) * 0.2, y: p.y + 4.4, z: p.z + Math.cos(p.yaw) * 0.2, yaw: p.yaw });
  }
  const near = (x: number, z: number) => DISTRICTS.some(k => Math.hypot(x - GEO.landmarks[k].x, z - GEO.landmarks[k].z) < 400);
  w.plots.filter(p => !p.far && p.route && p.route.length > 1 && near(p.route[0].x, p.route[0].z)).forEach((p, i) => {
    if (i % 3) return;
    const [door, inside] = p.route!, dx = door.x - inside.x, dz = door.z - inside.z, d = Math.hypot(dx, dz) || 1;
    out.push({ kind: 'camera', x: door.x - (dx / d) * 0.6, y: door.y + 2.8, z: door.z - (dz / d) * 0.6, yaw: Math.atan2(dx, dz) });
  });
  for (const k of DISTRICTS) {
    const L = GEO.landmarks[k];
    let best = -1, bd = 150;
    out.forEach((c, i) => { const d = Math.hypot(c.x - L.x, c.z - L.z); if (c.kind === 'lamppost' && d < bd) { bd = d; best = i; } });
    if (best >= 0) out[best] = { ...out[best], kind: 'sweeper' };
  }
  return out;
}
