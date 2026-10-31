// Yuzhong at 1:1 (M3-41b, D-016): the real ground, streets, stairs, bridges and buildings of the eastern
// peninsula from the geo data. Each lot is built by the city's lot code in its own unturned frame, then turned
// into place.
import { solid, rampSolid, turn, buildIndex, raycast, carve, type Solid } from '../geom';
import { HUNG, PROP_BOX, PROP_HIDE } from '../../data/props';
import { makeWorld, type World, type Teleport, type Prop, type Inter, type Climbable, type HideSpot, type Site, type Plot } from '../world';
import { MAT } from '../mats';
import { makeRng, hashString } from '../../sim/rng';
import { buildLot, PARAPET, type Fabric, type Lot } from '../city/buildings';
import { stepsFor } from '../steps';
import { findMarks } from './marks';
import { greenery, trunk } from './green';
import { layout, doorPaths } from './layout';
import { ruins } from './ruins';
import { fill } from './fill';
import { GEO } from '../geo';
import { heightAt, type Heightfield } from '../heightfield';
import { buildGround, streets, onGround, WATER_Y, streetCells, type Street } from './ground';
import { planLots, levelLots, markEnterable, oldQuarter, type Plan } from './lots';
import { corners, rasterPoly, obbOverlap, type Obb } from './shapes';
import { alleys } from '../city/climb';
import { buildTunnels, tunnelFrame, JUNCTION, METRO } from './tunnels';
import { buildUnder } from './under';
import { buildSite } from './site';
import { podiumMask, buildFactory } from './factory';
import { verticalCity } from './vertical';
import { crossings, layLinks, windowBridges } from './crossings';
import { underLot } from './undercity';
import { pickGates, placeGates, network, isolated } from './network';
import { buildLine2, stationEntrances, BEAM } from './line2';
import { dressStreets } from './dressing';
import { sewers } from './sewers';
import { breaches } from './breach';
import { signage } from './signage';
import { liFlat } from './liflat';
import { riverfront, riverRoad } from './riverfront';
import { streetRoute } from './streetroute';
import { buildNav, walksOf } from './nav';
import { walkedBeats, columnSpurs, placeCameras } from './patrols';
import { placeSensors } from './sensors';

const empty = (): Fabric => ({ solids: [], decor: [], props: [], lots: [], inter: [], climbables: [], hides: [], features: [], sites: [], far: [] });

export function buildYuzhong(): World {
  const g = buildGround(), sts = streets();
  // The set pieces cut and level the ground first; lots keep clear of them.
  const tun = buildTunnels(g, sts), site = buildSite(g), line = buildLine2(g);
  const land = landMask(g), metro = stationEntrances(g, sts.filter(onGround), land), block = new Uint8Array(g.y.length), mark = (poly: [number, number][], m = block) => rasterPoly(poly, 0, 0, g.cell, g.w, g.h, (i0, i1, j) => m.fill(1, j * g.w + i0, j * g.w + i1 + 1));
  // The underground network off the Grand Tunnel (M3-58), its ways in kept clear of lots.
  const { W: tw } = tunnelFrame(), gtAt = (uu: number, vv: number) => { const [x, z] = tw(uu, vv); return { x, y: tun.frame.floor, z }; };
  const under = buildUnder(g, { floor: tun.frame.floor, junction: tun.at.junction, ways: [tun.at.entrance, tun.at.exit, tun.at.grate], walk: [gtAt(195, 0), gtAt(JUNCTION.u, 0), gtAt(JUNCTION.u, 8)],
    // (M3-43: the metro's stub, and from it along the Grand Tunnel and down the side tunnel into the chamber.)
    metro: tun.at.metro, toHideout: [gtAt(METRO.u, 8), gtAt(METRO.u, 0), gtAt(130, 0), gtAt(90, 0), tun.at.sideTop, tun.at.sideFoot, tun.at.mattress] });
  for (const o of tun.keep.concat(metro.keep, under.keep)) mark(corners({ ...o, hw: o.hw + KEEP, hd: o.hd + KEEP }));
  for (const b of line.beams) for (let k = 0; k + 1 < b.pts.length; k++) {
    const [[ax, az], [bx, bz]] = [b.pts[k], b.pts[k + 1]];
    mark(corners({ cx: (ax + bx) / 2, cz: (az + bz) / 2, hw: Math.hypot(bx - ax, bz - az) / 2 + 1, hd: BEAM.w / 2 + 3, yaw: Math.atan2(bz - az, bx - ax) }));
  }
  if (site) { const m = new Uint8Array(g.y.length); mark(site.poly, m); dilate(g, m, KEEP); for (let k = 0; k < m.length; k++) block[k] |= m[k]; }
  // The factory covers Raffles City's podium round its towers (M3-57b).
  const pod = podiumMask(g, block), unblocked = block.slice();
  for (let k = 0; k < pod.length; k++) block[k] |= pod[k];
  const plans = planLots(g, sts, land, block);
  // The start hideout's alley keeps its levelled paving: the lots' aprons stop at it.
  const lane: [number, number][] = [];
  rasterPoly(corners(tun.alley), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) lane.push([k, g.y[k]]); });
  levelLots(g, plans);
  markEnterable(g, plans);
  for (const [k, y] of lane) g.y[k] = y;
  const fac = buildFactory(g, pod, sts);
  // What its halls leave of the podium is open ground like any other, to fill.
  if (fac) for (let k = 0; k < pod.length; k++) block[k] = unblocked[k] | fac.under[k];
  const out = empty(), plots: Plot[] = [];
  // A few caches only a grappling hook reaches (M3-37, U-037): chosen first, so nothing gives them a hold.
  const gatePairs = pickGates(plans, makeRng(hashString('gates')));
  // (Round the caches nothing changes: what keeps them out of reach was judged at these heights.)
  oldQuarter(plans, new Set(plans.filter(p => gatePairs.some(([c]) => Math.hypot(p.obb.cx - c.obb.cx, p.obb.cz - c.obb.cz) < 60)).concat(gatePairs.flat())));
  // Bridged, stacked and built over (M3-57): it may set roofs to meet, so before the lots are built.
  const vert = verticalCity(plans, g, sts);
  // The connections across the streets and between close buildings (M3-37a): roofs may still be set to meet.
  const cross = crossings(plans, g, sts, vert.used!);
  // Each tower's skyline (U-036): the highest roof within 25 m of it.
  for (const p of plans) if (p.kind === 'tower' && !p.far) {
    p.sky = p.base;
    for (const q of plans) if (q !== p && !q.far && q.wall > p.sky && Math.hypot(q.obb.cx - p.obb.cx, q.obb.cz - p.obb.cz) < p.obb.hw + p.obb.hd + q.obb.hw + q.obb.hd + 25 && obbOverlap(p.obb, q.obb, 12.5)) p.sky = q.wall;
  }
  plans.forEach((p, n) => plots.push(buildPlan(p, n, out, g)));
  rowAlleys(plans, out, g);
  // Holes knocked through from one building into the next where their floors meet (M3-76).
  breaches(out);
  // The connections between them, each end on its wall (M3-81); planks out of windows across to a window or a roof.
  const built = buildIndex(out.solids);
  layLinks(vert, built);
  layLinks(cross, built);
  windowBridges(out.features.filter(f => f.kind.startsWith('win:')), built, cross);
  // The sewer maze under the basements (M3-73a).
  const sew = sewers(out.features.filter(f => f.kind === 'sewer'), plots, g, under.route, tun.zones.map(z => z.box), under.solids, under.zones.map(z => z.box));
  // Shibati's stair (M3-18): the stepped street nearest the landmark, its top and its foot. The district's key points
  // (M3-21): the hideout's grate, Jiaochangkou, the top of the stair, the riverfront; three layers of routes join them.
  const SB = GEO.landmarks.shibati, near = (s: Street) => Math.min(...s.pts.map(([x, z]) => Math.hypot(x - SB.x, z - SB.z)));
  const stair = sts.filter(s => s.steps && onGround(s)).sort((a, b) => near(a) - near(b))[0], sh = stair.pts.map(([x, z]) => hAt(g, x, z));
  const [top, foot] = [stair.pts[sh.indexOf(Math.max(...sh))], stair.pts[sh.indexOf(Math.min(...sh))]], JK = GEO.landmarks.jiaochangkou;
  const keys = [{ name: 'hideout gate', at: tun.at.grate }, { name: 'jiaochangkou', at: { x: JK.x, y: hAt(g, JK.x, JK.z), z: JK.z } },
    { name: 'shibati top', at: { x: top[0], y: hAt(g, top[0], top[1]), z: top[1] } }, { name: 'riverfront', at: riverRoad(g, sts, { x: foot[0], z: foot[1] }) }], joins: [number, number][] = [[0, 1], [1, 2], [2, 3]];
  // The caches, and the route network over everything that joins the roofs (M3-37).
  const gates = placeGates(gatePairs.filter(q => isolated(q, plans)), out), L0 = GEO.landmarks, lm = (k: string) => ({ x: L0[k].x, y: 0, z: L0[k].z });
  const net = network(plots, out.features.concat(vert.features, cross.features, under.features, sew.features), out.sites, sts, g,
    [['jiaochangkou', 'shibati', 'jiefangbei', 'cablewayNorth', 'xiaoshizi', 'chaotianmen'].map(lm), ['jiefangbei', 'xinhuaIntl', 'hongyadong', 'chaotianmen'].map(lm)],
    { x: tun.at.grate.x, y: tun.at.grate.y, z: tun.at.grate.z }, cross, gates, buildIndex(out.solids), keys, joins);
  // The underground city's buildings (M3-73), as they stand (after the routes: the surface's network doesn't run
  // through the cavern under it).
  under.lots.forEach((s, k) => { const { l, f } = underLot(s, k); place(f, { cx: (l.x0 + l.x1) / 2, cz: (l.z0 + l.z1) / 2, hw: (l.x1 - l.x0) / 2, hd: (l.z1 - l.z0) / 2, yaw: 0 }, `under${k}`, out); });
  // The streets as drawn, and paths from the doors set back from them to them (U-033).
  const drawn = drawnStreets(sts.filter(onGround), plots), doorWays = doorPaths(g, plots, drawn);
  const decor: Solid[] = [];
  // Streets are drawn along their lines (render/streets.ts); stairs get their steps here, bridges their decks.
  for (const s of sts) if (onGround(s) && s.steps) surface(s, g, decor); else if (s.bridge && s.layer > 0) bridge(s, g, out.solids);
  const [W, H] = GEO.size;
  const L = GEO.landmarks, at = (k: string, yaw = 0): Teleport => ({ name: k, x: L[k].x, y: hAt(g, L[k].x, L[k].z) + 1.5, z: L[k].z, yaw });
  const hide = { name: "Friends' hideout (vent grate)", x: tun.at.spawn.x, y: tun.at.spawn.y + 0.05, z: tun.at.spawn.z, yaw: -Math.PI / 2 - tun.frame.yaw };
  // (Looking down the stepped street from its mouth.)
  const dw = under.features.find(f => f.kind === 'way:descent'), descentYaw = dw ? Math.atan2(-dw.nx!, -dw.nz!) : 0;
  // Shibati's stair from its top looking down and from its foot looking up (M3-18); the beam of Line 2 a third of the
  // way along its longest run, looking along it.
  const look = (a: [number, number], b: [number, number]) => Math.atan2(a[0] - b[0], a[1] - b[1]);
  const run = line.beams.reduce((a, b) => (b.pts.length > a.pts.length ? b : a)), bi = Math.floor(run.pts.length / 3), bn = run.pts[Math.min(run.pts.length - 1, bi + 1)];
  const teleports = ['jiefangbei', 'shibati', 'jiaochangkou', 'hongyadong', 'xiaoshizi', 'chaotianmen', 'cablewayNorth'].map(k => at(k)).concat([
    { name: 'Shibati top', x: top[0], y: hAt(g, top[0], top[1]) + 1.5, z: top[1], yaw: look(top, foot) },
    { name: 'Shibati bottom', x: foot[0], y: hAt(g, foot[0], foot[1]) + 1.5, z: foot[1], yaw: look(foot, top) },
    { name: 'Line 2 beam', x: run.pts[bi][0], y: run.top[bi] + 0.3, z: run.pts[bi][1], yaw: look(run.pts[bi], bn) },
    hide,
    // The Grand Tunnel's junctions: the friends' stub and the metro's (M3-18).
    { name: 'Tunnel junction (hideout)', x: tun.at.junction.x, y: tun.at.junction.y + 0.3, z: tun.at.junction.z, yaw: 0 },
    { name: 'Tunnel junction (metro)', x: tun.at.metro.x, y: tun.at.metro.y + 0.3, z: tun.at.metro.z, yaw: 0 },
    { name: 'Grand Tunnel entrance', x: tun.at.entrance.x, y: tun.at.entrance.y + 0.05, z: tun.at.entrance.z, yaw: Math.PI / 2 - tun.frame.yaw },
    { name: 'Grand Tunnel exit', x: tun.at.exit.x, y: tun.at.exit.y + 0.05, z: tun.at.exit.z, yaw: 0 },
    { name: 'Line 2 stalled train', x: line.train.x, y: line.train.top + 0.45, z: line.train.z, yaw: Math.PI / 2 - line.train.yaw },
    // The vertical city's pieces (M3-57): on a skybridge, in a lane under a block, at a roof street's ramp, on a
    // roof under a megastructure.
    ...([['skybridge', 'Skybridge', 0, 0], ['overLane', 'Block over a lane', 0, -4.4], ['roofStreet', 'Roof street', -2, 0.3], ['mega', 'Megastructure', 0, -4.2]] as const).flatMap(([k, name, out, up]) =>
      vert.features.filter((f, i, all) => f.kind === k && !all.some((q, j) => j < i && q.group === f.group)).slice(0, 3).map((f, n) => ({ name: `${name} ${n + 1}`, x: f.x + f.nx! * out, y: f.y + up + 1.5, z: f.z + f.nz! * out, yaw: Math.atan2(f.nx!, f.nz!) }))),
    // Down below (M3-58).
    { name: 'Underground city deck', x: under.at.deck.x, y: under.at.deck.y + 1.5, z: under.at.deck.z, yaw: 0 },
    { name: 'Underground city concourse', x: under.at.concourse.x, y: under.at.concourse.y + 1.5, z: under.at.concourse.z, yaw: 0 },
    { name: 'Jiaochangkou metro', x: under.at.jiaochangkou.x, y: under.at.jiaochangkou.y + 1.5, z: under.at.jiaochangkou.z, yaw: -Math.PI / 2 },
    { name: 'Underground Xiaoshizi', x: under.at.xiaoshizi.x, y: under.at.xiaoshizi.y + 1.5, z: under.at.xiaoshizi.z, yaw: 0 },
    // The metro and the old tunnels (M3-68): a platform, the running tunnel, a shelter, a stepped street's mouth.
    ...([['station', 'Metro station Jiefangbei', -Math.PI / 2], ['metro', 'Metro tunnel', -Math.PI / 2], ['shelter', 'Air-raid shelter', 0], ['descent', 'Stepped street down', 0]] as const)
      .filter(([k]) => under.at[k]).map(([k, name, yaw]) => ({ name, x: under.at[k].x, y: under.at[k].y + 1.5, z: under.at[k].z, yaw: k === 'descent' ? descentYaw : yaw })),
    ...under.features.filter(f => f.kind === 'way:culvert' || f.kind === 'way:drain').map((f, n) => ({ name: `${f.kind === 'way:drain' ? 'Drain' : 'Culvert'} mouth ${n + 1}`, x: f.x, y: f.y + 1.5, z: f.z, yaw: 0 })),
    ...(fac?.gates ?? []).map((q, n) => ({ name: `Factory gate ${n + 1}`, x: q.x + q.nx * 16, y: q.y + 1.5, z: q.z + q.nz * 16, yaw: Math.atan2(q.nx, q.nz) })),
  ], metro.at.map(m => ({ name: `Metro ${m.name}`, x: m.x, y: hAt(g, m.x, m.z) + 1.5, z: m.z, yaw: 0 })),
  // Vantage ledges high on the towers (M3-57a), looking out.
  out.features.filter(f => f.kind === 'vantage').map((f, n) => ({ name: `Vantage ${n + 1}`, x: f.x, y: f.y + 1.6, z: f.z, yaw: Math.atan2(-f.nx!, -f.nz!) })), site ? [
    { name: 'Construction site', x: site.frame.x, y: site.base + 0.05, z: site.frame.z, yaw: 0 },
    { name: 'Construction site crane', x: site.crane.x, y: site.crane.top + 2.55, z: site.crane.z, yaw: 0 },
  ] : []);
  const solids = out.solids.concat(line.solids, metro.solids, site?.solids ?? [], fac?.solids ?? [], vert.solids, cross.solids, under.solids, sew.solids, tun.solids), inter = out.inter.concat(sew.inter, tun.inter, line.inter, under.inter);
  // The tunnel gate's door switches its own collision solid, the tunnels' last.
  tun.inter.find(i => i.id === 'shibati-gate')!.data!.solid = solids.length - 1;
  // Street dressing goes last, round everything else (its solids append, so the gate's index holds).
  const clear = [tun.at.entrance, tun.at.exit, tun.at.grate, ...metro.at].map(q => ({ x: q.x, z: q.z, r: 9 })).concat(site ? [{ x: site.frame.x, z: site.frame.z, r: 50 }] : [],
    plots.filter(p => p.route).map(p => ({ x: p.route![0].x, z: p.route![0].z, r: 2.5 })),
    (fac?.gates ?? []).map(q => ({ x: q.x + q.nx * 8, z: q.z + q.nz * 8, r: 13 })), under.features.map(f => ({ x: f.x, z: f.z, r: 6 })));
  const dress = dressStreets(buildIndex(solids, g), g, sts, land, inter, clear);
  solids.push(...dress.solids);
  // Then the green and the ruins on the marked open ground, round all that.
  // The parks laid out first (M3-60, U-033), the green and the ruins round them.
  const marks = findMarks(g, land, plots, block), laid = layout(buildIndex(solids, g), g, marks, land);
  solids.push(...laid.solids);
  const idx = buildIndex(solids, g), green = greenery(idx, g, marks), rubble = ruins(idx, g, marks);
  solids.push(...green.solids, ...rubble.solids);
  // And the rest of the open ground filled, round all of it. (No cables strung over the streets: ziplines are
  // the player's to rig, U-034.)
  const filled = fill(buildIndex(solids, g), g, marks, plots);
  solids.push(...filled.solids);
  // The riverfront below Shibati (M3-20): the wall along the road, the steps down into the Yangtze.
  const river = riverfront(buildIndex(solids, g), g, sts, { x: foot[0], z: foot[1] });
  solids.push(...river.solids);
  const world = makeWorld({
    name: 'yuzhong', routes: net.routes, patrols: net.patrols, gates, solids, decor: decor.concat(river.decor, out.decor, tun.decor, line.decor, site?.decor ?? [], fac?.decor ?? [], vert.decor, cross.decor, under.decor, sew.decor, laid.decor, filled.decor),
    props: out.props.concat(river.props, tun.props, line.props, metro.props, site?.props ?? [], fac?.props ?? [], under.props, sew.props, laid.props, dress.props, green.props, rubble.props, filled.props), inter, climbables: out.climbables.concat(sew.climbables, tun.climbables, line.climbables, site?.climbables ?? [], vert.climbables, under.climbables, dress.climbables),
    hides: out.hides, sites: out.sites.concat(tun.sites), zones: tun.zones.concat(under.zones, sew.zones),
    far: out.far.concat(fac?.far ?? [], vert.far), ground: g, plots, features: out.features.concat(river.features, fac?.features ?? [], vert.features, cross.features, rubble.features, under.features, sew.features, laid.features, dress.features, under.route.map((q, n) => ({ kind: 'underRoute', ...q, group: n })), under.metroRoute.map((q, n) => ({ kind: 'metroRoute', ...q, group: n })), under.descents.flatMap((d, i) => d.map((q, n) => ({ kind: 'descentRoute', ...q, group: i * 100 + n })))), marks, lawns: laid.lawns, convoys: fac?.convoys.map(pts => ({ pts, spurs: [] })), streets: drawn.concat(laid.paths, doorWays), water: [{ x0: 0, y0: WATER_Y - 40, z0: 0, x1: W, y1: WATER_Y, z1: H }, ...sew.water],
    teleports, spawn: hide,
  });
  // Nothing floats or sinks (M3-56): whatever stands on something above ground settles onto what's under it, or
  // comes up out of the ground onto it (the set pieces' props below ground are where they are on purpose).
  // (Props placed with collision were set on their support; the buildings' and alleys' props carry none.)
  const placed = new Set(dress.props.concat(green.props, rubble.props, filled.props));
  for (const p of out.props.concat(dress.props, green.props, rubble.props, filled.props)) {
    if (HUNG.has(p.kind) || (PROP_BOX[p.kind] && placed.has(p))) continue;
    // (Well under the ground, in a basement or the underground city, onto what's under it there.)
    const gy = heightAt(g, p.x, p.z) ?? p.y, from = (p.y < gy - 2.5 ? p.y : Math.max(p.y, gy)) + 0.5, hit = raycast(world.index, p.x, from, p.z, 0, -1, 0, 30);
    if (hit && hit.t > 0.01) p.y = from - hit.t;
  }
  // The big trees climbable up their trunks, wherever they were planted (U-035, M3-62).
  for (const p of world.props) { const c = trunk(p); if (c) world.climbables.push(c); }
  // Signs and screens only where they face a street with nothing in front of them; laundry only where both ends of
  // its cord meet a wall (U-031).
  const SIGNS = new Set(['neonblade', 'ledscreen', 'ledboard', 'redbanner']);
  world.props = world.props.filter(p => {
    if (p.kind === 'laundry' && p.w) {
      const ux = Math.cos(p.yaw), uz = -Math.sin(p.yaw), half = p.w / 2;
      return [-1, 1].every(s => { const h = raycast(world.index, p.x, p.y + 2.3, p.z, ux * s, 0, uz * s, half + 0.4); return !!h && h.t > half - 0.6; });
    }
    if (!SIGNS.has(p.kind)) return true;
    const dx = Math.sin(p.yaw), dz = Math.cos(p.yaw), y = p.y + 0.5;
    // Under the ground (the underground city's streets): nothing in front of it across the street.
    if (p.y < (heightAt(g, p.x, p.z) ?? -Infinity) - 4) return !raycast(world.index, p.x + dx * 1.2, y, p.z + dz * 1.2, dx, 0, dz, 4);
    for (let d = 1.5; d <= 14; d += 1) {
      const x = p.x + dx * d, z = p.z + dz * d, k = Math.round(z / g.cell) * g.w + Math.round(x / g.cell);
      if (streetCells[k]) return !raycast(world.index, p.x + dx * 1.2, y, p.z + dz * 1.2, dx, 0, dz, d - 1.2);
    }
    return false;
  });
  // Dumpsters, drums, kiosks, car boots and the backs of vans are places to hide (M3-47).
  for (const p of world.props) {
    const h = PROP_HIDE[p.kind];
    if (!h) continue;
    const x = p.x + Math.sin(p.yaw) * h.z, z = p.z + Math.cos(p.yaw) * h.z;
    world.hides.push({ id: world.hides.length, kind: h.kind, yaw: p.yaw, inner: { x0: x - h.w / 2, y0: p.y + h.y, z0: z - h.d / 2, x1: x + h.w / 2, y1: p.y + h.y + h.h, z1: z + h.d / 2 } });
  }
  liFlat(world);
  // The machines' ways about on foot as the world stands now (M4-02); the street layer between the key points along
  // them (M3-21).
  world.nav = buildNav(sts, g, world.index, walksOf(world.features));
  world.features.push(...keys.map((k, n) => ({ kind: `key:${k.name}`, x: k.at.x, y: k.at.y, z: k.at.z, group: n })));
  // The beats as walked, off the streets and under the ground (M4-01).
  world.patrols = walkedBeats(world, net.patrols, [tun.at.junction, tun.at.metro]);
  for (const c of world.convoys ?? []) c.spurs = columnSpurs(world, c.pts);
  world.cameras = placeCameras(world).concat(placeSensors(world, gtAt));
  world.links = net.links.concat(joins.flatMap(([i, j]) => { const rt = streetRoute(world.nav!, `link:${keys[i].name}-${keys[j].name}:street`, keys[i].at, keys[j].at); return rt ? [{ from: keys[i].name, to: keys[j].name, layer: 'street' as const, route: rt }] : []; }));
  return world;
}

/** The streets to draw: a walkway's stretches inside a building (a passage through it) left out (U-031). */
function drawnStreets(sts: Street[], plots: Plot[]): { kind: string; w: number; steps: boolean; pts: [number, number][] }[] {
  const cells = new Map<number, Plot[]>(), key = (x: number, z: number) => Math.floor(x / 16) * 65536 + Math.floor(z / 16);
  for (const p of plots) {
    if (p.far) continue;
    const xs = p.corners.map(c => c[0]), zs = p.corners.map(c => c[1]);
    for (let x = Math.min(...xs); x <= Math.max(...xs) + 16; x += 16) for (let z = Math.min(...zs); z <= Math.max(...zs) + 16; z += 16) { const k = key(x, z), a = cells.get(k); if (a) a.push(p); else cells.set(k, [p]); }
  }
  const inside = (x: number, z: number) => (cells.get(key(x, z)) ?? []).some(p => p.corners.every((c, i) => { const d = p.corners[(i + 1) % 4]; return (d[0] - c[0]) * (z - c[1]) - (d[1] - c[1]) * (x - c[0]) >= 0; }) || p.corners.every((c, i) => { const d = p.corners[(i + 1) % 4]; return (d[0] - c[0]) * (z - c[1]) - (d[1] - c[1]) * (x - c[0]) <= 0; }));
  const out: { kind: string; w: number; steps: boolean; pts: [number, number][] }[] = [];
  for (const s of sts) {
    if (MAIN_ROADS.has(s.kind)) { out.push({ kind: s.kind, w: s.w, steps: s.steps, pts: s.pts }); continue; }
    let piece: [number, number][] = [];
    const flush = () => { if (piece.length > 1) out.push({ kind: s.kind, w: s.w, steps: s.steps, pts: piece }); piece = []; };
    // Looked at every metre: inside a building it breaks off (at the last metre out) and starts again at the first
    // metre out; its own corners kept in between.
    let was = true;
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
      let last: [number, number] = [ax, az];
      for (let i = k === 0 ? 0 : 1; i <= n; i++) {
        const p: [number, number] = [ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n], inn = inside(...p);
        if (inn && !was) { piece.push(last); flush(); }
        else if (!inn && (was || i === n)) piece.push(p);
        was = inn; last = p;
      }
    }
    flush();
  }
  return out;
}

/** How far lots keep from the set pieces: past their aprons, which level the ground round them. */
const KEEP = 5;

/** Grow a cell mask by r metres. */
function dilate(g: Heightfield, m: Uint8Array, r: number) {
  const n = Math.ceil(r / g.cell), src = m.slice();
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    if (!src[j * g.w + i]) continue;
    for (let dj = -n; dj <= n; dj++) for (let di = -n; di <= n; di++) {
      const a = i + di, b = j + dj;
      if (a >= 0 && b >= 0 && a < g.w && b < g.h && di * di + dj * dj <= n * n) m[b * g.w + a] = 1;
    }
  }
}

const MAIN_ROADS = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service']);
const hAt = (g: Heightfield, x: number, z: number) => g.y[Math.max(0, Math.min(g.h - 1, Math.round(z / g.cell))) * g.w + Math.max(0, Math.min(g.w - 1, Math.round(x / g.cell)))];

/** 1 where the ground is reachable on foot from Jiefangbei above the water, 2 on the far banks, 0 water. */
function landMask(g: Heightfield): Uint8Array {
  const m = new Uint8Array(g.y.length), dry = (k: number) => g.y[k] > WATER_Y + 0.5;
  const L = GEO.landmarks.jiefangbei, start = Math.round(L.z / g.cell) * g.w + Math.round(L.x / g.cell), q = [start];
  m[start] = 1;
  while (q.length) {
    const k = q.pop()!, i = k % g.w;
    for (const n of [i > 0 ? k - 1 : -1, i < g.w - 1 ? k + 1 : -1, k - g.w, k + g.w]) if (n >= 0 && n < m.length && !m[n] && dry(n)) { m[n] = 1; q.push(n); }
  }
  for (let k = 0; k < m.length; k++) if (!m[k] && dry(k)) m[k] = 2;
  return m;
}

/** Build one lot in its own frame and turn everything it made into place. */
function buildPlan(p: Plan, n: number, out: Fabric, g: Heightfield): Plot {
  const o = p.obb, l: Lot = { id: n, x0: o.cx - o.hw, z0: o.cz - o.hd, x1: o.cx + o.hw, z1: o.cz + o.hd, base: p.base, wall: p.wall, top: p.wall, kind: p.kind, mat: p.mat, street: p.street, across: p.across, noEnter: p.noEnter, edge: p.edge, sky: p.sky, bare: p.bare, pitched: p.pitched, sheer: p.sheer,
    ground: (x, z) => { const c = Math.cos(o.yaw), s = Math.sin(o.yaw); return heightAt(g, o.cx + c * (x - o.cx) - s * (z - o.cz), o.cz + s * (x - o.cx) + c * (z - o.cz)) ?? p.base; } };
  const f = empty(), r = makeRng(hashString(p.seed));
  if (p.far) {
    // The far banks: one painted block each, to see across the river.
    const look = p.kind === 'tower' ? MAT.glass : MAT.facade;
    f.solids.push(solid(l.x0, l.base, l.z0, l.x1, l.wall, l.z1, look));
    f.far.push(solid(l.x0, l.base, l.z0, l.x1, l.wall + PARAPET, l.z1, look));
  } else {
    buildLot(l, r, f);
    signage(l, p, r, f);
  }
  // A foundation down to the lowest ground round it: where a neighbour's lower base dips the ground at a shared
  // wall, or the slope falls away, no gap shows under the walls.
  let low = l.base;
  rasterPoly(corners({ ...o, hw: o.hw + 4.5, hd: o.hd + 4.5 }), 0, 0, g.cell, g.w, g.h, (i0, i1, j) => { for (let k = j * g.w + i0; k <= j * g.w + i1; k++) low = Math.min(low, g.y[k]); });
  // On a slope it stands on a retaining wall of rough stone, stepped at half its height (M3-35, the references).
  const drop = l.base - low;
  f.solids.push(solid(l.x0, low - 1, l.z0, l.x1, l.base, l.z1, drop > 1.5 ? MAT.stone : MAT.concrete));
  if (drop > 3) f.decor.push(solid(l.x0 - 0.3, low + drop / 2 - 0.3, l.z0 - 0.3, l.x1 + 0.3, low + drop / 2, l.z1 + 0.3, MAT.concrete));
  // A basement (M3-73a): the foundation cut away under it, the ground's shell holed over it (2 m past it, all under
  // the building).
  const bs = l.basement;
  if (bs) {
    f.solids.push(...carve([f.solids.pop()!], { x0: bs.x0, y0: low - 2, z0: bs.z0, x1: bs.x1, y1: l.base + 0.01, z1: bs.z1 }));
    const c = Math.cos(o.yaw), s = Math.sin(o.yaw), cx = (bs.x0 + bs.x1) / 2, cz = (bs.z0 + bs.z1) / 2;
    rasterPoly(corners({ cx: o.cx + c * (cx - o.cx) - s * (cz - o.cz), cz: o.cz + s * (cx - o.cx) + c * (cz - o.cz), hw: (bs.x1 - bs.x0) / 2 + 2, hd: (bs.z1 - bs.z0) / 2 + 2, yaw: o.yaw }), 0, 0, g.cell, g.w, g.h,
      (i0, i1, j) => { for (let i = i0; i <= i1; i++) if (i < g.w - 1 && j < g.h - 1) g.hole[j * (g.w - 1) + i] = 1; });
  }
  const s0 = out.solids.length, c0 = out.climbables.length, pt = place(f, o, p.seed, out);
  if (l.route) l.route = l.route.map(q => { const [x, z] = pt(q.x, q.z); return { ...q, x, z }; });
  out.lots.push(l);
  return { corners: corners(o), base: p.base, wall: p.wall, top: l.top, kind: l.kind, row: p.row, found: low - 1, route: l.route, far: p.far, osm: p.osm,
    own: { solids: [s0, out.solids.length], climbables: [c0, out.climbables.length] } };
}

/** Turn everything a lot's fabric made in its own frame (about the rectangle's middle) into place, ids prefixed.
 *  Returns the frame-to-map point transform. */
function place(f: Fabric, o: Obb, prefix: string, out: Fabric): (x: number, z: number) => [number, number] {
  const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
  const pt = (x: number, z: number): [number, number] => [o.cx + c * (x - o.cx) - s * (z - o.cz), o.cz + s * (x - o.cx) + c * (z - o.cz)];
  out.solids.push(...turn(f.solids, o.yaw, o.cx, o.cz));
  out.decor.push(...turn(f.decor, o.yaw, o.cx, o.cz));
  out.far.push(...turn(f.far, o.yaw, o.cx, o.cz));
  // (A door's, window's, grate's or hatch's prop names its interactable, prefixed as the interactables are.)
  out.props.push(...f.props.map((q): Prop => { const [x, z] = pt(q.x, q.z); return { ...q, x, z, yaw: q.yaw - o.yaw, ...(q.kind === 'door' || q.kind === 'pane' || ((q.kind === 'grate' || q.kind === 'hatch') && q.text) ? { text: `${prefix}-${q.text}` } : {}) }; }));
  out.inter.push(...f.inter.map((q): Inter => { const [x, z] = pt(q.x, q.z); return { ...q, id: `${prefix}-${q.id}`, x, z }; }));
  out.climbables.push(...f.climbables.map((q): Climbable => { const [x, z] = pt(q.x, q.z); return { ...q, x, z, nx: c * q.nx - s * q.nz, nz: s * q.nx + c * q.nz }; }));
  // A hiding place keeps its size, moved and turned with the rest (M3-47).
  out.hides.push(...f.hides.map((h, n): HideSpot => {
    const b = h.inner, [x, z] = pt((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2), hw = (b.x1 - b.x0) / 2, hd = (b.z1 - b.z0) / 2;
    return { ...h, id: out.hides.length + n, inner: { ...b, x0: x - hw, z0: z - hd, x1: x + hw, z1: z + hd }, yaw: (h.yaw ?? 0) - o.yaw };
  }));
  out.sites.push(...f.sites.map((q): Site => { const [x, z] = pt(q.x, q.z); return { ...q, id: `${prefix}-${q.id}`, x, z, bed: q.bed && `${prefix}-${q.bed}`, table: q.table && `${prefix}-${q.table}`, containers: q.containers.map(id => `${prefix}-${id}`) }; }));
  out.features.push(...f.features.map(q => { const [x, z] = pt(q.x, q.z); return { ...q, x, z, group: out.features.length + q.group, ...(q.nx !== undefined ? { nx: c * q.nx - s * q.nz!, nz: s * q.nx + c * q.nz! } : {}) }; }));
  return pt;
}

/** The alleys between neighbours in each row of infill (U-005): hide spots, scaffold bars, fences and litter,
 *  laid out in the first one's frame. */
function rowAlleys(plans: Plan[], out: Fabric, g: Heightfield) {
  // Along each row the alleys take turns, the first one first: something to hide in, bars to swing from, a fence
  // to get over, a hide again, a squeeze to crawl (M3-71).
  const turn = new Map<string, number>();
  for (let n = 0; n + 1 < plans.length; n++) {
    const a = plans[n], b = plans[n + 1];
    // Neighbours square to each other (to a few degrees, round a bend): b laid out in a's frame.
    if (!a.row || a.row !== b.row || a.far || Math.abs(Math.sin(a.obb.yaw - b.obb.yaw)) > 0.06) continue;
    const o = a.obb, c = Math.cos(o.yaw), s = Math.sin(o.yaw), dx = b.obb.cx - o.cx, dz = b.obb.cz - o.cz;
    const bx = o.cx + c * dx + s * dz, bz = o.cz - s * dx + c * dz;
    const lot = (cx: number, cz: number, hw: number, hd: number, base: number, wall: number): Lot => ({ id: -1, x0: cx - hw, z0: cz - hd, x1: cx + hw, z1: cz + hd, base, wall, top: wall, kind: 'res', mat: 0, street: [false, true, false, false], across: [0, 0, 0, 0] });
    const f = empty();
    // Its floor: the ground between them (a lane may keep it higher than either, a slope lower).
    const y = heightAt(g, (o.cx + b.obb.cx) / 2, (o.cz + b.obb.cz) / 2) ?? Math.min(a.base, b.base);
    // Seeded by where it is, so what's in it doesn't change when lots elsewhere come or go.
    const k = turn.get(a.row) ?? 0;
    turn.set(a.row, k + 1);
    alleys([lot(o.cx, o.cz, o.hw, o.hd, y, a.wall), lot(bx, bz, b.obb.hw, b.obb.hd, y, b.wall)], makeRng(hashString(`alley${Math.round(o.cx)},${Math.round(o.cz)}`)), f, [0.1, 0.5, 0.9, 0.3, 0.8][k % 5], Math.abs(Math.sin(a.obb.yaw - b.obb.yaw)) < 0.01);
    place(f, o, `${a.seed}a`, out);
  }
}

/** A street's surface over the levelled ground: a thin ramp per segment in asphalt or paving; stair streets
 *  get their steps. */
function surface(s: Street, g: Heightfield, decor: Solid[]) {
  const mat = s.steps || s.kind === 'footway' || s.kind === 'pedestrian' || s.kind === 'path' ? MAT.stone : MAT.asphalt;
  for (let k = 0; k + 1 < s.pts.length; k++) {
    const [ax, az] = s.pts[k], [bx, bz] = s.pts[k + 1], len = Math.hypot(bx - ax, bz - az);
    if (len < 0.5) continue;
    const ya = hAt(g, ax, az), yb = hAt(g, bx, bz), cx = (ax + bx) / 2, cz = (az + bz) / 2, yaw = Math.atan2(bz - az, bx - ax);
    const lo = Math.min(ya, yb), hi = Math.max(ya, yb), x0 = cx - len / 2 - 0.3, x1 = cx + len / 2 + 0.3, z0 = cz - s.w / 2, z1 = cz + s.w / 2;
    const r = hi - lo < 0.05 ? solid(x0, lo - 0.25, z0, x1, lo + 0.04, z1, mat) : rampSolid(x0, lo - 0.25, z0, x1, z1, lo + 0.04, hi + 0.04, ya < yb ? 1 : 2, mat);
    if (s.steps && hi - lo > 0.6) { const steps: Solid[] = []; stepsFor(r, steps, MAT.stone); decor.push(...turn(steps, yaw, cx, cz)); }
    else decor.push(...turn([r], yaw, cx, cz));
  }
}

/** A bridge deck from the ground at its ends, rising to clear what it crosses (5.5 m over the ground once 20 m out
 *  from either end), with railings. */
function bridge(s: Street, g: Heightfield, solids: Solid[]) {
  // Pieces of at most 8 m, so the deck can arch over what it crosses.
  const pts: [number, number][] = [s.pts[0]];
  for (let k = 1; k < s.pts.length; k++) {
    const [ax, az] = s.pts[k - 1], [bx, bz] = s.pts[k], m = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 8));
    for (let i = 1; i <= m; i++) pts.push([ax + ((bx - ax) * i) / m, az + ((bz - az) * i) / m]);
  }
  const along = [0];
  for (let k = 1; k < pts.length; k++) along.push(along[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const total = along[along.length - 1] || 1, n = pts.length - 1;
  const y0 = hAt(g, pts[0][0], pts[0][1]), y1 = hAt(g, pts[n][0], pts[n][1]);
  // Footbridges climb steeply (stairs at their ends); road bridges ramp over 20 m.
  const foot = !MAIN_ROADS.has(s.kind), ramp = foot ? 6 : 20, thick = foot ? 0.6 : 1.5;
  const deckY = pts.map(([x, z], k) => Math.max(y0 + ((y1 - y0) * along[k]) / total, hAt(g, x, z) + 5.2 * Math.min(1, Math.min(along[k], total - along[k]) / ramp)));
  for (let k = 0; k < n; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az);
    if (len < 0.5) continue;
    const ya = deckY[k], yb = deckY[k + 1];
    const cx = (ax + bx) / 2, cz = (az + bz) / 2, yaw = Math.atan2(bz - az, bx - ax), lo = Math.min(ya, yb), hi = Math.max(ya, yb);
    const x0 = cx - len / 2 - 0.2, x1 = cx + len / 2 + 0.2, z0 = cz - s.w / 2, z1 = cz + s.w / 2;
    const deck = hi - lo < 0.05 ? solid(x0, lo - thick, z0, x1, lo, z1, MAT.concrete) : rampSolid(x0, lo - thick, z0, x1, z1, lo, hi, ya < yb ? 1 : 2, MAT.concrete);
    solids.push(...turn([deck, solid(x0, lo, z0 - 0.25, x1, hi + 1.1, z0, MAT.metal), solid(x0, lo, z1, x1, hi + 1.1, z1 + 0.25, MAT.metal)], yaw, cx, cz));
  }
}
