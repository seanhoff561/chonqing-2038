// M3-41 (U-017), M3-35: the city at 1:1 beside the real places. Jiefangbei from its pedestrian street, Shibati looking
// down its stair, Jiaochangkou's junction on the ridge, Chaotianmen's point from the river; each shot laid beside its reference photo in docs/reference/places
// (logs/places-<name>.png), the draw-call and triangle budgets holding at each.
import fs from 'node:fs';

/** Stand on a street of a kind near a place, at its end away from the place, looking back along it at eye height. */
const ALONG = (place, kinds, reach) => `(w, hy) => { const t = w.teleports.find(q => q.name === '${place}'); let best = null;
  for (const s of w.streets) { if (!(${kinds})) continue; const near = s.pts.some(([x, z]) => Math.hypot(x - t.x, z - t.z) < 40);
    if (!near) continue; for (const [x, z] of s.pts) { const d = Math.hypot(x - t.x, z - t.z); if (d < ${reach} && (!best || d > best.d)) best = { x, z, d }; } }
  if (!best) return null;
  const dx = (t.x - best.x) / best.d, dz = (t.z - best.z) / best.d;
  return { x: best.x, y: hy(best.x, best.z) + 0.2, z: best.z, yaw: Math.atan2(-dx, -dz), pitch: 0.12 }; }`;

const PLACES = [
  // (Jiefangbei: down a pedestrian street to the monument's plaza, the towers either side.)
  ['jiefangbei', 'jiefangbei-2.jpg', ALONG('jiefangbei', "s.kind === 'pedestrian' || s.kind === 'footway'", 160)],
  // (Shibati: from the head of the stepped street nearest it, looking down it to its foot.)
  ['shibati', 'shibati-1.jpg', `(w, hy) => { const t = w.teleports.find(q => q.name === 'shibati'); let st = null, sd = Infinity;
    for (const s of w.streets) if (s.steps) for (const [x, z] of s.pts) { const d = Math.hypot(x - t.x, z - t.z); if (d < sd) { sd = d; st = s; } }
    if (!st) return null;
    const hs = st.pts.map(([x, z]) => hy(x, z)), top = st.pts[hs.indexOf(Math.max(...hs))], foot = st.pts[hs.indexOf(Math.min(...hs))], l = Math.hypot(foot[0] - top[0], foot[1] - top[1]) || 1;
    const dx = (foot[0] - top[0]) / l, dz = (foot[1] - top[1]) / l;
    return { x: top[0] - dx * 2, y: hy(top[0], top[1]) + 0.2, z: top[1] - dz * 2, yaw: Math.atan2(-dx, -dz), pitch: -0.2 }; }`],
  // (Jiaochangkou: on the ridge's junction, looking down the road to Shibati, M3-35.)
  ['jiaochangkou', 'jiaochangkou-1.jpg', ALONG('jiaochangkou', "s.kind === 'primary' || s.kind === 'secondary' || s.kind === 'tertiary'", 90)],
  // (Chaotianmen: out over the river off the point, looking back at it.)
  ['chaotianmen', 'chaotianmen-2.jpg', `(w, hy) => { const t = w.teleports.find(q => q.name === 'chaotianmen'), wy = w.water[0].y1;
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, dx = Math.cos(a), dz = Math.sin(a);
      if ([180, 240, 300].every(d => hy(t.x + dx * d, t.z + dz * d) < wy - 1)) return { x: t.x + dx * 260, y: wy + 6, z: t.z + dz * 260, yaw: Math.atan2(dx, dz), pitch: 0.14 }; }
    return null; }`],
];

export default async function ({ open, fail }) {
  const page = await open('?scenario=yuzhong&seed=1', 'places');
  for (const [name, photo, view] of PLACES) {
    const r = await page.evaluate(`(() => {
      const g = window.__cq.game, w = g.world, hf = w.ground, hy = (x, z) => hf.y[Math.max(0, Math.min(hf.h - 1, Math.round(z / hf.cell))) * hf.w + Math.max(0, Math.min(hf.w - 1, Math.round(x / hf.cell)))];
      const v = (${view})(w, hy);
      if (!v) return null;
      g.state.time = 13 * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
      Object.assign(g.state.player.pos, { x: v.x, y: v.y, z: v.z }); g.input.yaw = v.yaw; g.input.pitch = v.pitch;
      window.__cq.runFrames(30);
      const info = g.view.renderer.info.render;
      return { calls: info.calls, tris: info.triangles };
    })()`);
    if (!r) { fail('places', `no view of ${name}`); continue; }
    if (r.calls > 300 || r.tris > 1.5e6) fail('places', `${name}: ${r.calls} calls, ${r.tris} triangles`);
    const shot = (await page.screenshot({ type: 'png' })).toString('base64'), ref = fs.readFileSync(`docs/reference/places/${photo}`).toString('base64');
    // Side by side: the reference photo, then the game.
    const c = await page.browser().newPage();
    await c.setViewport({ width: 1280, height: 360 });
    await c.setContent(`<body style="margin:0;display:flex;background:#000"><img style="width:640px;height:360px;object-fit:cover" src="data:image/jpeg;base64,${ref}"><img style="width:640px;height:360px" src="data:image/png;base64,${shot}"></body>`, { waitUntil: 'load' });
    await c.screenshot({ path: `logs/places-${name}.png` });
    await c.close();
    console.log(`  places ${name}: ${r.calls} calls, ${(r.tris / 1e6).toFixed(2)} M triangles`);
  }
}
