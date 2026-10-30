// M3-57b (U-030, D-020): the factory in Raffles City's podium. Gates onto the roads, each guarded and lit, a
// column marching out of each along the roads away from it; by night the works and their gates glow. Screenshots:
// a gate by night and by day from the road, and the works from over the towers by night.
export default async function ({ open, fail, screenshot }) {
  const page = await open('?scenario=shibati&seed=1', 'factory');
  const r = await page.evaluate(`(() => {
    const w = window.__cq.game.world, f = k => w.features.filter(q => q.kind === k);
    const ROAD = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service']);
    const roads = w.streets.filter(s => ROAD.has(s.kind)), seg = (px, pz, [ax, az], [bx, bz]) => { const l = (bx - ax) ** 2 + (bz - az) ** 2 || 1, t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / l)); return Math.hypot(ax + (bx - ax) * t - px, az + (bz - az) * t - pz); };
    const onRoad = p => roads.some(s => s.pts.some((q, i) => i > 0 && seg(p.x, p.z, s.pts[i - 1], q) < s.w / 2 + 1));
    const gates = f('gate'), paths = (w.convoys || []).map(c => {
      let len = 0; for (let i = 1; i < c.length; i++) len += Math.hypot(c[i].x - c[i - 1].x, c[i].z - c[i - 1].z);
      const out = c.filter((p, i) => i > 12), g = c[0], e = c[c.length - 1];
      return { len, road: out.filter(onRoad).length / out.length, away: Math.hypot(e.x - g.x, e.z - g.z) };
    });
    return { gates: gates.length, posts: f('post').length, paths, props: ['floodlight', 'searchlight', 'jersey', 'beacon'].map(k => w.props.filter(p => p.kind === k).length),
      works: w.solids.filter(s => s.mat === 27).length, tele: w.teleports.filter(t => t.name.startsWith('Factory gate')).length };
  })()`);
  console.log(`  ${r.gates} gates, ${r.posts} posts, ${r.works} works solids, props ${r.props.join('/')}, paths ${r.paths.map(p => `${p.len.toFixed(0)} m ${(p.road * 100).toFixed(0)}% road ${p.away.toFixed(0)} m off`).join(', ')}`);
  if (r.gates < 3 || r.tele !== r.gates) fail('factory', `${r.gates} gates, ${r.tele} gate teleports`);
  if (r.posts < 2 * r.gates) fail('factory', `${r.posts} guard posts for ${r.gates} gates`);
  if (r.props[0] < 2 * r.gates || r.props[1] < r.gates || r.props[2] < 4 * r.gates) fail('factory', `floodlights/searchlights/barriers ${r.props.join('/')}`);
  if (r.works < 100) fail('factory', `only ${r.works} solids of works`);
  if (r.paths.length !== r.gates || r.paths.some(p => p.len < 250 || p.road < 0.85 || p.away < 120)) fail('factory', 'a column does not march out along the roads');

  // A gate from the road outside, by night and by day: the column walking out of the light (and moving).
  const lum = `(() => { const g = window.__cq.game; g.view.render(0, {}); const gl = g.view.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, d = new Uint8Array(160 * 120 * 4); gl.readPixels((w >> 1) - 80, (h >> 1) - 40, 160, 120, gl.RGBA, gl.UNSIGNED_BYTE, d); let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3; })()`;
  const view = (name, hour, t, pitch = 0.12, back = 0) => page.evaluate(`(() => {
    const g = window.__cq.game, q = g.world.teleports.find(t => t.name === ${JSON.stringify(name)});
    g.state.time = ${hour} * 3600; g.state.flags.clear = true; g.state.flags.noclip = true; g.state.flags.god = true;
    const dx = -Math.sin(q.yaw), dz = -Math.cos(q.yaw);
    Object.assign(g.state.player.pos, { x: q.x - dx * ${back}, y: q.y - 1.5 + ${back} * 0.6, z: q.z - dz * ${back} });
    g.input.yaw = q.yaw; g.input.pitch = ${pitch};
    window.__cq.runFrames(8);
    g.view.render(${t}, {});
    const c = g.view.convoys.meshes;
    return { count: c[0].count + c[1].count, first: Array.from(c[0].instanceMatrix.array.slice(12, 15)) };
  })()`);
  const a = await view('Factory gate 1', 22, 0), nightLum = await page.evaluate(lum);
  await screenshot(page, 'factory-gate-night');
  const b = await view('Factory gate 1', 22, 2);
  if (a.count < 100) fail('factory', `only ${a.count} machines marching`);
  if (Math.hypot(a.first[0] - b.first[0], a.first[2] - b.first[2]) < 0.5) fail('factory', 'the column is not moving');
  // The same look at an ordinary street by night, for the glow to stand out against.
  await page.evaluate(`(() => { const g = window.__cq.game, s = g.world.teleports.find(t => t.name === 'jiefangbei'); Object.assign(g.state.player.pos, { x: s.x, y: s.y - 1.5, z: s.z }); g.input.pitch = 0.12; window.__cq.runFrames(8); })()`);
  const streetLum = await page.evaluate(lum);
  console.log(`  gate by night ${nightLum.toFixed(1)}, a street by night ${streetLum.toFixed(1)}; ${a.count} machines`);
  if (!(nightLum > streetLum * 2 + 10)) fail('factory', `the gate is not lit: ${nightLum.toFixed(1)} vs ${streetLum.toFixed(1)}`);
  await view('Factory gate 1', 14, 0);
  await screenshot(page, 'factory-gate-day');
  // The works from high over the towers by night.
  await page.evaluate(`(() => { const g = window.__cq.game; Object.assign(g.state.player.pos, { x: 1880, y: 330, z: 860 }); g.state.time = 22 * 3600; g.input.yaw = 0; g.input.pitch = -0.85; window.__cq.runFrames(8); })()`);
  await screenshot(page, 'factory-works-night');
  await page.close();
}
