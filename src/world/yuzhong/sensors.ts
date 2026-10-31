// The machines' fixed sensors (M4-11, DESIGN section 7): a turret over each of the factory's gates, looking down the
// road out of it; laser tripwires at shin height across the Grand Tunnel either side of the metro's passage, and
// acoustic sensors on its wall, and another in the underground city's market; motion sensors in the shelters' store
// and pump rooms and the metro concourse. (The bridge's, the police armoury's and the border's turrets come with
// those places.)
import { raycast } from '../geom';
import type { World, Camera } from '../world';

type V3 = { x: number; y: number; z: number };

/** Where along the Grand Tunnel (its u runs from the entrance at 0 to about 210; the friends' side tunnel leaves it
 *  short of 100, the metro's passage at 170) the tripwires and the acoustic sensors are: either side of the metro's
 *  passage, well away from the friends' chamber. How high a tripwire's beam runs, and a turret is mounted over its gate. */
const WIRE_U = [150, 186], EAR_U = [160, 196], BEAM = 0.4, GATE_UP = 7.6, GATE_OUT = 1.2;

/** On the farthest wall within 15 m of a room's middle, 2.2 m up off its floor, looking back across it. */
function onWall(w: World, kind: Camera['kind'], f: V3): Camera | null {
  const down = raycast(w.index, f.x, f.y + 1.5, f.z, 0, -1, 0, 4);
  const y = (down ? f.y + 1.5 - down.t : f.y) + 2.2;
  let best: Camera | null = null, bd = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, dx = Math.sin(a), dz = Math.cos(a), h = raycast(w.index, f.x, y, f.z, dx, 0, dz, 15);
    if (h && h.t > bd) { bd = h.t; best = { kind, x: f.x + dx * (h.t - 0.08), y, z: f.z + dz * (h.t - 0.08), yaw: a + Math.PI }; }
  }
  return best;
}

export function placeSensors(w: World, tunnel: (u: number, v: number) => V3): Camera[] {
  const out: Camera[] = [];
  for (const g of w.features.filter(f => f.kind === 'gate'))
    out.push({ kind: 'turret', x: g.x + g.nx! * GATE_OUT, y: g.y + GATE_UP, z: g.z + g.nz! * GATE_OUT, yaw: Math.atan2(g.nx!, g.nz!) });
  // The Grand Tunnel: across it, wall to wall.
  const across = (u: number) => {
    const o = tunnel(u, 0), b = tunnel(u, 1), d = Math.hypot(b.x - o.x, b.z - o.z), down = raycast(w.index, o.x, o.y + 2, o.z, 0, -1, 0, 4);
    return { a: { ...o, y: down ? o.y + 2 - down.t : o.y }, dx: (b.x - o.x) / d, dz: (b.z - o.z) / d };
  };
  for (const u of WIRE_U) {
    const { a, dx, dz } = across(u), y = a.y + BEAM, l = raycast(w.index, a.x, y, a.z, -dx, 0, -dz, 12), r = raycast(w.index, a.x, y, a.z, dx, 0, dz, 12);
    if (!l || !r) continue;
    const from = { x: a.x - dx * (l.t - 0.05), y, z: a.z - dz * (l.t - 0.05) }, to = { x: a.x + dx * (r.t - 0.05), y, z: a.z + dz * (r.t - 0.05) };
    out.push({ kind: 'tripwire', ...from, yaw: Math.atan2(to.x - from.x, to.z - from.z), to });
  }
  for (const u of EAR_U) {
    const { a, dx, dz } = across(u), y = a.y + 2.5, h = raycast(w.index, a.x, y, a.z, dx, 0, dz, 12);
    if (h) out.push({ kind: 'acoustic', x: a.x + dx * (h.t - 0.06), y, z: a.z + dz * (h.t - 0.06), yaw: Math.atan2(-dx, -dz) });
  }
  for (const f of w.features) {
    const c = f.kind === 'room:market' ? onWall(w, 'acoustic', f) : f.kind === 'room:store' || f.kind === 'room:pump' || f.kind === 'concourse' ? onWall(w, 'pir', f) : null;
    if (c) out.push(c);
  }
  return out;
}
